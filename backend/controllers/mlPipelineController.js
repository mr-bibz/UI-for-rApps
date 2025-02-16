// controllers/mlPipelineController.js
const axios = require('axios');
const { exec } = require('child_process');
const { NIFI_BASE_URL, SPARK_MASTER } = require('../config');
const MLModel = require('../models/MLModel');
const PipelineDefinition = require('../models/PipelineDefinition');
const { getKafkaProducer } = require('../utils/kafka');

// Import NiFi utility functions
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
const pipelineRuns = {}; // e.g., pipelineRuns[pipelineId] = { processGroupId, kafkaTopic, status, modelId }

exports.createPipelineDefinition = async (req, res) => {
  try {
    console.log('[createPipelineDefinition] req.body:', req.body);
    console.log('[createPipelineDefinition] req.file:', req.file);

    // Destructure values from req.body and set a default for template if missing.
    const { name, template } = req.body;
    const templateUsed = template || 'default';

    if (!name) {
      return res.status(400).json({ error: 'Pipeline name is required.' });
    }

    // Log the file info if provided.
    if (req.file) {
      console.log(`Dataset file received: ${req.file.path}`);
    }

    // Attempt to fetch available NiFi templates.
    const availableTemplates = await fetchAvailableTemplates();
    let matchingTemplate = availableTemplates.find(tpl =>
      tpl.template.name.toLowerCase().includes(templateUsed.toLowerCase())
    );
    let templateId;
    if (matchingTemplate) {
      templateId = matchingTemplate.id;
      console.log(`Found NiFi template for "${templateUsed}": ${templateId}`);
    } else {
      // If no matching template is found, create a minimal one.
      templateId = await createMinimalKafkaNiFiTemplate(templateUsed);
      console.log(`Created minimal NiFi template for "${templateUsed}": ${templateId}`);
    }

    // Clone the selected (or minimal) NiFi template to create a new process group.
    // For testing, you can use a dummy value instead by uncommenting the next two lines:
    // console.log([NiFi] Dummy clone of template ${templateId});
    // const newPgId = dummy-pg-id-${templateId};

    const newPgId = await cloneNifiTemplate(templateId);
    console.log(`New NiFi process group ID: ${newPgId}`);
    // Continue with the rest of your pipeline creation logic:
    // For example, generate a Kafka topic and Spark job identifier.
    const pipelineData = {
      name,
      template: templateUsed,
      nifiFlow: newPgId,
      kafkaTopic: `${templateUsed}-topic-${Date.now()}`,
      sparkJob: `${templateUsed}-spark-job`,
      status: 'inactive',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    let newPipeline = new PipelineDefinition(pipelineData);
    let savedPipeline = await newPipeline.save();

    // Optionally, further orchestration (e.g., creating Kafka topics, triggering Spark job) can be added here.

    res.status(201).json(savedPipeline);
  } catch (error) {
    console.error('Error creating pipeline definition:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.runPipeline = async (req, res) => {
  const { pipelineId, processGroupId, kafkaTopic, modelName, version } = req.body;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required' });
  }
  try {
    if (processGroupId) {
      await axios.put(`${NIFI_BASE_URL}/flow/process-groups/${processGroupId}`, {
        id: processGroupId,
        state: 'RUNNING'
      });
      console.log(`[NiFi] Flow Started => PG=${processGroupId}`);
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
    // Trigger Spark job (using a dummy command or real logic)
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

exports.getPipelineStatus = (req, res) => {
  const { pipelineId } = req.params;
  const run = pipelineRuns[pipelineId];
  if (!run) {
    return res.status(404).json({ error: 'No pipeline found for that ID' });
  }
  res.json({ pipelineId, status: run.status, modelId: run.modelId || null });
};