// routes/sparkRoutes.js
const express = require('express');
const router = express.Router();
const { trainSparkModel } = require('../controllers/sparkController');

router.post('/train', trainSparkModel);
router.post('retrain', trainSparkModel);

module.exports = router;
