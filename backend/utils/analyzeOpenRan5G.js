const fs = require('fs');
const csv = require('csv-parser');

function analyzeOpenRan5G(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    // Optional: Preview the file content
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading file preview:', err);
      } else {
        console.log('File content preview:', data.slice(0, 200));
      }
    });

    fs.createReadStream(filePath)
      // Remove the tab separator option so the file is parsed as comma-separated.
      .pipe(csv())
      .on('data', (row) => {
        // Debug: Log each parsed row
        console.log("Parsed row:", row);
        
        // Now, row should have separate keys: row.timestamp and row.tbs_sum
        const rawTs = (row.timestamp || "").trim();
        let tsInt = parseInt(rawTs, 10);

        if (!isNaN(tsInt)) {
          // If the timestamp is exactly 10 digits, assume it's in seconds and convert to milliseconds.
          if (rawTs.length === 10) {
            tsInt *= 1000;
          }
          const tbsSum = parseFloat(row.tbs_sum) || 0;
          rows.push({ ts: tsInt, tbsSum });
        }
      })
      .on('end', () => {
        // Sort rows by ascending timestamp.
        rows.sort((a, b) => a.ts - b.ts);

        if (rows.length < 2) {
          return resolve({
            totalRecords: rows.length,
            message: 'Not enough data points to compute throughput.'
          });
        }

        const totalRecords = rows.length;
        const totalLoad = rows.reduce((acc, r) => acc + r.tbsSum, 0);

        const intervals = [];
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

          const isBottleneck = throughputMbps > 100;
          if (isBottleneck) bottleneckCount++;

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
      .on('error', (err) => reject(err));
  });
}

if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node analyzeOpenRan5G.js <path-to-csv-file>');
    process.exit(1);
  }

  analyzeOpenRan5G(filePath)
    .then(result => {
      console.log('Analysis Result:');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(err => {
      console.error('Error during analysis:', err);
    });
} else {
  module.exports = analyzeOpenRan5G;
}
