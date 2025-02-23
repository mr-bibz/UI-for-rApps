// controllers/mlPipelineController.js

const fs = require('fs');
const csv = require('csv-parser');
const { exec } = require('child_process');
const { SPARK_MASTER } = require('../config');
const MLModel = require('../models/MLModel');
const PipelineDefinition = require('../models/PipelineDefinition');
const { getKafkaProducer } = require('../utils/kafka');

// Import dummy NiFi utility functions (they simulate NiFi behavior)
const {
  createMinimalKafkaNiFiTemplate,
  cloneNifiTemplate
} = require('../utils/nifi');

// Utility to run spark-submit commands (or docker exec commands)
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

// In-memory pipeline run state for tracking ongoing runs
const pipelineRuns = {};

/**
 * analyzeDataset
 *
 * Reads the CSV file located at filePath and computes simple metrics.
 * Assumes the CSV contains columns "throughput" and "latency".
 * Adjust the column names and calculations as needed for your RAN telemetry data.
 */
function analyzeDataset(filePath) {
  return new Promise((resolve, reject) => {
    let count = 0;
    let totalThroughput = 0;
    let totalLatency = 0;
    let minThroughput = Infinity;
    let maxThroughput = -Infinity;
    let minLatency = Infinity;
    let maxLatency = -Infinity;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        count++;
        const throughput = parseFloat(row.throughput) || 0;
        const latency = parseFloat(row.latency) || 0;
        totalThroughput += throughput;
        totalLatency += latency;
        if (throughput < minThroughput) minThroughput = throughput;
        if (throughput > maxThroughput) maxThroughput = throughput;
        if (latency < minLatency) minLatency = latency;
        if (latency > maxLatency) maxLatency = latency;
      })
      .on('end', () => {
        const averageThroughput = count > 0 ? totalThroughput / count : 0;
        const averageLatency = count > 0 ? totalLatency / count : 0;
        resolve({
          count,
          averageThroughput,
          averageLatency,
          minThroughput: isFinite(minThroughput) ? minThroughput : 0,
          maxThroughput: isFinite(maxThroughput) ? maxThroughput : 0,
          minLatency: isFinite(minLatency) ? minLatency : 0,
          maxLatency: isFinite(maxLatency) ? maxLatency : 0,
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

/**
 * Create a new pipeline definition.
 *
 * Expects:
 *   - Pipeline name in req.body.name
 *   - An imported dataset file via req.file (populated by middleware such as multer)
 *
 * Uses dummy NiFi functions to simulate creating a NiFi flow.
 */
exports.createPipelineDefinition = async (req, res) => {
  try {
    console.log('[createPipelineDefinition] req.body:', req.body);
    
    const { name } = req.body;
    const datasetFile = req.file; // File upload middleware must populate req.file
    if (!name || !datasetFile) {
      return res.status(400).json({ error: 'Pipeline name and dataset file are required.' });
    }
    
    // Use the file's path (or filename) as the dataset reference
    const datasetPath = datasetFile.path || datasetFile.filename;
    console.log(`Creating pipeline "${name}" with dataset "${datasetPath}"`);

    // Dummy NiFi logic: create a dummy template and clone it to get a dummy NiFi flow ID.
    const dummyTemplateId = await createMinimalKafkaNiFiTemplate('dummy');
    console.log(`Created dummy NiFi template: ${dummyTemplateId}`);

    const dummyNifiFlow = await cloneNifiTemplate(dummyTemplateId);
    console.log(`[MLPipeline] Dummy NiFi flow ID obtained: ${dummyNifiFlow}`);

    // Build the pipeline document with the dummy NiFi flow and dataset reference.
    const pipelineData = {
      name,
      dataset: datasetPath,
      nifiFlow: dummyNifiFlow,
      kafkaTopic: `dummy-topic-${Date.now()}`,
      sparkJob: `dummy-spark-job`,
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
 * Process Dataset (simulate NiFi ingestion and perform dataset analysis)
 *
 * URL: POST /api/pipelines/:pipelineId/process
 *
 * This endpoint:
 *   - Retrieves the pipeline definition,
 *   - Reads and analyzes the imported dataset,
 *   - Sends a Kafka message to simulate data ingestion,
 *   - Updates the pipeline status with analysis results.
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
    
    console.log(`[processDataset] Processing dataset for pipeline ${pipelineId} using dummy NiFi flow ${pipeline.nifiFlow}.`);

    // Analyze the dataset file to extract metrics
    const analysisMetrics = await analyzeDataset(pipeline.dataset);
    console.log('[processDataset] Dataset analysis results:', analysisMetrics);
    
    // Simulate processing by sending a Kafka message that includes some analysis info.
    const producer = await getKafkaProducer();
    await producer.send({
      topic: pipeline.kafkaTopic,
      messages: [{
        value: `Processing dataset ${pipeline.dataset}: ${JSON.stringify(analysisMetrics)}`
      }]
    });
    console.log(`[Kafka] Message produced to topic ${pipeline.kafkaTopic}`);

    // Update pipeline status to indicate processing has started.
    pipeline.status = 'processing';
    pipeline.updatedAt = new Date();
    await pipeline.save();
    
    // Update in-memory run state with analysis details.
    pipelineRuns[pipelineId] = {
      nifiFlow: pipeline.nifiFlow,
      kafkaTopic: pipeline.kafkaTopic,
      dataset: pipeline.dataset,
      analysis: analysisMetrics,
      status: 'Dataset processing complete'
    };
    
    res.json({
      success: true,
      message: 'Dataset processing initiated using dummy NiFi logic.',
      pipelineId,
      analysis: analysisMetrics
    });
  } catch (error) {
    console.error('[processDataset] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * NiFi Callback: Called when dummy dataset processing is complete.
 * Triggers a Spark training job on the processed dataset.
 *
 * URL: POST /api/pipelines/nifi-callback
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
    console.log(`[nifiCallback] Pipeline ${pipelineId} dummy processing complete.`);

     // Trigger Spark training job.
    // You can pass the dataset location and/or analysis metrics as needed.
    const sparkCmd = `spark-submit --master ${SPARK_MASTER} /usr/src/app/jobs/train_model.py --dataset ${run.dataset}`;
    const sparkResult = await runCommand(sparkCmd);
    console.log('[Spark] Training logs:', sparkResult.stdout);
    
    // Simulate storing the trained ML model in MongoDB.
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
    console.log('[nifiCallback] Model stored with id:', newModel._id);
    
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
 * Retrieve the status of a pipeline run.
 *
 * URL: GET /api/pipelines/:pipelineId/status
 */
exports.getPipelineStatus = async (req, res) => {
  const { pipelineId } = req.params;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required.' });
  }
  
  const run = pipelineRuns[pipelineId];
  if (!run) {
    return res.status(404).json({ error: 'No pipeline run found for that ID.' });
  }
  
  res.json({
    pipelineId,
    status: run.status,
    analysis: run.analysis || null,
    modelId: run.modelId || null
  });
};


