// controllers/nifiController.js
const axios = require('axios');
const { NIFI_BASE_URL } = require('../config');

/**
 * GET NiFi status (system diagnostics)
 */
exports.getNiFiStatus = async (req, res) => {
  try {
    const response = await axios.get(`${NIFI_BASE_URL}/system-diagnostics`);
    return res.json(response.data);
  } catch (error) {
    console.error('[NiFi] Status error:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Start NiFi flow for a given processGroupId
 */
exports.updateFlowState = async (req, res) => {
  const { processGroupId } = req.body;
  try {
    const url = `${NIFI_BASE_URL}/flow/process-groups/${processGroupId}`;
    const payload = { id: processGroupId, state: 'RUNNING' };
    const response = await axios.put(url, payload);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('[NiFi] updateFlowState error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
