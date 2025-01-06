// models/MLModel.js
const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  name: String,
  version: String,
  accuracy: Number,
  artifactPath: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MLModel', modelSchema);
