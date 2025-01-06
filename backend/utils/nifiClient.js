// utils/nifiClient.js
const axios = require('axios');
const { NIFI_BASE_URL } = require('../config');

async function getSystemDiagnostics() {
  return axios.get(`${NIFI_BASE_URL}/system-diagnostics`);
}

async function startProcessGroup(processGroupId) {
  const url = `${NIFI_BASE_URL}/flow/process-groups/${processGroupId}`;
  return axios.put(url, { id: processGroupId, state: 'RUNNING' });
}

module.exports = {
  getSystemDiagnostics,
  startProcessGroup
};
