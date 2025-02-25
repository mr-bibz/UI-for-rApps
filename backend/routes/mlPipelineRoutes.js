// routes/mlPipelineRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

// 1. Configure storage: where uploaded CSV files go.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure 'uploads/' exists in your backend directory.
  },
  filename: (req, file, cb) => {
    // Prepend a timestamp to keep filenames unique.
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// 2. Optional file filter to allow only CSV
const fileFilter = (req, file, cb) => {
  const allowedMIMEs = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
  if (allowedMIMEs.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed.'), false);
  }
};

const upload = multer({ storage, fileFilter });

// 3. Import the controller functions
const {
  createPipelineDefinition,
  processDataset,
  downloadAnalysisCsv,
  nifiCallback,
  getPipelineStatus
} = require('../controllers/mlPipelineController');

// 4. Define routes

// CREATE pipeline (upload CSV with columns "timestamp,tbs_sum")
router.post('/create', upload.single('dataset'), createPipelineDefinition);

// PROCESS dataset => analyze "timestamp,tbs_sum" to compute throughput & store in openRanAnalysis
router.post('/process/:pipelineId', processDataset);

// NIFI CALLBACK => triggers Spark training
router.post('/nifi/callback', nifiCallback);

// GET pipeline status => returns openRanAnalysis + trainingMetrics
router.get('/status/:pipelineId', getPipelineStatus);

//Download Analysis CSV for pipeline
router.get('/:pipelineId/analysis.csv', downloadAnalysisCsv);

// GET all pipeline definitions (for listing in a dashboard)
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

// DELETE a pipeline definition by ID
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