// routes/metricsRoutes.js
const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');

// Existing metrics endpoints remain here...
// For example, your error logs, pipeline health, etc.

// Expose Prometheus metrics
router.get('/prometheus', metricsController.metrics);

module.exports = router;