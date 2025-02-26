// controllers/mlPipelineController.js

const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { exec } = require('child_process');
const { SPARK_MASTER } = require('../config');

// Models
const MLModel = require('../models/MLModel');
const PipelineDefinition = require('../models/PipelineDefinition');

// Kafka utility
const { getKafkaProducer } = require('../utils/kafka');

// Dummy NiFi utility functions
const {
  createMinimalKafkaNiFiTemplate,
  cloneNifiTemplate
} = require('../utils/nifi');

/**
 * runCommand
 * Utility to run a spark-submit or other shell commands.
 */
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

// Optional in-memory pipeline run state
const pipelineRuns = {};

/**
 * createPipelineDefinition
 * Expects a pipeline name (req.body.name) and a CSV file (req.file).
 * Uses dummy NiFi creation, saves pipeline doc in MongoDB.
 */
exports.createPipelineDefinition = async (req, res) => {
  try {
    const { name } = req.body;
    const datasetFile = req.file; // from multer

    if (!name || !datasetFile) {
      return res.status(400).json({ error: 'Pipeline name and dataset file are required.' });
    }

    const datasetPath = datasetFile.path;
    console.log(`[createPipelineDefinition] Creating pipeline "${name}" with dataset "${datasetPath}"`);

     // 1) Dummy NiFi creation
     const dummyTemplateId = await createMinimalKafkaNiFiTemplate('dummy');
     console.log(`[NiFi] Created dummy NiFi template: ${dummyTemplateId}`);

     const dummyNifiFlow = await cloneNifiTemplate(dummyTemplateId);
     console.log(`[NiFi] Dummy NiFi flow ID obtained: ${dummyNifiFlow}`);

     // 2) Prepare pipeline doc
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

    // 3) Save pipeline
    const newPipeline = new PipelineDefinition(pipelineData);
    const savedPipeline = await newPipeline.save();

    console.log('[createPipelineDefinition] Pipeline created:', savedPipeline);
    res.status(201).json(savedPipeline);
  } catch (error) {
    console.error('[createPipelineDefinition] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * processDataset
 * Reads the pipeline's CSV file, logs each row as "Parsed row: {...}",
 * computes throughput analysis, logs "Analysis Result: {...}",
 * and saves the analysis in the pipeline doc. Also sends a Kafka message.
 */
exports.processDataset = async (req, res) => {
  const { pipelineId } = req.params;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required.' });
  }

  try {
    // 1) Fetch pipeline
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found.' });
    }

    console.log(`[processDataset] TBS dataset for pipeline ${pipelineId}`);
    const datasetFilePath = path.join(__dirname, '..', pipeline.dataset);
    console.log('[processDataset] Using dataset file at:', datasetFilePath);

    // 2) Parse the CSV and compute analysis
    const openRanAnalysis = await new Promise((resolve, reject) => {
      const rows = [];

      fs.createReadStream(datasetFilePath)
        .pipe(csv()) // default comma delimiter
        .on('data', (row) => {
          // Log each parsed row exactly like your local script
          // console.log('Parsed row:', row);

          const rawTs = (row.timestamp || "").trim();
          let tsInt = parseInt(rawTs, 10);

          // If exactly 10 digits, treat as seconds -> convert to ms
          if (!isNaN(tsInt)) {
            if (rawTs.length === 10) {
              tsInt *= 1000;
            }
            const tbsSum = parseFloat(row.tbs_sum) || 0;
            rows.push({ ts: tsInt, tbsSum });
          }
        })
        .on('end', () => {
          rows.sort((a, b) => a.ts - b.ts);

          if (rows.length < 2) {
            const result = {
              totalRecords: rows.length,
              message: 'Not enough data points to compute throughput.'
            };
            console.log('Analysis Result:', result);
            return resolve(result);
          }

          const totalRecords = rows.length;
          const totalLoad = rows.reduce((acc, r) => acc + r.tbsSum, 0);

          let sumThroughput = 0;
          let throughputCount = 0;
          let minThroughput = Infinity;
          let maxThroughput = -Infinity;
          let bottleneckCount = 0;

          for (let i = 0; i < rows.length - 1; i++) {
            const start = rows[i];
            const end = rows[i + 1];
            const deltaT = (end.ts - start.ts) / 1000; // seconds
            if (deltaT <= 0) continue;

            let deltaTbs = end.tbsSum - start.tbsSum;
            if (deltaTbs < 0) deltaTbs = 0;

            const throughputBps = deltaTbs / deltaT;
            const throughputMbps = throughputBps / 1e6;

            if (throughputMbps < minThroughput) minThroughput = throughputMbps;
            if (throughputMbps > maxThroughput) maxThroughput = throughputMbps;
            sumThroughput += throughputMbps;
            throughputCount++;

            if (throughputMbps > 100) {
              bottleneckCount++;
            }
          }

          const avgThroughput = throughputCount > 0 ? sumThroughput / throughputCount : 0;
          if (minThroughput === Infinity) minThroughput = 0;
          if (maxThroughput === -Infinity) maxThroughput = 0;
          const approxLatency = 1 / (avgThroughput + 1);

          const finalAnalysis = {
            totalRecords,
            totalLoad,
            avgThroughput,
            minThroughput,
            maxThroughput,
            approxLatency,
            bottleneckCount
          };

          // Log the final analysis result
          console.log('Analysis Result:', finalAnalysis);
          resolve(finalAnalysis);
        })
        .on('error', (err) => reject(err));
    });

    // 3) Save the analysis to the pipeline doc
    pipeline.openRanAnalysis = openRanAnalysis;
    pipeline.status = 'processing';
    pipeline.updatedAt = new Date();
    await pipeline.save();

    // 4) (Optional) Send a Kafka message
    const producer = await getKafkaProducer();
    await producer.send({
      topic: pipeline.kafkaTopic,
      messages: [{ value: `OpenRAN TBS analysis done for pipeline ${pipelineId}` }]
    });
    console.log(`[Kafka] Message produced to topic ${pipeline.kafkaTopic}`);

    // 5) Respond with the analysis
    res.json({
      success: true,
      message: 'OpenRAN TBS dataset processed. Check container logs for row-by-row details!',
      pipelineId,
      openRanAnalysis
    });
  } catch (error) {
    console.error('[processDataset] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * nifiCallback
 * Simulates a Spark training job, triggered after NiFi finishes ingestion.
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

    // 1) Trigger Spark job
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
 * Returns pipeline doc, including openRanAnalysis
 */
exports.getPipelineStatus = async (req, res) => {
  const { pipelineId } = req.params;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required.' });
  }

  pipelineId = pipelineId.trim();

  try {
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'No pipeline found for that ID.' });
    }

    res.json({
      pipelineId,
      status: pipeline.status,
      openRanAnalysis: pipeline.openRanAnalysis || null,
      trainingMetrics: pipeline.trainingMetrics || null
    });
  } catch (error) {
    console.error('[getPipelineStatus] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

