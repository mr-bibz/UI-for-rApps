const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { NIFI_BASE_URL } = require('.backend/config/index'); // Ensure this points to your NiFi API base URL, e.g., 'http://localhost:8080/nifi-api'

/**
 * Uploads a single NiFi template.
 * @param {string} templatePath - The local file path to the XML template.
 * @returns {Promise<object>} - The JSON response from NiFi.
 */
async function uploadTemplate(templatePath) {
  const form = new FormData();
  // The field name expected by NiFi is "template"
  form.append('template', fs.createReadStream(templatePath));

  // The upload endpoint uses the root process group as the parent.
  const url = `${NIFI_BASE_URL}/process-groups/root/templates/upload`;
  console.log(`Uploading template from: ${templatePath}`);
  try {
    const response = await axios.post(url, form, {
      headers: form.getHeaders()
    });
    console.log(`Successfully uploaded template from ${templatePath}`);
    return response.data;
  } catch (error) {
    console.error(`Error uploading template ${templatePath}:`, error.message);
    throw error;
  }
}

/**
 * Uploads all predefined templates.
 */
async function uploadAllTemplates() {
  const templates = [
    { name: 'default', file: 'default_template.xml' },
    { name: 'qos', file: 'qos_template.xml' },
    { name: 'anomaly', file: 'anomaly_template.xml' }
  ];

  for (const template of templates) {
    const templatePath = path.join(__dirname, 'templates', template.file);
    try {
      const data = await uploadTemplate(templatePath);
      console.log(`Template "${template.name}" uploaded. Returned Template ID: ${data.template ? data.template.id : 'N/A'}`);
    } catch (error) {
        console.error(`Failed to upload template "${template.name}":`, error.message);
    }
  }
}

uploadAllTemplates()
  .then(() => console.log('All templates processed.'))
  .catch((error) => console.error('Error during template uploads:', error));
