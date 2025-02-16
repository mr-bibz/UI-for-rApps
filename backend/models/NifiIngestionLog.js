// Example: NifiIngestionLog model

const mongoose = require('mongoose');

const nifiIngestionLogSchema = new mongoose.Schema({
  flowName: { type: String, required: true },
  recordsIngested: { type: Number, default: 0 },
  ingestionRate: { type: Number, default: 0 }, // records per second
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NifiIngestionLog', nifiIngestionLogSchema);