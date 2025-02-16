// utils/nifi.js
const axios = require('axios');
const { NIFI_BASE_URL } = require('../config');

/**
 * Fetch available templates from NiFi.
 * Returns an array of templates.
 */
exports.fetchAvailableTemplates = async () => {
  try {
    const response = await axios.get(`${NIFI_BASE_URL}/flow/templates`);
    // NiFi returns a JSON with a "templates" array
    return response.data.templates || [];
  } catch (error) {
    console.error('Error fetching NiFi templates:', error.message);
    return [];
  }
};

/**
 * Fallback: Create a minimal NiFi template dynamically.
 * In a real-world scenario, you might upload a template file.
 * Here we simply simulate the creation and return a dummy template ID.
 */
exports.createMinimalKafkaNiFiTemplate = async (templateName) => {
  console.log(`No matching NiFi template found for "${templateName}". Creating a minimal template...`);
  // Simulate by returning a generated ID (in a real system, use NiFi API to create and get the template ID)
  return `minimal-template-id-${templateName}`;
};

/**
 * Clone a NiFi template to instantiate a new process group (PG).
 * It then starts the new process group and returns its ID.
 */
exports.cloneNifiTemplate = async (templateId) => {
  try {
    // Use "root" as the parent process group (adjust if necessary)
    const rootPG = 'root';
    const instanceResp = await axios.post(
      `${NIFI_BASE_URL}/process-groups/${rootPG}/template-instance`,
      {
        templateId,
        originX: 0,
        originY: 0
      }
    );
    // Extract the new process group ID from the response
    const newPgId = instanceResp.data.snippet.processGroups[0].id;
    console.log('[NiFi] New process group created: ${newPgId}');
    
    // Start the new process group by setting its state to RUNNING
    await axios.put(`${NIFI_BASE_URL}/flow/process-groups/${newPgId}` , {
      id: newPgId,
      state: 'RUNNING'
    });
    console.log(`[NiFi] Process group ${newPgId} is now RUNNING`);
    return newPgId;
  } catch (error) {
    console.error('Error cloning NiFi template:', error.message);
    throw error;
  }
};
