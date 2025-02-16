// controllers/interpretabilityController.js
const InterpretabilityMetric = require('../models/InterpretabilityMetric');

exports.getInterpretabilityMetrics = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const metrics = await InterpretabilityMetric.findOne({ pipelineId });
    if (!metrics) {
      return res.status(404).json({ error: 'Interpretability metrics not found for this pipeline' });
    }
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching interpretability metrics:', error.message);
    res.status(500).json({ error: error.message });
  }
};