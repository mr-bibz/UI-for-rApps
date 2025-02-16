// routes/deploymentRoutes.js
const express = require('express');
const router = express.Router();
const {
  startProcessing,
  stopProcessing,
  trainModel,
  retrainModel
} = require('../controllers/deploymentController');

// NiFi data processing endpoints
router.post('/:pipelineId/start-processing', startProcessing);
router.post('/:pipelineId/stop-processing', stopProcessing);

// Spark training endpoints
router.post('/:pipelineId/train-model', trainModel);
router.post('/:pipelineId/retrain-model', retrainModel);

module.exports = router;