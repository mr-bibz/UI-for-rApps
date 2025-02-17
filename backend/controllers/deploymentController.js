const axios = require('axios');
const { NIFI_BASE_URL } = require('../config');
const PipelineDefinition = require('../models/PipelineDefinition');

/**
 * Start NiFi flow for a given pipeline using the real NiFi REST API.
 * This function no longer skips dummy IDs.
 * Example route: POST /deployment/:pipelineId/start-processing
 */
exports.startProcessing = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // Construct the URL to update the state of the process group to RUNNING.
    // For example: http://localhost:8080/nifi-api/flow/process-groups/<nifiFlow>/state
    const url = `${NIFI_BASE_URL}/flow/process-groups/${pipeline.nifiFlow}/state`;
    const payload = { state: 'RUNNING' };

    console.log(`[NiFi] Sending request to start process group ${pipeline.nifiFlow} using URL ${url}`);
    const response = await axios.put(url, payload);
    console.log('[NiFi] Response:', response.data);

    // Update pipeline status in MongoDB
    pipeline.status = 'processing';
    pipeline.updatedAt = new Date();
    await pipeline.save();

    res.json({
      success: true,
      message: `NiFi flow ${pipeline.nifiFlow} started.`,
      nifiResponse: response.data
    });
  } catch (error) {
    console.error('Error starting NiFi flow:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Stop NiFi flow for a given pipeline using the real NiFi REST API.
 * Example route: POST /deployment/:pipelineId/stop-processing
 */
exports.stopProcessing = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // Construct the URL to update the state of the process group to STOPPED.
    const url = `${NIFI_BASE_URL}/flow/process-groups/${pipeline.nifiFlow}/state`;
    const payload = { state: 'STOPPED' };

    console.log(`[NiFi] Sending request to stop process group ${pipeline.nifiFlow} using URL ${url}`);
    const response = await axios.put(url, payload);
    console.log('[NiFi] Response:', response.data);

    // Update pipeline status in MongoDB
    pipeline.status = 'stopped';
    pipeline.updatedAt = new Date();
    await pipeline.save();

    res.json({
      success: true,
      message: `NiFi flow ${pipeline.nifiFlow} stopped.`,
      nifiResponse: response.data
    });
  } catch (error) {
    console.error('Error stopping NiFi flow:', error.message);
    res.status(500).json({ error: error.message });
  }
};


/**
 * Train a Spark model by exec'ing spark-submit in the spark-master container.
 * Example route: POST /deployment/:pipelineId/train-model
 */
exports.trainModel = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
     
    const SparkSubmitPath = '/opt/bitnami/spark/bin/spark-submit';
    // Where your training script is located inside spark-master:
    // This path must match what you put in Dockerfile.sparkmaster.
    const sparkScript = '/opt/jobs/default-spark-job.py';

    // The Spark Master URL (e.g. "spark://spark-master:7077")
    // If not set in config, default here:
    const masterUrl = SPARK_MASTER || 'spark://spark-master:7077';

    // You can pass pipelineId to your script if needed:
    const cmd = `docker exec spark-master ${SparkSubmitPath} --master ${masterUrl} ${sparkScript} --pipelineId ${pipelineId}`;
    console.log('[trainModel] Running command:', cmd);
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('[trainModel] error:', error.message);
        return res.status(500).json({ error: error.message });
      }
      console.log('[trainModel] stdout:', stdout);
      console.log('[trainModel] stderr:', stderr);

      // Optionally update pipeline status
      pipeline.status = 'training';
      pipeline.lastRun = new Date();
      pipeline.save().catch(err => console.error('Error saving pipeline:', err));

      res.json({ success: true, stdout, stderr });
    });
  } catch (error) {
    console.error('Error training Spark model:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Retrain a Spark model by exec'ing spark-submit in the spark-master container.
 * Example route: POST /deployment/:pipelineId/retrain-model
 */
exports.retrainModel = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // If you have a separate script for retraining or pass a --retrain flag
    // e.g. same script but different arg
    const SparkSubmitPath = '/opt/bitnami/spark/bin/spark-submit';
    const sparkScript = '/opt/jobs/default-spark-job.py';
    const masterUrl = SPARK_MASTER || 'spark://spark-master:7077';

    const cmd = `docker exec spark-master ${SparkSubmitPath} --master ${masterUrl} ${sparkScript} --retrain --pipelineId ${pipelineId}`;
    console.log('[retrainModel] Running command:', cmd);
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('[retrainModel] error:', error.message);
        return res.status(500).json({ error: error.message });
      }
      console.log('[retrainModel] stdout:', stdout);
      console.log('[retrainModel] stderr:', stderr);

      pipeline.status = 'retraining';
      pipeline.lastRun = new Date();
      pipeline.save().catch(err => console.error('Error saving pipeline:', err));

      res.json({ success: true, stdout, stderr });
    });
  } catch (error) {
    console.error('Error retraining Spark model:', error.message);
    res.status(500).json({ error: error.message });
  }
};