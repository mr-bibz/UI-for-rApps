// controllers/sparkController.js
const axios = require('axios');
const PipelineDefinition = require('../models/PipelineDefinition');

// If you have a separate config for Spark REST URL, import it.
// e.g. SPARK_REST_URL = 'http://spark-master:6066'

/**
 * Submits a Spark job via the Spark Master REST API
 * e.g. POST http://spark-master:6066/v1/submissions/create
 */
exports.trainModel = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // Where your training script is located inside spark-master:
    // This path must match what you put in Dockerfile.sparkmaster.
    const sparkScript = '/opt/jobs/train_model.py';

    // The Spark Master URL (e.g. "spark://spark-master:7077")
    // If not set in config, default here:
    const masterUrl = SPARK_MASTER || 'spark://spark-master:7077';

    // You can pass pipelineId to your script if needed:
    const cmd = `docker exec spark-master spark-submit --master ${masterUrl} ${sparkScript} --pipelineId ${pipelineId}`;
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
    const sparkScript = '/opt/jobs/train_model.py';
    const masterUrl = SPARK_MASTER || 'spark://spark-master:7077';

    const cmd = `docker exec spark-master spark-submit --master ${masterUrl} ${sparkScript} --retrain --pipelineId ${pipelineId}`;
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