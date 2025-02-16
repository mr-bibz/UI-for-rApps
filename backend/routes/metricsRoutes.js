// routes/metricsRoutes.js

const express = require('express');
const router = express.Router();

const PipelineHealth = require('../models/PipelineHealth');
const ErrorLog = require('../models/ErrorLog');
const NifiIngestionLog = require('../models/NifiIngestionLog');
const SparkTrainingLog = require('../models/SparkTrainingLog');

/**
 * GET pipeline health for all components
 */
router.get('/pipeline-health', async (req, res) => {
  try {
    const healthData = await PipelineHealth.find({});
    res.json(healthData);
  } catch (error) {
    console.error('Error fetching pipeline health:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * GET error logs
 * Optionally accept query params for filtering (e.g., ?severity=warning)
 */
router.get('/error-logs', async (req, res) => {
  try {
    const { severity } = req.query;
    const query = severity ? { severity } : {};
    const logs = await ErrorLog.find(query).sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching error logs:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * GET NiFi ingestion logs
 * Could be used to plot ingestion rates or total records ingested
 */
router.get('/nifi-ingestion', async (req, res) => {
  try {
    const logs = await NifiIngestionLog.find({}).sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching NiFi ingestion logs:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * GET Spark training logs
 * Could display training metrics like accuracy, loss, duration
 */
router.get('/spark-training', async (req, res) => {
  try {
    const logs = await SparkTrainingLog.find({}).sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching Spark training logs:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * GET Container Metrics
 * Returns resource usage metrics for key containers (e.g., NiFi, Kafka, Spark, MongoDB)
 */
router.get('/containers', async (req, res) => {
  try {
    // Sample static data; replace with dynamic data from Docker or a monitoring tool as needed.
    const containerMetrics = {
      nifi: { cpuUsage: 30, memoryUsage: 500, networkThroughput: 5 },
      kafka: { cpuUsage: 20, memoryUsage: 400, networkThroughput: 7 },
      spark: { cpuUsage: 50, memoryUsage: 1024, networkThroughput: 10 },
      mongo: { cpuUsage: 10, memoryUsage: 256, networkThroughput: 2 }
    };
    res.json(containerMetrics);
  } catch (error) {
    console.error('Error fetching container metrics:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;