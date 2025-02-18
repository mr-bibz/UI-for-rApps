const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { NIFI_BASE_URL } = require('./backend/config'); // Adjust path if needed

// Parse the XML response and extract the template ID
async function parseTemplateId(xmlString) {
  const parser = new xml2js.Parser();
  try {
    const result = await parser.parseStringPromise(xmlString);
    // The expected structure is:
    // result.templateEntity.template[0].id[0]
    if (
      result &&
      result.templateEntity &&
      result.templateEntity.template &&
      result.templateEntity.template[0].id &&
      result.templateEntity.template[0].id[0]
    ) {
      return result.templateEntity.template[0].id[0];
    } else {
      return null;
    }
  } catch (err) {
    console.error("Error parsing XML:", err.message);
    return null;
  }
}

// Upload a single template file
async function uploadTemplate(templatePath) {
  const form = new FormData();
  // 'template' is the field name expected by NiFi
  form.append('template', fs.createReadStream(templatePath));

  // The upload endpoint uses the root process group as the parent.
  const url = `${NIFI_BASE_URL}/process-groups/root/templates/upload`;
  console.log(`Uploading template from: ${templatePath}`);
  try {
    // Expecting a text response (XML)
    const response = await axios.post(url, form, {
      headers: form.getHeaders(),
      responseType: 'text'
    });
    console.log(`Successfully uploaded template from ${templatePath}`);
    console.log("Full response:", response.data);
    
    const templateId = await parseTemplateId(response.data);
    return { id: templateId, raw: response.data };
  } catch (error) {
    console.error(`Error uploading template ${templatePath}:`, error.message);
    throw error;
  }
}

// Upload all predefined templates
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
      console.log(`Template "${template.name}" uploaded. Returned Template ID: ${data.id || 'N/A'}`);
    } catch (error) {
        console.error(`Failed to upload template "${template.name}":`, error.message);
    }
  }
}

uploadAllTemplates()
  .then(() => console.log('All templates processed.'))
  .catch((error) => console.error('Error during template uploads:', error));