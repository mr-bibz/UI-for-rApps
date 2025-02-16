// models/InterpretabilityMetric.js
const mongoose = require('mongoose');

const interpretabilityMetricSchema = new mongoose.Schema({
  pipelineId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'PipelineDefinition' },
  featureImportance: [
    {
      feature: { type: String, required: true },
      importance: { type: Number, required: true }
    }
  ],
  // For a heatmap, we can store a 2D array or matrix.
  // Here, we assume a matrix where each entry represents a contribution value.
  heatmap: { type: [[Number]], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InterpretabilityMetric', interpretabilityMetricSchema);