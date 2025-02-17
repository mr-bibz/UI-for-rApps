// controllers/deploymentController.js
const axios = require('axios');
const { SPARK_MASTER, NIFI_BASE_URL } = require('../config');
const PipelineDefinition = require('../models/PipelineDefinition');
const {submitSparkJob} = require('../utils/spark'); 
const { exec } = require('child_process');
const SPARK_REST_URL = 'http://spark-master:6066';

/*function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}
*/

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
  
      // Example Spark REST submission payload:
      const jobConfig = {
        action: 'CreateSubmissionRequest',
        appResource: 'local:///opt/jobs/default-spark-job.py', 
        // if you have a .py file in the spark-master container
        mainClass: 'org.apache.spark.deploy.PythonRunner', 
        // for Python apps, the mainClass is typically this, but can vary
        clientSparkVersion: '3.3.2',
        appArgs: [], // Extra args if needed
        sparkProperties: {
          'spark.app.name': 'TrainingPipeline',
          'spark.master': 'spark://spark-master:7077', 
          // same as SPARK_MASTER in your environment
          'spark.submit.deployMode': 'client',
          'spark.submit.pyFiles': 'local:///opt/jobs/default-spark-job.py',
          'spark.pyspark.python': '/usr/bin/python3'
        }
      };
  
      console.log('[trainModel] Submitting Spark job via REST...');
      console.log('[Spark REST] Submitting job to', `${SPARK_REST_URL}/v1/submissions/create`,'with payload:', jobConfig);

      // POST to Spark Master’s REST endpoint
      const response = await axios.post(`${SPARK_REST_URL}/v1/submissions/create`, jobConfig);
  
      // Optionally update pipeline status
      pipeline.status = 'training';
      pipeline.lastRun = new Date();
      await pipeline.save();
  
      res.json({
        success: true,
        message: 'Spark job submitted via REST',
        sparkResponse
      });
    } catch (error) {
      console.error('Error training Spark model:', error.message);
      res.status(500).json({ error: error.message });
    }
  };
  
  // Similar for retrainModel
  exports.retrainModel = async (req, res) => {
    try {
      const { pipelineId } = req.params;
      const pipeline = await PipelineDefinition.findById(pipelineId);
      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }
  
      // Example: a retrain job, referencing a different script
      const retrainConfig = {
        action: 'CreateSubmissionRequest',
        appResource: 'local:///opt/jobs/default-spark-job_retrain.py',
        mainClass: 'org.apache.spark.deploy.PythonRunner',
        clientSparkVersion: '3.3.2',
        appArgs: [],
        sparkProperties: {
          'spark.app.name': 'RetrainingPipeline',
          'spark.master': 'spark://spark-master:7077',
          'spark.submit.deployMode': 'client',
          'spark.submit.pyFiles': 'local:///opt/jobs/default-spark-job.py',
          'spark.pyspark.python': '/usr/bin/python3'
        }
      };
  
      console.log('[trainModel] Submitting Spark job via REST...');
      console.log('[Spark REST] Submitting job to', `${SPARK_REST_URL}/v1/submissions/create`,'with payload:', jobConfig);

      // POST to Spark Master’s REST endpoint
      const response = await axios.post(`${SPARK_REST_URL}/v1/submissions/create`, jobConfig);
  
      pipeline.status = 'retraining';
      pipeline.lastRun = new Date();
      await pipeline.save();
  
      res.json({
        success: true,
        message: 'Retrain job submitted via REST',
        sparkResponse
      });
    } catch (error) {
      console.error('Error retraining Spark model:', error.message);
      res.status(500).json({ error: error.message });
    }
  };