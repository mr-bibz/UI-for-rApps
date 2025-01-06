// routes/sparkRoutes.js
const express = require('express');
const router = express.Router();
const { trainSparkModel } = require('../controllers/sparkController');

router.post('/train', trainSparkModel);

module.exports = router;
