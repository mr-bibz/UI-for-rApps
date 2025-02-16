// Example: ErrorLog model

const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema({
  component: { type: String, required: true }, // e.g., "NiFi", "Kafka", "Spark"
  message: { type: String, required: true },
  severity: { type: String, default: 'error' }, // e.g., "error", "warning", "critical"
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ErrorLog', errorLogSchema);