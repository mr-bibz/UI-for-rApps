// routes/mlPipelineRoutes.js
const express = require('express');
const router = express.Router();
const {
  trainPipeline,
  getAllModels,
  getModelById
} = require('../controllers/mlPipelineController');

router.post('/train', trainPipeline);
router.get('/models', getAllModels);
router.get('/models/:id', getModelById);

module.exports = router;
