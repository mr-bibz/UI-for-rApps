// models/DataRecord.js
const mongoose = require('mongoose');

const dataRecordSchema = new mongoose.Schema({
  field1: String,
  field2: Number,
  // ...
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DataRecord', dataRecordSchema);
