// utils/analyzeOpenRan5G.js

const fs = require('fs');
const csv = require('csv-parser');

/**
 * analyzeOpenRan5G(filePath)
 *
 * Reads a tab-delimited CSV file with exactly two columns:
 *   - timestamp: a Unix timestamp in seconds (10 digits)
 *   - tbs_sum: numeric value representing the total transport block size sum
 *
 * The function:
 *   1. Parses each row, converting the timestamp from seconds to milliseconds.
 *   2. Sorts all rows by ascending timestamp.
 *   3. For each consecutive pair of rows, calculates:
 *         - deltaT: the time difference (in seconds)
 *         - deltaTbs: the difference in tbs_sum
 *         - throughput in bits per second, then converts it to Mb/s.
 *         - a dummy latency as 1/(throughput + 1)
 *         - whether the interval is a “bottleneck” if throughput > 100 Mb/s.
 *   4. Computes overall metrics such as total records, total load (sum of tbs_sum),
 *      average throughput, min/max throughput, overall approximate latency, and bottleneck count.
 *   5. Returns an object containing these computed metrics along with an array of intervals.
 *
 * @param {string} filePath - The absolute path to the CSV file.
 * @returns {Promise<Object>} - A promise that resolves with the analysis results.
 */
async function analyzeOpenRan5G(filePath) {
  return new Promise((resolve, reject) => {
    let rows = [];

    fs.createReadStream(filePath)
      .pipe(csv({ separator: "\t" })) // using tab as delimiter
      .on('data', (row) => {
        const rawTs = row.timestamp;              // e.g. "1589650273"
        const tsInt = parseInt(rawTs, 10);
        // If the timestamp is exactly 10 characters, assume it's in seconds and convert to ms.
        const ts = (rawTs && rawTs.length === 10) ? tsInt * 1000 : tsInt;
        const tbsSum = parseFloat(row.tbs_sum) || 0;
        if (!isNaN(ts)) {
          rows.push({ ts, tbsSum });
        }
      })
      .on('end', () => {
        // Sort rows by ascending timestamp
        rows.sort((a, b) => a.ts - b.ts);

        if (rows.length < 2) {
          return resolve({
            totalRecords: rows.length,
            message: 'Not enough data points to compute throughput.'
          });
        }

        const totalRecords = rows.length;
        const totalLoad = rows.reduce((acc, r) => acc + r.tbsSum, 0);

        let intervals = [];
        let sumThroughput = 0;
        let throughputCount = 0;
        let minThroughput = Infinity;
        let maxThroughput = -Infinity;
        let bottleneckCount = 0;

        for (let i = 0; i < rows.length - 1; i++) {
          const start = rows[i];
          const end = rows[i + 1];
          const deltaT = (end.ts - start.ts) / 1000; // time difference in seconds
          if (deltaT <= 0) continue;

          let deltaTbs = end.tbsSum - start.tbsSum;
          if (deltaTbs < 0) deltaTbs = 0; // Ensure non-negative

          // Throughput in bits per second; then convert to Mb/s.
          const throughputBps = deltaTbs / deltaT;
          const throughputMbps = throughputBps / 1e6;

          if (throughputMbps < minThroughput) minThroughput = throughputMbps;
          if (throughputMbps > maxThroughput) maxThroughput = throughputMbps;
          sumThroughput += throughputMbps;
          throughputCount++;

          // Determine if this interval is a bottleneck (example: > 100 Mb/s)
          const isBottleneck = throughputMbps > 100;
          if (isBottleneck) bottleneckCount++;

          // Dummy latency calculation: 1 / (throughput + 1)
          const latency = 1 / (throughputMbps + 1);

          intervals.push({
            timestampStart: new Date(start.ts).toISOString(),
            timestampEnd: new Date(end.ts).toISOString(),
            deltaT,
            throughput: throughputMbps,
            latency,
            bottleneck: isBottleneck
          });
        }

        const avgThroughput = throughputCount > 0 ? sumThroughput / throughputCount : 0;
        if (minThroughput === Infinity) minThroughput = 0;
        if (maxThroughput === -Infinity) maxThroughput = 0;
        const approxLatency = 1 / (avgThroughput + 1);

        resolve({
          totalRecords,
          totalLoad,
          avgThroughput,
          minThroughput,
          maxThroughput,
          approxLatency,
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