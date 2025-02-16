// controllers/deploymentController.js
const axios = require('axios');
const { SPARK_MASTER, NIFI_BASE_URL } = require('../config');
const PipelineDefinition = require('../models/PipelineDefinition');
const { exec } = require('child_process');

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

exports.startProcessing = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // Start NiFi flow
    await axios.put('${NIFI_BASE_URL}/flow/process-groups/${pipeline.nifiFlow}',  {
        id: pipeline.nifiFlow,
        state: 'RUNNING'
      });
  
      // Optionally update pipeline status
      pipeline.status = 'processing';
      pipeline.updatedAt = new Date();
      await pipeline.save();
  
      res.json({ success: true, message: 'NiFi flow ${pipeline.nifiFlow} started.' });
    } catch (error) {
      console.error('Error starting NiFi flow:', error.message);
      res.status(500).json({ error: error.message });
    }
  };
  
  exports.stopProcessing = async (req, res) => {
    try {
      const { pipelineId } = req.params;
      const pipeline = await PipelineDefinition.findById(pipelineId);
      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }
  
      // Stop NiFi flow
      await axios.put('${NIFI_BASE_URL}/flow/process-groups/${pipeline.nifiFlow}', {
        id: pipeline.nifiFlow,
        state: 'STOPPED'
      });
  
      pipeline.status = 'stopped';
      pipeline.updatedAt = new Date();
      await pipeline.save();
  
      res.json({ success: true, message: 'NiFi flow ${pipeline.nifiFlow} stopped.' });
    } catch (error) {
      console.error('Error stopping NiFi flow:', error.message);
      res.status(500).json({ error: error.message });
    }
  };
  
  exports.trainModel = async (req, res) => {
    try {
      const { pipelineId } = req.params;
      const pipeline = await PipelineDefinition.findById(pipelineId);
      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }
  
      // Run Spark job
      const sparkCmd = 'spark-submit --master ${SPARK_MASTER} /usr/src/app/jobs/${pipeline.sparkJob}.py';
      const result = await runCommand(sparkCmd);

    // Optionally update pipeline status or store metrics
    pipeline.status = 'training';
    pipeline.lastRun = new Date();
    await pipeline.save();

    res.json({ success: true, logs: result.stdout });
  } catch (error) {
    console.error('Error training Spark model:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.retrainModel = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // Retrain logic (could be the same script or a different one)
    const retrainCmd = 'spark-submit --master ${SPARK_MASTER} /usr/src/app/jobs/${pipeline.sparkjob}_retrain.py';
    const result = await runCommand(retrainCmd);

    pipeline.status = 'retraining';
    pipeline.lastRun = new Date();
    await pipeline.save();

    res.json({ success: true, logs: result.stdout });
  } catch (error) {
    console.error('Error retraining Spark model:', error.message);
    res.status(500).json({ error: error.message });
  }
};