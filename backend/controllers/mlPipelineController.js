// controllers/mlPipelineController.js
const axios = require('axios');
const { exec } = require('child_process');
const { NIFI_BASE_URL, SPARK_MASTER } = require('../config');
const MLModel = require('../models/MLModel');
const PipelineDefinition = require('../models/PipelineDefinition');
const { getKafkaProducer } = require('../utils/kafka');

// Import NiFi utility functions (ensure these exist in backend/utils/nifi.js)
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
    // We ignore req.file because we're not using file upload in this manual configuration.
    
    const { name, template } = req.body;
    // Use 'default' if template is missing
    const templateUsed = template || 'default';

    if (!name) {
      return res.status(400).json({ error: 'Pipeline name is required.' });
    }

    // Define default configurations for each template type
    const templateConfigs = {
      default: {
        nifiFlow: 'nifi-flow-default', // These are dummy values. Replace with real API calls as needed.
        kafkaTopic: `default-topic-${Date.now()}`,
        sparkJob: `default-spark-job`
      },
      'qos-optimization': {
        nifiFlow: 'nifi-flow-qos',
        kafkaTopic: `qos-topic-${Date.now()}`,
        sparkJob: `qos-spark-job`
      },
      'anomaly-detection': {
        nifiFlow: 'nifi-flow-anomaly',
        kafkaTopic: `anomaly-topic-${Date.now()}`,
        sparkJob: `anomaly-spark-job`
      }
    };
    const config = templateConfigs[templateUsed] || templateConfigs['default'];

    // Attempt to fetch available NiFi templates from NiFi (dummy implementation may return an empty array)
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
    // For testing purposes, you may temporarily use a dummy clone:
    // const newPgId = dummy-pg-id-${templateId};

    const newPgId = await cloneNifiTemplate(templateId);
    console.log(`New NiFi process group ID: ${newPgId}`);
    // Construct the pipeline definition with automatically generated values.
    const pipelineData = {
      name,
      template: templateUsed,
      nifiFlow: newPgId,
      kafkaTopic: config.kafkaTopic,
      sparkJob: config.sparkJob,
      status: 'inactive',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastRun: null
    };

    const newPipeline = new PipelineDefinition(pipelineData);
    const savedPipeline = await newPipeline.save();

    console.log('[createPipelineDefinition] Pipeline created:', savedPipeline);
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
      await axios.put(`${NIFI_BASE_URL}/flow/process-groups/${processGroupId}` , {
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
    // Trigger Spark job (dummy command for now)
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
