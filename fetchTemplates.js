// fetchTemplates.js
const axios = require('axios');
// Adjust the path so that it points to your config file in backend/config/index.js
const { NIFI_BASE_URL } = require('./backend/config');

async function fetchAndReturnTemplates() {
  try {
    // Attempt to fetch templates from the /flow/templates endpoint.
    // (If this endpoint doesn't work for your NiFi version, try changing it to /templates)
    const response = await axios.get(`${NIFI_BASE_URL}/flow/templates`);
    // Log the entire response (or at least the templates portion) for inspection.
    console.log("Fetched Templates:", JSON.stringify(response.data.templates, null, 2));
    // Return the templates array (or an empty array if none)
    return response.data.templates || [];
  } catch (error) {
    console.error("Error fetching templates:", error.message);
    return [];
  }
}

// Execute the function when this script is run.
fetchAndReturnTemplates();