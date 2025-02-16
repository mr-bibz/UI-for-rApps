// routes/mlPipelineRoutes.js
const express = require('express');
const {
  runPipeline,
  nifiCallback,
  getPipelineStatus,
  createPipelineDefinition
} = require('../controllers/mlPipelineController');

const router = express.Router();
const PipelineDefinition = require('../models/PipelineDefinition');

// rApp calls => starts NiFi flow => store pipeline run in memory
router.post('/run', runPipeline);

// NiFi callback => triggers Spark => store model
router.post('/nifi/callback', nifiCallback);

// Optional: check pipeline run status
router.get('/status/:pipelineId', getPipelineStatus);

// Create new pipeline definition (using default configuration mode)
router.post('/create', createPipelineDefinition);

// Optional: GET all pipeline definitions (for example, for listing on the Dashboard)
router.get('/', async (req, res) => {
  try {
    const PipelineDefinition = require('../models/PipelineDefinition');
    const pipelines = await PipelineDefinition.find({});
    res.json(pipelines);
  } catch (error) {
    console.error('Error fetching pipeline definitions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete the pipeline definitions 
router.delete('/:pipelineId', async (req, res) => {
  try {
    const PipelineDefinition = require('../models/PipelineDefinition');
    await PipelineDefinition.findByIdAndDelete(req.params.pipelineId);
    res.json({ message: 'Pipeline deleted successfully' });
  } catch (error) {
    console.error('Error deleting pipeline:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;