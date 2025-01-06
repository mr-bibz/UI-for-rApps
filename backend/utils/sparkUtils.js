// utils/sparkUtils.js
const { exec } = require('child_process');
const { SPARK_MASTER } = require('../config');

function submitSparkJob(jobScriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const argString = args.join(' ');
    const cmd = `spark-submit --master ${SPARK_MASTER} ${jobScriptPath} ${argString}`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

module.exports = { submitSparkJob };
