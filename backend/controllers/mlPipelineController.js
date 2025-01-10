// controllers/mlPipelineController.js
const axios = require('axios');
const { exec } = require('child_process');
const { NIFI_BASE_URL, SPARK_MASTER } = require('../config');
const MLModel = require('../models/MLModel');
const { getKafkaProducer } = require('../utils/kafkaClient');

// In-memory pipeline run state
const pipelineRuns = {}; // e.g. pipelineRuns[pipelineId] = { processGroupId, kafkaTopic, modelName, version, status }

// Utility to run spark-submit
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

// 1) rApp starts pipeline => NiFi flow => store run in memory
exports.runPipeline = async (req, res) => {
  // Body: { pipelineId, processGroupId, kafkaTopic, modelName, version }
  const { pipelineId, processGroupId, kafkaTopic, modelName, version } = req.body;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required' });
  }
  try {
    // Start NiFi flow
    if (processGroupId) {
      await axios.put('${NIFI_BASE_URL}/flow/process-groups/${processGroupId}', {
        id: processGroupId,
        state: 'RUNNING'
      });
      console.log('[NiFi] Flow started => PG=${processGroupId}');
    }
    // Produce Kafka message (optional)
    if (kafkaTopic) {
      const producer = await getKafkaProducer();
      await producer.send({
        topic: kafkaTopic,
        messages: [{ value: 'Starting data ingestion for pipeline...' }]
      });
      console.log('[Kafka] produced to ${kafkaTopic}');
    }
    // Store pipeline info
    pipelineRuns[pipelineId] = {
      processGroupId,
      kafkaTopic,
      modelName,
      version,
      status: 'NiFi flow started'
    };
    // Return immediately
    res.json({
      success: true,
      message: 'Pipeline run initiated. NiFi will callback once ingestion completes.',
      pipelineId
    });
  } catch (error) {
    console.error('[Pipeline] runPipeline error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 2) NiFi callback => POST /api/ml-pipeline/nifi/callback
// Body: { pipelineId }
exports.nifiCallback = async (req, res) => {
  const { pipelineId } = req.body;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required in NiFi callback' });
  }
  const run = pipelineRuns[pipelineId];
  if (!run) {
    return res.status(404).json({ error: 'No pipeline run found for that pipelineId' });
  }
  try {
    run.status = 'NiFi ingestion complete';
    console.log('[NiFi Callback] pipelineId=${pipelineId} => ingestion done');

    // Now trigger Spark job
    const { modelName, version} = run;
    const sparkCmd = 'spark-submit --master ${SPARK_MASTER} /usr/src/app/jobs/train_model.py --modelName ${modelName} --version ${version}';
    const sparkResult = await runCommand(sparkCmd);
    console.log('[Spark] logs:', sparkResult.stdout);

    // Suppose accuracy=0.95, parse from logs if needed
    const accuracy = 0.95;
    const artifactPath = '/usr/src/app/models/${modelName}_${version}';
    const newModel = await MLModel.create({
      name: modelName,
      version,
      accuracy,
      artifactPath
    });

    run.status = 'Spark job complete';
    run.modelId = newModel._id;
    console.log('[MLPipeline] Model stored =>', newModel._id);

    // Return success to NiFi
    res.json({
      success: true,
      pipelineId,
      sparkLogs: sparkResult.stdout,
      modelId: newModel._id
    });
  } catch (error) {
    console.error('[NiFi Callback] spark job error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// (Optional) pipeline run status
exports.getPipelineStatus = (req, res) => {
  const { pipelineId } = req.params;
  const run = pipelineRuns[pipelineId];
  if (!run) {
    return res.status(404).json({ error: 'No pipeline found for that ID' });
  }
  res.json({ pipelineId, status: run.status, modelId: run.modelId || null });
};