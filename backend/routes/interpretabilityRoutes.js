// routes/interpretabilityRoutes.js
const express = require('express');
const router = express.Router();
const { getInterpretabilityMetrics } = require('../controllers/interpretabilityController');

router.get('/:pipelineId', getInterpretabilityMetrics);

module.exports = router;