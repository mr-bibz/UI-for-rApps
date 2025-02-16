// controllers/metricsController.js
const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics(); // Collect default Node.js process metrics

// (Optional) Create any custom metrics here
// For example, a counter for pipelines created:
// const pipelineCounter = new client.Counter({
//   name: 'ml_pipeline_creations_total',
//   help: 'Total number of ML pipelines created'
// });

exports.metrics = (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(client.register.metrics());
};