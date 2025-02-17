// utils/spark.js
const axios = require('axios');

/**
 * Submits a Spark job via the Spark Master REST endpoint.
 * 
 * @param {object} jobConfig - Contains the Spark job parameters (resource, mainClass, arguments, etc.)
 */
exports.submitSparkJob = async (jobConfig) => {
  const url = 'http://spark-master:6066/v1/submissions/create';
  console.log(`[Spark REST] Submitting job to ${url} with payload:`, jobConfig);

  const response = await axios.post(url, jobConfig);
  return response.data;
};