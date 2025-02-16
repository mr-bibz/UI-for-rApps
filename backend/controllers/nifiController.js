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
  console.log(`[NiFi] updateFlowState called with NIFI_BASE_URL: ${NIFI_BASE_URL}, processGroupId: ${processGroupId}`);
  try {
    // Skip the axios call if it's a dummy ID
    if (processGroupId.startsWith('dummy-')) {
      console.log(`[NiFi] Detected dummy flow ID: ${processGroupId}. Skipping API call.`);
      return res.json({ success: true, data: 'Skipped dummy flow update' });
    }

    const url = `${NIFI_BASE_URL}/flow/process-groups/${processGroupId}`;
    const payload = { id: processGroupId, state: 'RUNNING' };
    const response = await axios.put(url, payload);
    
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('[NiFi] updateFlowState error:', error.message);
    res.status(500).json({ error: error.message });
  }
};