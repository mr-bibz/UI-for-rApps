// controllers/mlPipelineController.js

const fs = require('fs');
const csv = require('csv-parser');
const { exec } = require('child_process');
const { SPARK_MASTER } = require('../config');
const MLModel = require('../models/MLModel');
const PipelineDefinition = require('../models/PipelineDefinition');
const { getKafkaProducer } = require('../utils/kafka');

// Dummy NiFi utility functions (they simulate NiFi behavior)
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

// (Optional) In-memory pipeline run state (not essential if we store everything in MongoDB)
const pipelineRuns = {};

/**
 * analyzeDataset
 *
 * Reads the CSV file at filePath and computes simple metrics.
 * Assumes CSV columns: "throughput" and "latency".
 * Adjust as needed for your RAN telemetry data.
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
          maxLatency: isFinite(maxLatency) ? maxLatency : 0
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}


/**
 * Create a new pipeline definition.
 * Expects:
 *  - Pipeline name in req.body.name
 *  - An imported dataset file via req.file
 * Uses dummy NiFi logic to generate a NiFi flow ID.
 */
exports.createPipelineDefinition = async (req, res) => {
  try {
    console.log('[createPipelineDefinition] req.body:', req.body);
    
    const { name } = req.body;
    const datasetFile = req.file; // populated by multer in routes
    if (!name || !datasetFile) {
      return res.status(400).json({ error: 'Pipeline name and dataset file are required.' });
    }
    
    const datasetPath = datasetFile.path || datasetFile.filename;
    console.log(`Creating pipeline "${name}" with dataset "${datasetPath}"`);

    // Dummy NiFi logic: create a minimal template, clone it => dummy NiFi flow ID
    const dummyTemplateId = await createMinimalKafkaNiFiTemplate('dummy');
    console.log(`Created dummy NiFi template: ${dummyTemplateId}`);

    const dummyNifiFlow = await cloneNifiTemplate(dummyTemplateId);
    console.log(`[MLPipeline] Dummy NiFi flow ID obtained: ${dummyNifiFlow}`);

     // Build pipeline doc with dataset reference & dummy NiFi flow
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
 * Process Dataset: simulate NiFi ingestion + dataset analysis.
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
    
    console.log(`[processDataset] Processing dataset for pipeline ${pipelineId}, NiFi flow: ${pipeline.nifiFlow}`);

    // Analyze the dataset => compute throughput/latency metrics
    const analysisMetrics = await analyzeDataset(pipeline.dataset);
    console.log('[processDataset] Dataset analysis results:', analysisMetrics);

    // Simulate NiFi ingestion via Kafka
    const producer = await getKafkaProducer();
    await producer.send({
      topic: pipeline.kafkaTopic,
      messages: [{ value: `Processing dataset ${pipeline.dataset}: ${JSON.stringify(analysisMetrics)}` }]
    });
    console.log(`[Kafka] Message produced to topic ${pipeline.kafkaTopic}`);
    
     // Persist analysis in the pipeline doc
     pipeline.analysis = analysisMetrics; 
     pipeline.status = 'processing';
     pipeline.updatedAt = new Date();
     await pipeline.save();
 
     // (Optional) Also update in-memory run state
     pipelineRuns[pipelineId] = {
       nifiFlow: pipeline.nifiFlow,
       kafkaTopic: pipeline.kafkaTopic,
       dataset: pipeline.dataset,
       analysis: analysisMetrics,
       status: 'Dataset processing complete'
     };
     
     res.json({
       success: true,
       message: 'Dataset processing initiated (dummy NiFi).',
       pipelineId,
       analysis: analysisMetrics
     });
   } catch (error) {
     console.error('[processDataset] error:', error.message);
     res.status(500).json({ error: error.message });
   }
 };

 /**
 * NiFi Callback: triggered when dataset processing is complete (dummy).
 * POST /api/pipelines/nifi-callback
 * => Runs a Spark job for training, stores training metrics in the pipeline doc.
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

    // Trigger Spark training job
    const sparkCmd = `spark-submit --master ${SPARK_MASTER} /usr/src/app/jobs/train_model.py --dataset ${run.dataset}`;
    const sparkResult = await runCommand(sparkCmd);
    console.log('[Spark] Training logs:', sparkResult.stdout);
    
    // Simulate storing the trained ML model
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

    // ALSO store training metrics in the pipeline doc
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
 * Retrieve the status of a pipeline from MongoDB (not just in-memory).
 * GET /api/pipelines/:pipelineId/status
 */
exports.getPipelineStatus = async (req, res) => {
  const { pipelineId } = req.params;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required.' });
  }
  
  try {
    // Find pipeline doc in MongoDB
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'No pipeline found for that ID.' });
    }

    // Return relevant fields, including analysis and trainingMetrics
    res.json({
      pipelineId,
      status: pipeline.status,
      analysis: pipeline.analysis || null,
      trainingMetrics: pipeline.trainingMetrics || null
    });
  } catch (error) {
    console.error('[getPipelineStatus] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};