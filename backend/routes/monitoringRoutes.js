// routes/monitoringRoutes.js
const express = require('express');
const router = express.Router();

// You can either reuse the getPipelineStatus from the ML Pipeline Controller,
// or create a dedicated controller for monitoring. For simplicity, we'll reuse it.
const { getPipelineStatus } = require('../controllers/mlPipelineController');

// This route returns the analysis and training metrics for a given pipeline.
router.get('/:pipelineId', getPipelineStatus);

module.exports = router;