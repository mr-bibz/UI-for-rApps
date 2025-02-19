const axios = require('axios');
const { NIFI_BASE_URL } = require('../config');

/**
 * Fetch available templates from NiFi.
 * Uses the endpoint GET {NIFI_BASE_URL}/templates.
 * Returns an array of template objects.
 */
exports.fetchAvailableTemplates = async () => {
  try {
    const response = await axios.get(`${NIFI_BASE_URL}/templates`);
     // NiFi returns an object with a "templates" property.
     return response.data.templates || [];
    } catch (error) {
      console.error(`Error fetching NiFi templates: ${error.message}`);
      return [];
  }
};

/**
 * Clone (instantiate) a NiFi template to create a new process group (PG).
 * Uses the real NiFi API:
 *   - POST {NIFI_BASE_URL}/process-groups/root/template-instance to instantiate the template.
 *   - PUT {NIFI_BASE_URL}/flow/process-groups/{newPgId}/state to set the state to RUNNING.
 *
 * @param {string} templateId - The ID of the template to clone.
 * @returns {Promise<string>} - The new process group ID.
 */
exports.cloneNifiTemplate = async (templateId) => {
  try {
    const parentGroupId = 'root';
    // Instantiate the template within the root process group.
    const instanceResp = await axios.post(
      `${NIFI_BASE_URL}/process-groups/${parentGroupId}/template-instance`,
      {
        templateId,
        originX: 0,
        originY: 0
      }
    );
    
    // Validate the response and extract the new process group ID.
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
    const stateUrl = `${NIFI_BASE_URL}/flow/process-groups/${newPgId}/state`;
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
 * In production you might upload a template file via the REST API.
 * For now, this stub simulates minimal template creation by returning a generated ID.
 *
 * @param {string} templateName - The name of the desired template.
 * @returns {Promise<string>} - A generated minimal template ID.
 */
exports.createMinimalKafkaNiFiTemplate = async (templateName) => {
  try {
    console.log(`No matching NiFi template found for "${templateName}". Creating a minimal template...`);
     // Simulate minimal template creation by generating an ID.
     return `minimal-template-id-${templateName}`;
    } catch (error) {
      console.error(`Error creating minimal Kafka NiFi template: ${error.message}`);
      throw error;
    }
  };