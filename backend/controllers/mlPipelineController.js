// controllers/mlPipelineController.js
const axios = require('axios');
const { exec } = require('child_process');
const { NIFI_BASE_URL, SPARK_MASTER } = require('../config');
const MLModel = require('../models/MLModel');
const PipelineDefinition = require('../models/PipelineDefinition');
const { getKafkaProducer } = require('../utils/kafka');

// No longer need fetchAvailableTemplates, createMinimalKafkaNiFiTemplate, cloneNifiTemplate
// if we're purely generating random IDs. We'll comment them out:
// const { 
//   fetchAvailableTemplates, 
//   createMinimalKafkaNiFiTemplate, 
//   cloneNifiTemplate 
// } = require('../utils/nifi');

// Utility to run spark-submit commands
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

// In-memory pipeline run state
const pipelineRuns = {};

// 1) Map each template to a generator function
// so that each template can produce a random NiFi ID each time
const templateIdGenerators = {
  default: () => generateRandomTemplateId('default'),
  qos: () => generateRandomTemplateId('qos'),
  anomaly: () => generateRandomTemplateId('anomaly')
};

/**
 * A helper to produce a random NiFi template ID each time.
 * e.g. "nifi-default-1677275790826-u3kzv"
 */
function generateRandomTemplateId(templateName) {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 7); // e.g. "u3kzv"
  return `nifi-${templateName}-${timestamp}-${randomPart}`;
}

exports.createPipelineDefinition = async (req, res) => {
  try {
    console.log('[createPipelineDefinition] req.body:', req.body);
    
    const { name, template } = req.body;
    const templateUsed = template || 'default';
    if (!name) {
      return res.status(400).json({ error: 'Pipeline name is required.' });
    }

    console.log(`Creating pipeline "${name}" with template "${templateUsed}"`);
     
    // 2) If user picks template not in our map, default to 'default'
     const generatorFn = templateIdGenerators[templateUsed] || templateIdGenerators['default'];
     const nifiFlowId = generatorFn();
     console.log(`[MLPipeline] Generated NiFi flow ID: ${nifiFlowId}`);

     // 3) Build the pipeline data
    const pipelineData = {
      name,
      template: templateUsed,
      nifiFlow: nifiFlowId,                // <-- random NiFi ID
      kafkaTopic: `${templateUsed}-topic-${Date.now()}`,
      sparkJob: `${templateUsed}-spark-job`,
      status: 'inactive',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastRun: null
    };

    // 4) Store in MongoDB
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
 * We leave runPipeline, nifiCallback, getPipelineStatus unchanged,
 * except that you no longer need to check or skip "dummy-"
 * unless you still want to bypass real NiFi calls in runPipeline.
 */
exports.runPipeline = async (req, res) => {
  const { pipelineId, processGroupId, kafkaTopic, modelName, version } = req.body;
  console.log(`runPipeline called with NIFI_BASE_URL: ${NIFI_BASE_URL}`);
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required' });
  }
  try {
    if (processGroupId) {
      // If you'd like to bypass NiFi calls for random IDs, keep or remove as needed
      // e.g. if (processGroupId.startsWith('nifi-')) { ... } else { ... }
      await axios.put(`${NIFI_BASE_URL}/flow/process-groups/${processGroupId}`, {
        id: processGroupId,
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
     
    // Trigger Spark job (dummy or real)
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