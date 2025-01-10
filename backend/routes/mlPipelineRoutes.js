// routes/mlPipelineRoutes.js
const express = require('express');
const {
  runPipeline,
  nifiCallback,
  getPipelineStatus
} = require('../controllers/mlPipelineController');

const router = express.Router();

// rApp calls => starts NiFi flow => store pipeline run
router.post('/run', runPipeline);

// NiFi callback => triggers Spark => store model
router.post('/nifi/callback', nifiCallback);

// Optional to check pipeline run status
router.get('/status/:pipelineId', getPipelineStatus);

module.exports = router;