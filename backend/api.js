// api.js
const express = require('express');
const mongoose = require('mongoose');
const { MONGODB_URL, PORT } = require('./config');
const nifiRoutes = require('./routes/nifiRoutes');
const kafkaRoutes = require('./routes/kafkaRoutes');
const sparkRoutes = require('./routes/sparkRoutes');
const mlPipelineRoutes = require('./routes/mlPipelineRoutes');

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('[MongoDB] Connected'))
  .catch(err => console.error('[MongoDB] Error:', err));

// Register routes
app.use('/api/nifi', nifiRoutes);
app.use('/api/kafka', kafkaRoutes);
app.use('/api/spark', sparkRoutes);
app.use('/api/ml-pipeline', mlPipelineRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`[Backend] Server running on port ${PORT}`);
});
