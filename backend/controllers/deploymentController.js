const { exec } = require('child_process');
const { SPARK_MASTER } = require('../config');
const PipelineDefinition = require('../models/PipelineDefinition');

/**
 * Start NiFi flow for a given pipeline in dummy mode.
 * Instead of calling the real NiFi API, we simulate the start by updating the pipeline status.
 * Example route: POST /deployment/:pipelineId/start-processing
 */
exports.startProcessing = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    if (pipeline.nifiFlow.startsWith('dummy-')) {
      console.log(`[NiFi] Detected dummy flow ${pipeline.nifiFlow}. Simulating start processing...`);
      // Simulate a delay to mimic API call latency
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      // (Optional) Code for real NiFi call would go here.
    }

    // Update pipeline status in MongoDB
    pipeline.status = 'processing';
    pipeline.updatedAt = new Date();
    await pipeline.save();

    res.json({
      success: true,
      message: `Dummy NiFi flow ${pipeline.nifiFlow} started.`,
      nifiResponse: { simulated: true }
    });
  } catch (error) {
    console.error('Error starting NiFi flow:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Stop NiFi flow for a given pipeline in dummy mode.
 * Example route: POST /deployment/:pipelineId/stop-processing
 */
exports.stopProcessing = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    if (pipeline.nifiFlow.startsWith('dummy-')) {
      console.log(`[NiFi] Detected dummy flow ${pipeline.nifiFlow}. Simulating stop processing...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      // (Optional) Code for real NiFi call would go here.
    }

    // Update pipeline status in MongoDB
    pipeline.status = 'stopped';
    pipeline.updatedAt = new Date();
    await pipeline.save();

    res.json({
      success: true,
      message: `Dummy NiFi flow ${pipeline.nifiFlow} stopped.`,
      nifiResponse: { simulated: true }
    });
  } catch (error) {
    console.error('Error stopping NiFi flow:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Train a Spark model by executing spark-submit via docker exec.
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
    // Path to your training script inside the spark-master container
    const sparkScript = '/opt/jobs/default-spark-job.py';
    const masterUrl = SPARK_MASTER || 'spark://spark-master:7077';
    
    // Construct the command (you can pass pipelineId if needed)
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
 * Retrain a Spark model by executing spark-submit via docker exec.
 * Example route: POST /deployment/:pipelineId/retrain-model
 */
exports.retrainModel = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

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
};s