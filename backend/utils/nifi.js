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
 * Clone (instantiate) a NiFi template to create a new process group.
 * Then update the state to RUNNING using the returned URI.
 *
 * @param {string} templateId - The real template ID.
 * @returns {Promise<string>} - The new process group ID.
 */
exports.cloneNifiTemplate = async (templateId) => {
  try {
    const parentGroupId = 'root';
    const instanceUrl = `${NIFI_BASE_URL}/process-groups/${parentGroupId}/template-instance`;
     // Instantiate the template.
     const instanceResp = await axios.post(instanceUrl, {
      templateId,
      originX: 0,
      originY: 0
    });
    
    console.log('Template instance response:', JSON.stringify(instanceResp.data, null, 2));

    // Extract process group from response.
    let processGroups = instanceResp.data.flow && instanceResp.data.flow.processGroups;
    if (!processGroups || processGroups.length === 0) {
      processGroups = instanceResp.data.snippet && instanceResp.data.snippet.processGroups;
    }
    
    if (!processGroups || processGroups.length === 0) {
      throw new Error('No process groups returned from template instance response. Ensure the exported template is valid.');
    }
    
    const newPg = processGroups[0];
    const newPgId = newPg.id;
    console.log(`[NiFi] New process group created: ${newPgId}`);
 
    // Use the returned URI, but replace "localhost" with "nifi" so it resolves correctly from the backend container.
    let newPgUri = newPg.uri;
    if (newPgUri) {
      newPgUri = newPgUri.replace('/nifi-api/process-groups/', '/nifi-api/flow/process-groups/');
    } else {
      newPgUri = `${NIFI_BASE_URL}/flow/process-groups/${newPgId}`;
    }
    console.log(`[NiFi] Using process group URI: ${newPgUri}`);
    
    // Construct the state update URL.
    const stateUrl = `${newPgUri}/state`;
    console.log(`[NiFi] Updating state at URL: ${stateUrl}`);

    // Construct payload with revision and component.
    const statePayload = {
      revision: { clientId: "nifi-client", version: 0 },
      component: { id: newPgId },
      state: "RUNNING"
    };

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Update state.
    const stateResp = await axios.put(stateUrl, statePayload);
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
