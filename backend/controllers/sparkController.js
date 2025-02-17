// controllers/sparkController.js

const { exec } = require('child_process');
const { SPARK_MASTER } = require('../config'); 
const PipelineDefinition = require('../models/PipelineDefinition');

/**
 * Train Spark Model by docker exec into spark-master container
 * and running spark-submit on your script, e.g. /opt/jobs/train_model.py
 */
exports.trainSparkModel = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    const SparkSubmitPath = '/opt/bitnami/spark/bin/spark-submit';
    // Where your script is located in the spark-master container.
    // Must match your Dockerfile for spark-master.
    const sparkScript = '/opt/jobs/train_model.py';

    // The Spark master URL, or default if not in config
    const masterUrl = SPARK_MASTER || 'spark://spark-master:7077';

    // Build the docker exec command:
    //  e.g. docker exec spark-master spark-submit --master spark://spark-master:7077 /opt/jobs/train_model.py --pipelineId ...
    const cmd = `docker exec spark-master ${SparkSubmitPath} --master ${masterUrl} ${sparkScript} --pipelineId ${pipelineId}`;
    console.log('[trainSparkModel] Running command:', cmd);

    // Run the command
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('[trainSparkModel] error:', error.message);
        return res.status(500).json({ error: error.message });
      }

      console.log('[trainSparkModel] stdout:', stdout);
      console.log('[trainSparkModel] stderr:', stderr);

      // Optionally update pipeline status
      pipeline.status = 'training';
      pipeline.lastRun = new Date();
      pipeline.save().catch(err => console.error('Error saving pipeline:', err));

      res.json({ success: true, stdout, stderr });
    });
  } catch (error) {
    console.error('[trainSparkModel] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};


/**
 * Retrain Spark Model similarly by docker exec
 */
exports.retrainSparkModel = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // Could be the same script or a different one
    const SparkSubmitPath = '/opt/bitnami/spark/bin/spark-submit';
    const sparkScript = '/opt/jobs/train_model.py';
    const masterUrl = SPARK_MASTER || 'spark://spark-master:7077';

    // Maybe pass a --retrain arg so your script can handle logic differently
    const cmd = `docker exec spark-master ${SparkSubmitPath} --master ${masterUrl} ${sparkScript} --retrain --pipelineId ${pipelineId}`;
    console.log('[retrainSparkModel] Running command:', cmd);

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('[retrainSparkModel] error:', error.message);
        return res.status(500).json({ error: error.message });
      }

      console.log('[retrainSparkModel] stdout:', stdout);
      console.log('[retrainSparkModel] stderr:', stderr);

      pipeline.status = 'retraining';
      pipeline.lastRun = new Date();
      pipeline.save().catch(err => console.error('Error saving pipeline:', err));

      res.json({ success: true, stdout, stderr });
    });
  } catch (error) {
    console.error('[retrainSparkModel] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};