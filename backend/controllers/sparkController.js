// controllers/sparkController.js
const { exec } = require('child_process');
const { SPARK_MASTER } = require('../config');

/**
 * Submit a Spark job via spark-submit (simple example)
 */
exports.trainSparkModel = (req, res) => {
  const { modelName, version } = req.body;
  // Path to your training script or JAR
  const sparkCmd = `spark-submit --master ${SPARK_MASTER} /usr/src/app/jobs/train_model.py --modelName ${modelName} --version ${version}`;

  exec(sparkCmd, (error, stdout, stderr) => {
    if (error) {
      console.error('[Spark] Train error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    // For demonstration, just returning logs
    return res.json({ success: true, stdout, stderr });
  });
};
