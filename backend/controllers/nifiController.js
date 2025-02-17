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
    console.error('[NiFi] Status error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Update the state of a NiFi process group for a given processGroupId.
 * Uses the real NiFi API endpoint:
 *    PUT {NIFI_BASE_URL}/flow/process-groups/{processGroupId}/state
 *
 * The request body must include a JSON object with the "state" key, e.g.:
 *    { "state": "RUNNING" }  OR  { "state": "STOPPED" }
 *
 * Example route: POST /nifi/flow-state
 */
exports.updateFlowState = async (req, res) => {
  const { processGroupId, state } = req.body;
  if (!processGroupId || !state) {
    return res.status(400).json({ error: 'processGroupId and state are required' });
  }
  
  console.log(`[NiFi] updateFlowState called with NIFI_BASE_URL: ${NIFI_BASE_URL}, processGroupId: ${processGroupId}, state: ${state}`);
  try {
    // Construct the URL with the /state path appended
    const url = `${NIFI_BASE_URL}/flow/process-groups/${processGroupId}/state`;
    const payload = { state };

    const response = await axios.put(url, payload);
    console.log('[NiFi] updateFlowState response:', response.data);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('[NiFi] updateFlowState error:', error.message);
    res.status(500).json({ error: error.message });
  }
};