// utils/nifi.js

/**
 * Dummy implementation of NiFi utilities for dummy mode.
 * These functions simulate interactions with a NiFi instance without making real HTTP calls.
 */

/**
 * Simulates creating a minimal Kafka NiFi template.
 * Returns a dummy template ID based on the provided template name.
 *
 * @param {string} templateName - The name for the template.
 * @returns {Promise<string>} - A promise that resolves to a dummy template ID.
 */
exports.createMinimalKafkaNiFiTemplate = async (templateName) => {
  return new Promise((resolve) => {
    // Simulate a delay for creating the template.
    setTimeout(() => {
      const dummyTemplateId = `dummy-minimal-template-id-${templateName}-${Date.now()}`;
      console.log(`[NiFi] Dummy minimal template created: ${dummyTemplateId}`);
      resolve(dummyTemplateId);
    }, 500); // 500ms delay
  });
};

/**
 * Simulates cloning a NiFi template to create a new process group.
 * Returns a dummy process group ID.
 *
 * @param {string} templateId - The dummy template ID.
 * @returns {Promise<string>} - A promise that resolves to a dummy process group ID.
 */
exports.cloneNifiTemplate = async (templateId) => {
  return new Promise((resolve) => {
    // Simulate a delay for cloning the template.
    setTimeout(() => {
      const dummyProcessGroupId = `dummy-${Date.now()}`;
      console.log(`[NiFi] Dummy process group cloned from template ${templateId}: ${dummyProcessGroupId}`);
      resolve(dummyProcessGroupId);
    }, 500); // 500ms delay
  });
};
