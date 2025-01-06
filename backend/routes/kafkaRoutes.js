// routes/kafkaRoutes.js
const express = require('express');
const router = express.Router();
const { produceMessage } = require('../controllers/kafkaController');

router.post('/produce', produceMessage);

module.exports = router;
