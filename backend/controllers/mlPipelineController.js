const path = require('path');
const fs = require('fs');
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

// Import the OpenRAN analysis utility function
const analyzeOpenRan5G = require('../utils/analyzeOpenRan5G');

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

    // 4) IMMEDIATELY call the analysis to ensure logs appear in the container
    //    Just re-use the same logic as processDataset, but we don't need to mock the entire request/response.
    console.log(`[createPipelineDefinition] Immediately analyzing dataset for pipeline ${savedPipeline._id}...`);

    const analysisResult = await analyzeOpenRan5G(datasetPath);
    console.log('[createPipelineDefinition] Immediate Analysis Result:', analysisResult);

    // 5) Store the analysis in the pipeline doc
    savedPipeline.openRanAnalysis = analysisResult;
    savedPipeline.status = 'processing';
    savedPipeline.updatedAt = new Date();
    await savedPipeline.save();

    console.log('[createPipelineDefinition] Analysis saved to pipeline:', savedPipeline.openRanAnalysis);

    // Optional: Produce a Kafka message
    const producer = await getKafkaProducer();
    await producer.send({
      topic: savedPipeline.kafkaTopic,
      messages: [{ value: `OpenRAN TBS analysis done for pipeline ${savedPipeline._id}` }]
    });
    console.log(`[Kafka] Message produced to topic ${savedPipeline.kafkaTopic}`);

    // 6) Send the final response
    res.status(201).json(savedPipeline);

  } catch (error) {
    console.error('[createPipelineDefinition] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * processDataset
 * Reads the pipeline's CSV file by calling the utility function from utils/analyzeOpenRan5G.js,
 * saves the analysis in the pipeline doc, and sends a Kafka message.
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

    // 2) Call the analysis function from utils/analyzeOpenRan5G.js
    const openRanAnalysis = await analyzeOpenRan5G(datasetFilePath);
    // (Your analyzeOpenRan5G.js file will log details such as "Parsed row:" and "Analysis Result:" to stdout)

    // 3) Save the analysis to the pipeline doc
    pipeline.openRanAnalysis = openRanAnalysis;
    pipeline.status = 'processing';
    pipeline.updatedAt = new Date();
    await pipeline.save();

    console.log('[processDataset] Analysis saved to pipeline:', pipeline.openRanAnalysis);

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
      message: 'OpenRAN TBS dataset processed.',
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
    let pipeline = await PipelineDefinition.findById(pipelineId);
    if (pipeline) {
       

      pipeline.status = 'trained';
      pipeline.lastRun = new Date();
      pipeline.trainingMetrics = {
        accuracy,
        artifactPath,
        updatedAt: new Date(),
      };
      await pipeline.save();
      
      pipeline = await PipelineDefinition.findById(pipelineId);
      console.log('[nifiCallback] Updated pipeline doc =>', pipeline);
    };
res.json({
      success: true,
      pipelineId,
      sparkLogs: sparkResult.stdout,
      modelId: newModel._id,
      pipeline,
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
  let { pipelineId } = req.params;
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

