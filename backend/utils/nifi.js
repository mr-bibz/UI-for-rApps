const axios = require('axios');
const { NIFI_BASE_URL } = require('../config');

/**
 * Fetch available templates from NiFi.
 * Returns an array of templates.
 */
exports.fetchAvailableTemplates = async () => {
  try {
    // Fetch the list of templates from NiFi.
    // Note: NiFi's API returns a JSON object with a "templates" property.
    const response = await axios.get(`${NIFI_BASE_URL}/templates`);
    return response.data.templates || [];
  } catch (error) {
    console.error(`Error fetching NiFi templates: ${error.message}`);
    return [];
  }
};

/**
 * Clone (instantiate) a NiFi template to create a new process group (PG).
 * Uses the real NiFi API:
 *  - POST /nifi-api/process-groups/{parentGroupId}/template-instance
 *  - Then, PUT /nifi-api/flow/process-groups/{newPgId}/state to start it.
 *
 * Returns the new process group ID.
 */
exports.cloneNifiTemplate = async (templateId) => {
  try {
    // Use the root process group ("root") as the parent.
    const parentGroupId = 'root';
    // Instantiate the template in the parent group.
    const instanceResp = await axios.post(`${NIFI_BASE_URL}/process-groups/${parentGroupId}/template-instance`, {
      templateId,
      originX: 0,
      originY: 0
    });
    
    // Validate response and extract the new process group ID.
    if (
      !instanceResp.data ||
      !instanceResp.data.snippet ||
      !instanceResp.data.snippet.processGroups ||
      instanceResp.data.snippet.processGroups.length === 0
    ) {
      throw new Error('No process groups returned from template instance response');
    }
    
    const newPgId = instanceResp.data.snippet.processGroups[0].id;
    console.log(`[NiFi] New process group created: ${newPgId}`);
    
    // Start the new process group by updating its state to RUNNING.
    const stateUrl =`${NIFI_BASE_URL}/flow/process-groups/${newPgId}/state`;
    await axios.put(stateUrl, { state: 'RUNNING' });
    console.log(`[NiFi] Process group ${newPgId} is now RUNNING`);
    
    return newPgId;
  } catch (error) {
    console.error(`Error cloning NiFi template: ${error.message}`);
    throw error;
  }
};

/**
 * Fallback: Create a minimal NiFi template dynamically.
 * In a production scenario, you might upload a template file via NiFi's REST API
 * (POST to /nifi-api/process-groups/{parentId}/templates/upload).
 * For now, this function is a stub that logs and returns a generated minimal template ID.
 */
exports.createMinimalKafkaNiFiTemplate = async (templateName) => {
  try {
    console.log(`No matching NiFi template found for "${templateName}". Creating a minimal template...`);
    // Here you would normally upload a template file to NiFi.
    // For now, we simulate it by returning a generated minimal template ID.
    return `minimal-template-id-${templateName}`;
  } catch (error) {
    console.error(`Error creating minimal Kafka NiFi template: ${error.message}`);
    throw error;
  }
};