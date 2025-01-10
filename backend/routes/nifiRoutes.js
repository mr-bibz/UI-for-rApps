// routes/nifiRoutes.js
const express = require('express');
const router = express.Router();
const { getNiFiStatus, updateFlowState } = require('../controllers/nifiController');

router.get('/status', getNiFiStatus);
router.post('/flow/', updateFlowState);

module.exports = router;
