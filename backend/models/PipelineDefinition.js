// models/PipelineDefinition.js

const mongoose = require('mongoose');

const pipelineDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  template: { type: String, default: 'default' },
  nifiFlow: { type: String, required: true },
  kafkaTopic: { type: String, required: true },
  sparkJob: { type: String, required: true },
  status: { type: String, default: 'inactive' },

  // ADD this field for the TBS-based analysis results
  openRanAnalysis: {
    totalRecords: Number,
    totalLoad: Number,
    avgThroughput: Number,
    minThroughput: Number,
    maxThroughput: Number,
    approxLatency: Number,
    bottleneckCount: Number,
    intervals: [{
      timestampStart: String,
      timestampEnd: String,
      deltaT: Number,
      throughput: Number,
      latency: Number,
      bottleneck: Boolean
    }]
  },

  // If you also do ML training, store training results here
  trainingMetrics: {
    accuracy: Number,
    artifactPath: String,
    updatedAt: Date
  }
});

module.exports = mongoose.model('PipelineDefinition', pipelineDefinitionSchema);
