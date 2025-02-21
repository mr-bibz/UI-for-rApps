// utils/nifi.js
const axios = require('axios');
const { NIFI_BASE_URL } = require('../config');

/**
 * Fetch available templates from NiFi.
 * Uses GET {NIFI_BASE_URL}/flow/templates.
 * Returns an array of template objects.
 */
exports.fetchAvailableTemplates = async () => {
  try {
    const response = await axios.get(`${NIFI_BASE_URL}/flow/templates`);
    console.log("Fetched templates:", response.data.templates);
    return response.data.templates || [];
  } catch (error) {
    console.error(`Error fetching NiFi templates: ${error.message}`);
    return [];
  }
};

/**
 * Clone (instantiate) a NiFi template to create a new process group (PG).
 * Uses the real NiFi API endpoints:
 *   - POST {NIFI_BASE_URL}/process-groups/root/template-instance 
 *   - PUT {NIFI_BASE_URL}/flow/process-groups/{newPgId}/state with { state: "RUNNING" }
 *
 * Returns the new process group ID.
 */

exports.cloneNifiTemplate = async (templateId) => {
  try {
    const parentGroupId = 'root';
    const instanceUrl =  `${NIFI_BASE_URL}/process-groups/${parentGroupId}/template-instance`;
    const instanceResp = await axios.post(instanceUrl, {
      templateId,
      originX: 0,
      originY: 0
    });
    
    console.log('Template instance response:', JSON.stringify(instanceResp.data, null, 2));
    
    // Try to extract the new process group from the response.
    // Depending on NiFi version, it may be in instanceResp.data.flow.processGroups
    let processGroups = instanceResp.data.flow && instanceResp.data.flow.processGroups;
    if (!processGroups || processGroups.length === 0) {
      // Alternatively, check the snippet field.
      processGroups = instanceResp.data.snippet && instanceResp.data.snippet.processGroups;
    }
    
    if (!processGroups || processGroups.length === 0) {
      throw new Error('No process groups returned from template instance response. Ensure the exported template is valid.');
    }

    const newPgId = processGroups[0].id;
    console.log(`[NiFi] New process group created: ${newPgId}`);

    // Construct the state update URL using NIFI_BASE_URL (ensure no trailing slash)
    const stateUrl = `${NIFI_BASE_URL}/flow/process-groups/${newPgId}/state`;
    console.log(`Updating state at URL: ${stateUrl}`);

    // Update the state of the new process group to RUNNING.
    const stateResp = await axios.put(stateUrl, { state: 'RUNNING' });
    console.log(`[NiFi] Process group ${newPgId} state update response status: ${stateResp.status}`);

    return newPgId;
  } catch (error) {
    console.error(`Error cloning NiFi template: ${error.message}`);
    throw error;
  }
};
  

/**
 * Fallback: Create a minimal NiFi template dynamically.
 * In production you’d upload a template file via the REST API.
 * For now, this function is a stub that returns a generated minimal template ID.
 */
exports.createMinimalKafkaNiFiTemplate = async (templateName) => {
  try {
    console.log(`No matching NiFi template found for "${templateName}". Creating a minimal template...`);
    return `minimal-template-id-${templateName}`;
  } catch (error) {
    console.error(`Error creating minimal Kafka NiFi template: ${error.message}`);
    throw error;
  }
};
