// controllers/mlPipelineController.js

const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { exec } = require('child_process');
const { SPARK_MASTER } = require('../config');
const MLModel = require('../models/MLModel');
const PipelineDefinition = require('../models/PipelineDefinition');
const { getKafkaProducer } = require('../utils/kafka');


// Dummy NiFi utility functions (simulate NiFi flow creation/clone)
const {
  createMinimalKafkaNiFiTemplate,
  cloneNifiTemplate
} = require('../utils/nifi');

/**
 * runCommand
 * Utility to run a spark-submit command (or other shell commands).
 */
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

// In-memory pipeline run state (optional, not required if everything is in MongoDB)
const pipelineRuns = {};

/**
 * analyzeOpenRan5G
 *
 * This function reads a CSV file that has at least two columns:
 *  - timestamp (string)
 *  - tbs_sum (number)
 *
 * 1) Sorts rows by ascending timestamp.
 * 2) For each consecutive pair of rows, computes an approximate throughput (Mbps).
 * 3) Calculates total load (sum of tbs_sum), average throughput, min/max throughput, 
 *    approximate latency, and bottleneck counts (if throughput > 100 Mbps).
 *
 * You can refine logic (e.g., if tbs_sum is in bytes, multiply by 8 for bits, etc.)
 */

async function analyzeOpenRan5G(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      // Use default comma delimiter (no custom separator)
      .pipe(csv())
      .on('data', (row) => {
        // Expect keys: row.timestamp and row.tbs_sum
        const rawTs = (row.timestamp || "").trim();
        let tsInt = parseInt(rawTs, 10);
        if (!isNaN(tsInt)) {
          // If the timestamp is exactly 10 digits, assume seconds and convert to ms.
          if (rawTs.length === 10) {
            tsInt *= 1000;
          }
          const tbsSum = parseFloat(row.tbs_sum) || 0;
          rows.push({ ts: tsInt, tbsSum });
        }
      })
      .on('end', () => {
        // Sort the rows in ascending order of timestamp.
        rows.sort((a, b) => a.ts - b.ts);

        if (rows.length < 2) {
          return resolve({
            totalRecords: rows.length,
            message: 'Not enough data points to compute throughput.'
          });
        }

        const totalRecords = rows.length;
        const totalLoad = rows.reduce((acc, r) => acc + r.tbsSum, 0);

        const intervals = [];
        let sumThroughput = 0;
        let throughputCount = 0;
        let minThroughput = Infinity;
        let maxThroughput = -Infinity;
        let bottleneckCount = 0;

        // Compute throughput for each consecutive pair of rows.
        for (let i = 0; i < rows.length - 1; i++) {
          const start = rows[i];
          const end = rows[i + 1];
          const deltaT = (end.ts - start.ts) / 1000; // seconds
          if (deltaT <= 0) continue;

          // Calculate the change in tbs_sum (in bits)
          let deltaTbs = end.tbsSum - start.tbsSum;
          if (deltaTbs < 0) deltaTbs = 0; // if negative (e.g., reset), set to 0

          // Throughput in bits per second.
          const throughputBps = deltaTbs / deltaT;
          // Convert to Megabits per second.
          const throughputMbps = throughputBps / 1e6;

          // Update min/max statistics.
          if (throughputMbps < minThroughput) minThroughput = throughputMbps;
          if (throughputMbps > maxThroughput) maxThroughput = throughputMbps;
          sumThroughput += throughputMbps;
          throughputCount++;

          // Identify bottleneck if throughput > 100 Mbps.
          const isBottleneck = (throughputMbps > 100);
          if (isBottleneck) bottleneckCount++;

          // Dummy latency calculation (inverse relation).
          const latency = 1 / (throughputMbps + 1);

          intervals.push({
            timestampStart: new Date(start.ts).toISOString(),
            timestampEnd: new Date(end.ts).toISOString(),
            deltaT,
            throughput: throughputMbps,
            latency,
            bottleneck: isBottleneck
          });
        }

        const avgThroughput = throughputCount > 0 ? sumThroughput / throughputCount : 0;
        if (minThroughput === Infinity) minThroughput = 0;
        if (maxThroughput === -Infinity) maxThroughput = 0;
        const approxLatency = 1 / (avgThroughput + 1);

        resolve({
          totalRecords,
          totalLoad,
          avgThroughput,
          minThroughput,
          maxThroughput,
          approxLatency,
          bottleneckCount,
          intervals
        });
      })
      .on('error', (err) => reject(err));
  });
}


/**
 * createPipelineDefinition
 * Expects:
 *  - pipeline name in req.body.name
 *  - a dataset CSV (with columns timestamp, tbs_sum) in req.file
 * 
 * Uses dummy NiFi logic to create a NiFi flow ID, then saves a pipeline doc.
 */
exports.createPipelineDefinition = async (req, res) => {
  try {
    console.log('[createPipelineDefinition] req.body:', req.body);
    
    const { name } = req.body;
    const datasetFile = req.file; // from multer

    if (!name || !datasetFile) {
      return res.status(400).json({ error: 'Pipeline name and dataset file are required.' });
    }
    
    const datasetPath = datasetFile.path || datasetFile.filename;
    console.log(`Creating pipeline "${name}" with dataset "${datasetPath}"`);

    // Dummy NiFi creation
    const dummyTemplateId = await createMinimalKafkaNiFiTemplate('dummy');
    console.log(`Created dummy NiFi template: ${dummyTemplateId}`);

    const dummyNifiFlow = await cloneNifiTemplate(dummyTemplateId);
    console.log(`[MLPipeline] Dummy NiFi flow ID obtained: ${dummyNifiFlow}`);
    const pipelineData = {
      name,
      dataset: datasetPath,
      nifiFlow: dummyNifiFlow,
      kafkaTopic: `dummy-topic-${Date.now()}`,
      sparkJob: 'dummy-spark-job',
      status: 'inactive',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastRun: null
    };

    const newPipeline = new PipelineDefinition(pipelineData);
    const savedPipeline = await newPipeline.save();
    
    console.log('[createPipelineDefinition] Pipeline created:', savedPipeline);
    res.status(201).json(savedPipeline);
  } catch (error) {
    console.error('Error creating pipeline definition:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * processDataset
 * Simulate NiFi ingestion & analyze the TBS dataset (timestamp, tbs_sum).
 * POST /api/pipelines/:pipelineId/process
 */

exports.processDataset = async (req, res) => {
  const { pipelineId } = req.params;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required.' });
  }

  try {
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found.' });
    }

    console.log(`[processDataset] TBS dataset for pipeline ${pipelineId}`);
    // Build an absolute path to the dataset file.
    const datasetFilePath = path.join(__dirname, '..', pipeline.dataset);
    console.log('[processDataset] Using dataset file at:', datasetFilePath);

    // Analyze the dataset using the absolute path
    const openRanAnalysis = await analyzeOpenRan5G(datasetFilePath);
    console.log('[processDataset] openRanAnalysis:', openRanAnalysis);

    // Separate intervals from the summary
    const { intervals = [], ...analysisSummary } = openRanAnalysis;

    // Generate CSV content from intervals
    let csvContent = 'timestampStart,timestampEnd,deltaT,throughput,latency,bottleneck\n';
    intervals.forEach(interval => {
      csvContent += [
        interval.timestampStart,
        interval.timestampEnd,
        interval.deltaT,
        interval.throughput,
        interval.latency,
        interval.bottleneck
      ].join(',') + '\n';
    });

    // Write the CSV file to disk (e.g., in the "uploads" folder)
    const csvFileName = `analysis_${pipelineId}.csv`;
    const csvFilePath = path.join(__dirname, '..', 'uploads', csvFileName);
    fs.writeFileSync(csvFilePath, csvContent);

    // Store the summary (without huge intervals) and the CSV path in the pipeline doc
    pipeline.openRanAnalysis = analysisSummary;  // summary only, not the full intervals array
    pipeline.analysisCsvPath = csvFileName;        // store the CSV filename or relative path
    pipeline.status = 'processing';
    pipeline.updatedAt = new Date();
    await pipeline.save();

    // (Optional) Send a Kafka message (if enabled)
    const producer = await getKafkaProducer();
    await producer.send({
      topic: pipeline.kafkaTopic,
      messages: [{
        value: `OpenRAN TBS analysis done: ${JSON.stringify(openRanAnalysis)}`
      }]
    });
    console.log( `[Kafka] Message produced to topic ${pipeline.kafkaTopic}`);
     // Optionally, update in-memory run state
     pipelineRuns[pipelineId] = {
      dataset: pipeline.dataset,
      openRanAnalysis,
      status: 'Dataset processing complete'
    };

    // Return the summary along with a download path for the full CSV
    res.json({
      success: true,
      message: 'OpenRAN TBS dataset processed.',
      pipelineId,
      openRanAnalysis: analysisSummary, // summary metrics only
      csvDownloadPath: `/api/pipelines/${pipelineId}/analysis.csv`
    });
  } catch (error) {
    console.error('[processDataset] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};


/**
 * Serving the new downloaded Csv file 
 * 
 */

exports.downloadAnalysisCsv = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline || !pipeline.analysisCsvPath) {
      return res.status(404).json({ error: 'No CSV analysis found for this pipeline.' });
    }

    const csvFilePath = path.join(__dirname, '..', 'uploads', pipeline.analysisCsvPath);
    res.download(csvFilePath, (err) => {
      if (err) {
        console.error('[downloadAnalysisCsv] Error sending file:', err);
        return res.status(500).json({ error: 'Error downloading CSV file' });
      }
    });
  } catch (error) {
    console.error('[downloadAnalysisCsv] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};


/**
 * nifiCallback
 * POST /api/pipelines/nifi-callback
 * => Trigger Spark job to train a model & store training metrics
 */
exports.nifiCallback = async (req, res) => {
  const { pipelineId } = req.body;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required in callback.' });
  }

  const run = pipelineRuns[pipelineId];
  if (!run) {
    return res.status(404).json({ error: 'No pipeline run found for that pipelineId.' });
  }

  try {
    run.status = 'Dataset processing complete';
    console.log(`[nifiCallback] Pipeline ${pipelineId} => ready for Spark training.`);

    // 1) Trigger Spark job, pass the dataset path
    const sparkCmd = `spark-submit --master ${SPARK_MASTER} /usr/src/app/jobs/train_model.py --dataset ${run.dataset}`;
    const sparkResult = await runCommand(sparkCmd);
    console.log('[Spark] Training logs:', sparkResult.stdout);

    // 2) Simulate storing trained model info
    const accuracy = 0.95;
    const artifactPath = `/usr/src/app/models/model_${pipelineId}`;
    const newModel = await MLModel.create({
      name: `model_${pipelineId}`,
      version: '1.0',
      accuracy,
      artifactPath
    });
    run.status = 'Spark training complete';
    run.modelId = newModel._id;
    console.log('[nifiCallback] Model stored =>', newModel._id);

    // 3) Also persist training metrics in the pipeline doc
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (pipeline) {
      pipeline.status = 'trained';
      pipeline.lastRun = new Date();
      pipeline.trainingMetrics = {
        accuracy,
        artifactPath,
        updatedAt: new Date()
      };
      await pipeline.save();
    }

    res.json({
      success: true,
      pipelineId,
      sparkLogs: sparkResult.stdout,
      modelId: newModel._id
    });
  } catch (error) {
    console.error('[nifiCallback] Spark training error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * getPipelineStatus
 * GET /api/pipelines/:pipelineId/status
 * => Returns the pipeline doc, including openRanAnalysis & trainingMetrics
 */
exports.getPipelineStatus = async (req, res) => {
  const { pipelineId } = req.params;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required.' });
  }

  try {
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'No pipeline found for that ID.' });
    }

    res.json({
      pipelineId,
      status: pipeline.status,
      openRanAnalysis: pipeline.openRanAnalysis || null,
      trainingMetrics: pipeline.trainingMetrics || null,
      csvDownloadPath: pipeline.analysisCsvPath ? `/api/pipelines/${pipelineId}/analysis.csv`: null
    });
  } catch (error) {
    console.error('[getPipelineStatus] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
