// Example: SparkTrainingLog model

const mongoose = require('mongoose');

const sparkTrainingLogSchema = new mongoose.Schema({
  jobName: { type: String, required: true },
  accuracy: { type: Number, default: 0 },       // or other ML metrics
  loss: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },       // in seconds
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SparkTrainingLog', sparkTrainingLogSchema);