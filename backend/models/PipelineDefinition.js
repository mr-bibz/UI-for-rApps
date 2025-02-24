// models/PipelineDefinition.js

const mongoose = require('mongoose');

const pipelineDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  template: { type: String, default: 'default' },
  nifiFlow: { type: String, required: true },
  kafkaTopic: { type: String, required: true },
  sparkJob: { type: String, required: true },
  status: { type: String, default: 'inactive' },

  // NEW: Store dataset analysis (throughput/latency metrics, row count, etc.)
  analysis: {
    count: Number,
    averageThroughput: Number,
    averageLatency: Number,
    minThroughput: Number,
    maxThroughput: Number,
    minLatency: Number,
    maxLatency: Number
  },

  // NEW: Store ML training results (accuracy, artifact path, etc.)
  trainingMetrics: {
    accuracy: Number,
    artifactPath: String,
    updatedAt: Date
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastRun: { type: Date, default: null }
});

module.exports = mongoose.model('PipelineDefinition', pipelineDefinitionSchema);