// controllers/sparkController.js
const axios = require('axios');
const PipelineDefinition = require('../models/PipelineDefinition');

// If you have a separate config for Spark REST URL, import it.
// e.g. SPARK_REST_URL = 'http://spark-master:6066'
const { SPARK_REST_URL } = require('../config');

/**
 * Submits a Spark job via the Spark Master REST API
 * e.g. POST http://spark-master:6066/v1/submissions/create
 */
exports.trainSparkModel = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await PipelineDefinition.findById(pipelineId);

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // Example job config for a Python script
    const jobConfig = {
      action: 'CreateSubmissionRequest',
      appResource: 'local:///opt/jobs/train_model.py', 
      mainClass: 'org.apache.spark.deploy.PythonRunner', 
      clientSparkVersion: '3.3.2',
      // If your script needs arguments, add them here
      appArgs: [`--modelName=${req.body.modelName}`, `--version=${req.body.version}`],
      sparkProperties: {
        'spark.app.name': 'TrainSparkModel',
        'spark.master': 'spark://spark-master:7077',
        'spark.submit.deployMode': 'client'
      }
    };

    console.log('[trainSparkModel] Submitting job to Spark REST:', jobConfig);

    const response = await axios.post(`${SPARK_REST_URL}/v1/submissions/create`,jobConfig);
    return res.json({ success: true, sparkResponse: response.data });
  } catch (error) {
    console.error('[Spark] trainSparkModel REST error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};