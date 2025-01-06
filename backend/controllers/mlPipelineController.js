// controllers/mlPipelineController.js
const { exec } = require('child_process');
const { SPARK_MASTER } = require('../config');
const MLModel = require('../models/MLModel');
const axios = require('axios');
const { NIFI_BASE_URL } = require('../config');

/**
 * Orchestrate an entire training pipeline.
 */
exports.trainPipeline = async (req, res) => {
  const { processGroupId, modelName, version } = req.body;
  try {
    // 1) Start NiFi flow
    if (processGroupId) {
      const startFlowUrl = `${NIFI_BASE_URL}/flow/process-groups/${processGroupId}`;
      await axios.put(startFlowUrl, { id: processGroupId, state: 'RUNNING' });
      console.log('[NiFi] Flow started:', processGroupId);
    }

    // 2) Spark training
    const sparkCmd = `spark-submit --master ${SPARK_MASTER} /usr/src/app/jobs/train_model.py --modelName ${modelName} --version ${version}`;
    const output = await runCmdAsync(sparkCmd);
    console.log('[Spark] Training completed:', output);

    // 3) Store model info in MongoDB
    const accuracy = 0.95;  // In real code, parse from Spark logs
    const newModel = await MLModel.create({
      name: modelName,
      version,
      accuracy,
      artifactPath: `/usr/src/app/models/${modelName}_${version}`
    });
    console.log('[MLPipeline] Model stored:', newModel._id);

    return res.json({
      success: true,
      sparkOutput: output,
      modelId: newModel._id
    });
  } catch (error) {
    console.error('[MLPipeline] Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Utility to run a shell command with Promise
 */
function runCmdAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

// GET all models
exports.getAllModels = async (req, res) => {
  try {
    const models = await MLModel.find().sort({ createdAt: -1 });
    return res.json(models);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET a specific model by ID
exports.getModelById = async (req, res) => {
  try {
    const model = await MLModel.findById(req.params.id);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    return res.json(model);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
