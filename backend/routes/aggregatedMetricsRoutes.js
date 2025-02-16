// routes/aggregatedMetricsRoutes.js
const express = require('express');
const router = express.Router();
const { getAggregatedMetrics } = require('../controllers/aggregatedMetricsController');

router.get('/', getAggregatedMetrics);

module.exports = router;