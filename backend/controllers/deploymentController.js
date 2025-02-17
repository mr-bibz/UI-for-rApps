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

    // If the NiFi flow ID starts with "dummy-", skip the actual NiFi API call
    if (pipeline.nifiFlow.startsWith('nifi-')) {
      console.log(`[NiFi] Detected dummy flow ID: ${pipeline.nifiFlow}. Skipping API call.`);
    } else {
        // Use backticks to interpolate NIFI_BASE_URL and pipeline.nifiFlow
        await axios.put(`${NIFI_BASE_URL}/flow/process-groups/${pipeline.nifiFlow}`, {
            id: pipeline.nifiFlow,
            state: 'RUNNING'
          });
          console.log(`[NiFi] Flow ${pipeline.nifiFlow} started.`);
        }

        // Optionally update pipeline status
        pipeline.status = 'processing';
        pipeline.updatedAt = new Date();
        await pipeline.save();
    
        res.json({
          success: true,
          message: `NiFi flow ${pipeline.nifiFlow} started (or skipped if dummy).`
        });
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
  
      // If the NiFi flow ID starts with "dummy-", skip the actual NiFi API call
      if (pipeline.nifiFlow.startsWith('dummy-')) {
        console.log(`[NiFi] Detected dummy flow ID: ${pipeline.nifiFlow}. Skipping API call.`);
    } else {
        // Use backticks
        await axios.put(`${NIFI_BASE_URL}/flow/process-groups/${pipeline.nifiFlow}`, {
            id: pipeline.nifiFlow,
        state: 'STOPPED'
      });
      console.log(`[NiFi] Flow ${pipeline.nifiFlow} stopped.`);
    }

    pipeline.status = 'stopped';
    pipeline.updatedAt = new Date();
    await pipeline.save();

    res.json({
      success: true,
      message: `NiFi flow ${pipeline.nifiFlow} stopped (or skipped if dummy).`
    });
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

  // Use backticks to interpolate SPARK_MASTER and pipeline.sparkJob
  const sparkCmd = `spark-submit --master ${SPARK_MASTER} /usr/src/app/jobs/${pipeline.sparkJob}.py`;
  const result = await runCommand(sparkCmd);

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
  
      // In your code, pipeline.sparkjob is lowercased. Ensure consistent naming: pipeline.sparkJob or pipeline.sparkjob
      const retrainCmd = `spark-submit --master ${SPARK_MASTER} /usr/src/app/jobs/${pipeline.sparkJob}_retrain.py`;
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