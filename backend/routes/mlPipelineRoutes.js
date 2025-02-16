const express = require('express');
const multer = require('multer');
const router = express.Router();

// Configure storage: Files will be saved in the "uploads" folder at the backend root.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');  // Ensure this folder exists in your backend directory.
  },
  filename: function (req, file, cb) {
    // Prepend a timestamp to the original filename for uniqueness.
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Define a file filter to allow only CSV and PDF files.
// Allow common CSV MIME types: "text/csv", "application/vnd.ms-excel", "text/plain"
const fileFilter = (req, file, cb) => {
  const allowedMIMEs = [
    'text/csv',
    'application/pdf',
    'application/vnd.ms-excel',
    'text/plain'
  ];
  if (allowedMIMEs.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only CSV and PDF files are allowed.'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

const {
  runPipeline,
  nifiCallback,
  getPipelineStatus,
  createPipelineDefinition
} = require('../controllers/mlPipelineController');

// Endpoint to start a pipeline run (if needed)
router.post('/run', runPipeline);

// Endpoint for NiFi callback (triggers Spark job, etc.)
router.post('/nifi/callback', nifiCallback);

// Endpoint to check the run status of a pipeline
router.get('/status/:pipelineId', getPipelineStatus);

// Create a new pipeline definition (with file upload for dataset)
// This endpoint expects a multipart/form-data request with a 'dataset' file field.
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