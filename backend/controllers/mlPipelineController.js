// controllers/mlPipelineController.js

const axios = require('axios');
const { exec } = require('child_process');
const { NIFI_BASE_URL, SPARK_MASTER } = require('../config');
const MLModel = require('../models/MLModel');
const PipelineDefinition = require('../models/PipelineDefinition');
const { getKafkaProducer } = require('../utils/kafka');

// Import real NiFi utility functions
const {
  fetchAvailableTemplates,
  createMinimalKafkaNiFiTemplate,
  cloneNifiTemplate
} = require('../utils/nifi');

// Utility to run spark-submit commands
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

// In-memory pipeline run state (for tracking ongoing runs)
const pipelineRuns = {};

/**
 * Create a new pipeline definition.
 * Uses the real NiFi API to instantiate (clone) a template based on the selected template.
 * Expected input (from the UI): { name: "My Pipeline", template: "qos" }
 */
exports.createPipelineDefinition = async (req, res) => {
  try {
    console.log('[createPipelineDefinition] req.body:', req.body);
    
    const { name, template } = req.body;
    // Normalize the selected template; default to 'default'
    const selectedTemplate = template ? template.toLowerCase() : 'default';
    
    if (!name) {
      return res.status(400).json({ error: 'Pipeline name is required.' });
    }
    
    console.log(`Creating pipeline "${name}" with template "${selectedTemplate}"`);
     // 1. Fetch available NiFi templates from the real API.
     const availableTemplates = await fetchAvailableTemplates();
    
     // 2. Look for a matching template by name (case-insensitive).
     let matchingTemplate = availableTemplates.find(tpl =>
       tpl.template.name.toLowerCase().includes(selectedTemplate)
     );
     
     let templateId;
     if (matchingTemplate) {
       // Extract the template ID from the nested object
       templateId = matchingTemplate.template.id;
       console.log(`Found NiFi template for "${selectedTemplate}": ${templateId}`);
      } else {
        // 3. Fallback: Create a minimal NiFi template (stub for now)
        templateId = await createMinimalKafkaNiFiTemplate(selectedTemplate);
        console.log(`Created minimal NiFi template for "${selectedTemplate}": ${templateId}`);
      }
    
      // 4. Clone (instantiate) the chosen template to create a real process group.
      //    This function calls:
      //      POST /nifi-api/process-groups/root/template-instance
      //    and then starts the new process group via:
      //      PUT /nifi-api/flow/process-groups/{newPgId}/state with { state: "RUNNING" }.
      const newPgId = await cloneNifiTemplate(templateId);
      console.log(`[MLPipeline] Real NiFi flow ID obtained: ${newPgId}`);
      // 5. Build the pipeline document with the real NiFi flow ID.
    const pipelineData = {
      name,
      template: selectedTemplate,
      nifiFlow: newPgId,                // Real NiFi process group ID
      kafkaTopic: `${selectedTemplate}-topic-${Date.now()}`,
      sparkJob: `${selectedTemplate}-spark-job`,
      status: 'inactive',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastRun: null
    };

    // 6. Store in MongoDB.
    const newPipeline = new PipelineDefinition(pipelineData);
    const savedPipeline = await newPipeline.save();
    
    console.log('[createPipelineDefinition] Pipeline created:', savedPipeline);
    res.status(201).json(savedPipeline);
    
  } catch (error) {
    console.error('Error creating pipeline definition:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Run the pipeline:
 * - Start the NiFi flow by sending a PUT request to the NiFi API.
 * - Produce a Kafka message to initiate data ingestion.
 */
exports.runPipeline = async (req, res) => {
  const { pipelineId, processGroupId, kafkaTopic, modelName, version } = req.body;
  console.log(`runPipeline called with NIFI_BASE_URL: ${NIFI_BASE_URL}`);
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required' });
  }
  try {
    if (processGroupId) {
      // Call the real NiFi API to update process group state to RUNNING.
      await axios.put(`${NIFI_BASE_URL}/flow/process-groups/${processGroupId}/state`, {
        state: 'RUNNING'
      });
      console.log(`[NiFi] Flow started => PG=${processGroupId}`);
    }
    if (kafkaTopic) {
      const producer = await getKafkaProducer();
      await producer.send({
        topic: kafkaTopic,
        messages: [{ value: 'Starting data ingestion for pipeline...' }]
      });
      console.log(`[Kafka] Produced message to ${kafkaTopic}`);
    }
    pipelineRuns[pipelineId] = {
      processGroupId,
      kafkaTopic,
      modelName,
      version,
      status: 'NiFi flow started'
    };
    res.json({
      success: true,
      message: 'Pipeline run initiated. NiFi will callback once ingestion completes.',
      pipelineId
    });
  } catch (error) {
    console.error('[Pipeline] runPipeline error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * NiFi Callback (triggered by NiFi when ingestion completes) to then trigger a Spark job.
 */
exports.nifiCallback = async (req, res) => {
  const { pipelineId } = req.body;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required in NiFi callback' });
  }
  const run = pipelineRuns[pipelineId];
  if (!run) {
    return res.status(404).json({ error: 'No pipeline run found for that pipelineId' });
  }
  try {
    run.status = 'NiFi ingestion complete';
    console.log(`[NiFi Callback] pipelineId=${pipelineId} => ingestion done`);

    // Trigger Spark job (using local spark-submit command)
    const { modelName, version } = run;
    const sparkCmd = `spark-submit --master ${SPARK_MASTER} /usr/src/app/jobs/train_model.py --modelName ${modelName} --version ${version}`;
    const sparkResult = await runCommand(sparkCmd);
    console.log('[Spark] logs:', sparkResult.stdout);
    
    // Simulate storing an ML model in MongoDB
    const accuracy = 0.95;
    const artifactPath = `/usr/src/app/models/${modelName}_${version}`;
    const newModel = await MLModel.create({
      name: modelName,
      version,
      accuracy,
      artifactPath
    });
    
    run.status = 'Spark job complete';
    run.modelId = newModel._id;
    console.log('[MLPipeline] Model stored =>', newModel._id);
    
    res.json({
      success: true,
      pipelineId,
      sparkLogs: sparkResult.stdout,
      modelId: newModel._id
    });
  } catch (error) {
    console.error('[NiFi Callback] spark job error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Retrieve the status of a pipeline run.
 */
exports.getPipelineStatus = (req, res) => {
  const { pipelineId } = req.params;
  const run = pipelineRuns[pipelineId];
  if (!run) {
    return res.status(404).json({ error: 'No pipeline found for that ID' });
  }
  res.json({ pipelineId, status: run.status, modelId: run.modelId || null });
};
