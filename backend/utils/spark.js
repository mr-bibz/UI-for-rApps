// utils/spark.js
const { exec } = require('child_process');

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

/**
 * Submit a Spark job for training/inference.
 * @param {string} sparkJobName - The identifier or filename for the Spark job.
 */
exports.submitSparkJob = async (sparkJobName) => {
  try {
    const { SPARK_MASTER } = require('../config');
    // Construct the spark-submit command; adjust the script path as needed
    const cmd = `spark-submit --master ${SPARK_MASTER} /usr/src/app/jobs/${sparkJobName}.py`;
    console.log(`[Spark] Job submitted successfully:`, result.stdout);
    return result;
  } catch (error) {
    console.error('Error submitting Spark job:', error.message);
    throw error;
  }
};