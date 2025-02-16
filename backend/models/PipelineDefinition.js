// models/PipelineDefinition.js
const mongoose = require('mongoose');

const pipelineDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  template: { type: String, default: 'default' },
  nifiFlow: { type: String, required: true },
  kafkaTopic: { type: String, required: true },
  sparkJob: { type: String, required: true },
  status: { type: String, default: 'inactive' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastRun: {type: Date, default:null},
});

module.exports = mongoose.model('PipelineDefinition', pipelineDefinitionSchema);
