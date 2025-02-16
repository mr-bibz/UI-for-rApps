// Example: PipelineHealth model

const mongoose = require('mongoose');

const pipelineHealthSchema = new mongoose.Schema({
  component: { type: String, required: true }, // e.g., "NiFi", "Kafka", "Spark"
  status: { type: String, required: true },    // e.g., "running", "stopped", "error"
  uptime: { type: Number, default: 0 },        // in seconds, or store as Date for more detail
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PipelineHealth', pipelineHealthSchema);