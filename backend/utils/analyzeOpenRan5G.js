// utils/analyzeOpenRan5G.js

const fs = require('fs');
const csv = require('csv-parser');

/**
 * analyzeOpenRan5G(filePath)
 * 
 * Assumes each row has:
 *   - timestamp (string), e.g. "2025-02-24 14:00:00"
 *   - tbs_sum (number)
 * 
 * Steps:
 *   1. Read all rows and store them (timestamp, tbs_sum).
 *   2. Sort by timestamp ascending.
 *   3. For each consecutive pair of rows, compute deltaT (seconds) & deltaTbs => throughput.
 *   4. Calculate average throughput, total load, an approximate "latency", and a count of bottlenecks if throughput > 100 Mbps (example threshold).
 * Returns:
 *   {
 *     totalRecords,
 *     totalLoad,            // sum of all tbs_sum
 *     avgThroughput,        // in Mb/s
 *     minThroughput,
 *     maxThroughput,
 *     approxLatency,        // dummy approach
 *     bottleneckCount,      // how many intervals surpass 100 Mb/s
 *     intervals: [ {
 *       timestampStart,
 *       timestampEnd,
 *       deltaT,             // in seconds
 *       throughput,         // in Mb/s
 *       latency,            // dummy approach
 *       bottleneck: boolean
 *     }, ... ]
 *   }
 */
async function analyzeOpenRan5G(filePath) {
  return new Promise((resolve, reject) => {
    let rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        let ts = new Date(row.timestamp).getTime();
        let tbsSum = parseFloat(row.tbs_sum) || 0;
        if (!isNaN(ts)) {
          rows.push({ ts, tbsSum });
        }
      })
      .on('end', () => {
        // Sort rows by timestamp ascending
        rows.sort((a, b) => a.ts - b.ts);

        if (rows.length < 2) {
          return resolve({
            totalRecords: rows.length,
            message: 'Not enough data points to compute throughput.'
          });
        }

        let totalRecords = rows.length;
        let totalLoad = 0; // sum of tbs_sum across all rows
        rows.forEach(r => { totalLoad += r.tbsSum; });

        // We'll compute intervals throughput
        let intervals = [];
        let sumThroughput = 0;
        let throughputCount = 0;

        let minThroughput = Infinity;
        let maxThroughput = -Infinity;
        let bottleneckCount = 0;

        for (let i = 0; i < rows.length - 1; i++) {
          let start = rows[i];
          let end = rows[i+1];

          // deltaT in seconds
          let deltaT = (end.ts - start.ts) / 1000; 
          if (deltaT <= 0) continue; // no forward progress in time => skip

          // deltaTbs in "bits"
          // Often, tbs_sum might be in bits or bytes. Let's assume "bits" for example.
          // If tbs_sum is in bytes, you'd convert to bits by multiplying by 8.
          let deltaTbs = end.tbsSum - start.tbsSum;
          if (deltaTbs < 0) deltaTbs = 0; // no negative

          // throughput in bits/sec => convert to Mb/s
          let throughputBps = deltaTbs / deltaT;
          let throughputMbps = throughputBps / (10 ** 6);

          // approximate latency (dummy logic):
          // e.g. latency = 1 / (throughputMbps + 1), purely heuristic
          let latency = 1 / (throughputMbps + 1);

          // Check if bottleneck (throughput > 100 Mbps threshold)
          let isBottleneck = throughputMbps > 100;
          if (isBottleneck) bottleneckCount++;

          // track stats
          if (throughputMbps > maxThroughput) maxThroughput = throughputMbps;
          if (throughputMbps < minThroughput) minThroughput = throughputMbps;
          sumThroughput += throughputMbps;
          throughputCount++;

          intervals.push({
            timestampStart: new Date(start.ts).toISOString(),
            timestampEnd: new Date(end.ts).toISOString(),
            deltaT,
            throughput: throughputMbps,
            latency,
            bottleneck: isBottleneck
          });
        }

        let avgThroughput = 0;
        if (throughputCount > 0) {
          avgThroughput = sumThroughput / throughputCount;
        }
        if (minThroughput === Infinity) minThroughput = 0;
        if (maxThroughput === -Infinity) maxThroughput = 0;

        // Final analysis object
        resolve({
          totalRecords,
          totalLoad,            // sum of tbs_sum across entire CSV
          avgThroughput,
          minThroughput,
          maxThroughput,
          approxLatency: 1 / (avgThroughput + 1), // dummy
          bottleneckCount,
          intervals
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

module.exports = analyzeOpenRan5G;