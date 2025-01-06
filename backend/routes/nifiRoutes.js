// routes/nifiRoutes.js
const express = require('express');
const router = express.Router();
const { getNiFiStatus, startFlow } = require('../controllers/nifiController');

router.get('/status', getNiFiStatus);
router.post('/flow/start', startFlow);

module.exports = router;
