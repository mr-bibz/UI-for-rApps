// controllers/mlPipelineController.js
const axios = require('axios');
const { exec } = require('child_process');
const { NIFI_BASE_URL, SPARK_MASTER } = require('../config');
const MLModel = require('../models/MLModel');
const PipelineDefinition = require('../models/PipelineDefinition');
const { getKafkaProducer } = require('../utils/kafka');

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

// ===========================
// Create Pipeline Definition
// ===========================
/**
 * Creates a new pipeline definition based on a user-provided name and dataset file.
 * The dataset file (if uploaded) is used as the input for NiFi processing.
 * The function:
 *  1. Retrieves available NiFi templates via NiFi REST API.
 *  2. Finds a matching template for the requested pipeline type (e.g., "simulated" or "real").
 *  3. If no matching template exists, creates a minimal NiFi template dynamically.
 *  4. Clones the chosen NiFi template (instantiates a new process group) and starts it.
 *  5. Defines a Kafka topic and Spark job based on the pipeline type and current timestamp.
 *  6. Saves the pipeline definition in MongoDB.
 *  7. Orchestrates additional steps: creates the Kafka topic and submits a Spark job.
 *  8. Updates the pipeline status to "running" and sets the lastRun timestamp.
 */
exports.createPipelineDefinition = async (req, res) => {
  try {
    console.log('[createPipelineDefinition] req.body:', req.body);
    console.log('[createPipelineDefinition] req.file:', req.file);

    const { name, template } = req.body;
    const templateUsed = template || 'default';

    if (!name ) {
      return res.status(400).json({ error: 'Pipeline name is required.' });
    }

    

    // If a dataset file was uploaded, capture its file path (or process its content as needed)
    let datasetFileInfo = null;
    if (req.file) {
      datasetFileInfo = req.file.path; // You might store more info (e.g., original name, size) if needed
      console.log('Dataset file recieved: ${datasetFileInfo}');
    }

    const availableTemplates = await fetchAvailableTemplates();
    let matchingTemplate = availableTemplates.find(tpl =>
      tpl.template.name.toLowerCase().includes(templateUsed.toLowerCase())
    );
    let templateId;
    if (matchingTemplate) {
      templateId = matchingTemplate.id;
      console.log(`Found NiFi template for "${templateUsed}": ${templateId}`);
    } else {
      templateId = await createMinimalKafkaNiFiTemplate(templateUsed);
      console.log(`Created minimal NiFi template for "${templateUsed}": ${templateId}`);
    }

    const newPgId = await cloneNifiTemplate(templateId);
    console.log(`New NiFi process group ID: ${newPgId}`);

    // 5. Define Kafka topic and Spark job based on the template and a timestamp
    const kafkaTopic = '${template}-topic-${Date.now()}';
    const sparkJob = '${template}-spark-job';

    // 6. Build the pipeline definition object.
    // You can also store datasetFileInfo here if you want to keep track of the imported dataset.
    const pipelineData = {
      name,
      template,
      nifiFlow: newPgId,  // Newly instantiated NiFi process group ID
      kafkaTopic,
      sparkJob,
      status: 'inactive',
      createdAt: new Date(),
      updatedAt: new Date(),
      // Optionally: datasetFile: datasetFileInfo
    };

    // 7. Save the pipeline definition in MongoDB
    let newPipeline = new PipelineDefinition(pipelineData);
    let savedPipeline = await newPipeline.save();

    // 8. Orchestrate additional steps:

    // a) Create or verify Kafka topic(s)
    const { createKafkaTopics } = require('../utils/kafka');
    await createKafkaTopics([kafkaTopic]);

    // b) Submit a Spark job for ML training/inference
    const { submitSparkJob } = require('../utils/spark');
    await submitSparkJob(sparkJob);

    // 9. Update the pipeline document to mark it as running and record the last run time
    savedPipeline.status = 'running';
    savedPipeline.lastRun = new Date();
    savedPipeline = await savedPipeline.save();

    res.status(201).json(savedPipeline);
  } catch (error) {
    console.error('Error creating pipeline definition:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ===========================
// Run Pipeline (Existing Endpoint)
// ===========================
exports.runPipeline = async (req, res) => {
  const { pipelineId, processGroupId, kafkaTopic, modelName, version } = req.body;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required' });
  }
  try {
    if (processGroupId) {
      await axios.put('${NIFI_BASE_URL}/flow/process-groups/${processGroupId}',  {
        id: processGroupId,
        state: 'RUNNING'
      });
      console.log('[Nifi] Flow Started => PG=${processGroupId}');
    }
    if (kafkaTopic) {
      const producer = await getKafkaProducer();
      await producer.send({
        topic: kafkaTopic,
        messages: [{ value: 'Starting data ingestion for pipeline...' }]
      });
      console.log('[Kafka] Produced message to ${kafkaTopic}');
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

// ===========================
// NiFi Callback Endpoint
// ===========================
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
    console.log('[NiFi Callback pipelineId=${pipelineId} => ingestion done');

    // Trigger Spark job via command-line (if not already triggered in createPipelineDefinition)
    const { modelName, version } = run;
    const sparkCmd = 'spark-submit --master ${SPARK_MASTER} /usr/src/app/jobs/train_model.py --modelName ${modelName} --version ${version}';
    const sparkResult = await runCommand(sparkCmd);
    console.log('[Spark] logs:', sparkResult.stdout);

    // Simulate storing an ML model in MongoDB
    const accuracy = 0.95;
    const artifactPath = '/usr/src/app/models/${modelName}_${version}';
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

// ===========================
// Get Pipeline Run Status
// ===========================
exports.getPipelineStatus = (req, res) => {
  const { pipelineId } = req.params;
  const run = pipelineRuns[pipelineId];
  if (!run) {
    return res.status(404).json({ error: 'No pipeline found for that ID' });
  }
  res.json({ pipelineId, status: run.status, modelId: run.modelId || null });
};