// controllers/mlPipelineController.js

const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const PipelineDefinition = require('../models/PipelineDefinition');

/**
 * createPipelineDefinition
 * Expects a pipeline name (req.body.name) and a CSV file (req.file).
 * Saves the pipeline doc in MongoDB with reference to the uploaded CSV path.
 */
exports.createPipelineDefinition = async (req, res) => {
  try {
    const { name } = req.body;
    const datasetFile = req.file; // from multer

    if (!name || !datasetFile) {
      return res.status(400).json({ error: 'Pipeline name and dataset file are required.' });
    }

    const datasetPath = datasetFile.path; // e.g., "uploads/1677624485000-sample.csv"
    console.log(`[createPipelineDefinition] Creating pipeline "${name}" with dataset "${datasetPath}"`);
    const pipelineData = {
      name,
      dataset: datasetPath,
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
    console.error('[createPipelineDefinition] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * processDataset
 * Reads the pipeline's CSV file, logs each parsed row ("Parsed row: {...}"),
 * computes throughput analysis, logs the final result as ("Analysis Result: {...}"),
 * and saves it to the pipeline document.
 */
exports.processDataset = async (req, res) => {
  const { pipelineId } = req.params;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required.' });
  }

  try {
    // 1) Fetch pipeline from DB
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found.' });
    }

    console.log(`[processDataset] Analyzing CSV for pipeline ${pipelineId}`);

    const datasetFilePath = path.join(__dirname, '..', pipeline.dataset);
    console.log('[processDataset] Using dataset file at:', datasetFilePath);

    // 2) Parse the CSV and compute analysis
    const analysis = await new Promise((resolve, reject) => {
      const rows = [];

      fs.createReadStream(datasetFilePath)
        .pipe(csv()) // Using the default comma delimiter
        .on('data', (row) => {
          // Exactly like your local script: log each parsed row
          console.log('Parsed row:', row);

          const rawTs = (row.timestamp || "").trim();
          let tsInt = parseInt(rawTs, 10);

          // If exactly 10 digits, treat as seconds -> convert to ms
          if (!isNaN(tsInt)) {
            if (rawTs.length === 10) {
              tsInt *= 1000;
            }
            const tbsSum = parseFloat(row.tbs_sum) || 0;
            rows.push({ ts: tsInt, tbsSum });
          }
        })
        .on('end', () => {
          // Compute final analysis once CSV is fully read
          rows.sort((a, b) => a.ts - b.ts);

          if (rows.length < 2) {
            const result = {
              totalRecords: rows.length,
              message: 'Not enough data points to compute throughput.'
            };
            console.log('Analysis Result:', result);
            return resolve(result);
          }

          const totalRecords = rows.length;
          const totalLoad = rows.reduce((acc, r) => acc + r.tbsSum, 0);

          let sumThroughput = 0;
          let throughputCount = 0;
          let minThroughput = Infinity;
          let maxThroughput = -Infinity;
          let bottleneckCount = 0;

          for (let i = 0; i < rows.length - 1; i++) {
            const start = rows[i];
            const end = rows[i + 1];
            const deltaT = (end.ts - start.ts) / 1000; // seconds
            if (deltaT <= 0) continue;

            let deltaTbs = end.tbsSum - start.tbsSum;
            if (deltaTbs < 0) deltaTbs = 0;

            const throughputBps = deltaTbs / deltaT;
            const throughputMbps = throughputBps / 1e6;

            if (throughputMbps < minThroughput) minThroughput = throughputMbps;
            if (throughputMbps > maxThroughput) maxThroughput = throughputMbps;
            sumThroughput += throughputMbps;
            throughputCount++;

            if (throughputMbps > 100) {
              bottleneckCount++;
            }
          }

          const avgThroughput = throughputCount > 0 ? sumThroughput / throughputCount : 0;
          if (minThroughput === Infinity) minThroughput = 0;
          if (maxThroughput === -Infinity) maxThroughput = 0;
          const approxLatency = 1 / (avgThroughput + 1);

          const finalResult = {
            totalRecords,
            totalLoad,
            avgThroughput,
            minThroughput,
            maxThroughput,
            approxLatency,
            bottleneckCount
          };

          // Log final analysis result
          console.log('Analysis Result:', finalResult);
          resolve(finalResult);
        })
        .on('error', (err) => reject(err));
    });

    // 3) Save the analysis to pipeline doc
    pipeline.openRanAnalysis = analysis;
    pipeline.status = 'processing';
    pipeline.updatedAt = new Date();
    await pipeline.save();

    // 4) Respond with the analysis if needed
    res.json({
      success: true,
      message: 'OpenRAN TBS dataset processed. Check container logs for full row-by-row details!',
      pipelineId,
      openRanAnalysis: analysis
    });
  } catch (error) {
    console.error('[processDataset] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * getPipelineStatus
 * GET /api/pipelines/:pipelineId/status
 * => Returns pipeline doc with openRanAnalysis
 */
exports.getPipelineStatus = async (req, res) => {
  const { pipelineId } = req.params;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required.' });
  }

  try {
    const pipeline = await PipelineDefinition.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'No pipeline found for that ID.' });
    }

    res.json({
      pipelineId,
      status: pipeline.status,
      openRanAnalysis: pipeline.openRanAnalysis || null
    });
  } catch (error) {
    console.error('[getPipelineStatus] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};