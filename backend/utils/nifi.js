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
    
    // Attempt to extract the new process group info from either 'flow' or 'snippet'
    let processGroups;
    if (instanceResp.data.flow && instanceResp.data.flow.processGroups && instanceResp.data.flow.processGroups.length > 0) {
      processGroups = instanceResp.data.flow.processGroups;
    } else if (instanceResp.data.snippet && instanceResp.data.snippet.processGroups && instanceResp.data.snippet.processGroups.length > 0) {
      processGroups = instanceResp.data.snippet.processGroups;
    } else {
      throw new Error('No process groups returned from template instance response. Ensure the exported template is valid.');
    }
    
    const newPg = processGroups[0];
    const newPgId = newPg.id;
    console.log(`[NiFi] New process group created: ${newPgId}`);
    // Use the URI provided by NiFi if available.
    let newPgUri = newPg.uri;
    if (!newPgUri) {
      // Fall back to constructing the URL (though this may be less reliable)
      newPgUri = `${NIFI_BASE_URL}/flow/process-groups/${newPgId}`;
    }
    
    // Append "/state" to the URI to update its state.
    const stateUrl = `${newPgUri}/state`;
    await axios.put(stateUrl, { state: 'RUNNING' });
    console.log(`[NiFi] Process group ${newPgId} is now RUNNING)`);
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
