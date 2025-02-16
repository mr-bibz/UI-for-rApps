// routes/mlPipelineRoutes.js
const express = require('express');
const multer = require('multer');

// Configure multer for file uploads (adjust destination/path as needed)
const upload = multer({ dest: 'uploads/' });

const {
  runPipeline,
  nifiCallback,
  getPipelineStatus,
  createPipelineDefinition
} = require('../controllers/mlPipelineController');

const router = express.Router();

// Endpoint to start a pipeline run (if needed)
router.post('/run', runPipeline);

// Endpoint for NiFi callback (triggers Spark job, etc.)
router.post('/nifi/callback', nifiCallback);

// Endpoint to check the run status of a pipeline
router.get('/status/:pipelineId', getPipelineStatus);

// Create a new pipeline definition (with file upload for dataset)
// This endpoint expects a multipart/form-data request with a 'dataset' file field
router.post('/create', upload.single('dataset'), createPipelineDefinition);

// GET all pipeline definitions (for listing in Dashboard)
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

// DELETE a pipeline definition by its ID
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