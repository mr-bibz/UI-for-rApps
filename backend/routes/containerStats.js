// backend/routes/containerStats.js
const express = require('express');
const Docker = require('dockerode');
const router = express.Router();

// Connect to Docker (ensure your Node process has access to /var/run/docker.sock)
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Calculate the CPU usage percentage.
 * This uses the difference between current and previous CPU stats.
 */
function calculateCpuPercent(stats) {
  const cpuDelta =
    stats.cpu_stats.cpu_usage.total_usage -
    stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta =
    stats.cpu_stats.system_cpu_usage -
    stats.precpu_stats.system_cpu_usage;
  let cpuPercent = 0;
  if (systemDelta > 0 && cpuDelta > 0) {
    // Use online_cpus if available or fallback to number of entries in percpu_usage.
    const numCpus =
      stats.cpu_stats.online_cpus ||
      (stats.cpu_stats.cpu_usage.percpu_usage
        ? stats.cpu_stats.cpu_usage.percpu_usage.length
        : 1);
    cpuPercent = (cpuDelta / systemDelta) * numCpus * 100.0;
  }
  return cpuPercent.toFixed(2) + '%';
}

/**
 * Format memory usage data.
 * Returns the current usage, limit, and percentage.
 */
function formatMemoryUsage(stats) {
  const usage = stats.memory_stats.usage;
  const limit = stats.memory_stats.limit;
  const usageMB = (usage / 1024 / 1024).toFixed(2);
  const limitMB = (limit / 1024 / 1024).toFixed(2);
  const memPercent = ((usage / limit) * 100).toFixed(2) + '%';
  return {
    usage: usageMB + 'MB',
    limit: limitMB + 'MB',
    memPercent,
  };
}

/**
 * Sum up network stats across interfaces.
 */
function calculateNetworkUsage(stats) {
  let rx = 0,
    tx = 0;
  if (stats.networks) {
    Object.values(stats.networks).forEach((net) => {
      rx += net.rx_bytes;
      tx += net.tx_bytes;
    });
  }
  return {
    rx: (rx / 1024).toFixed(2) + 'KB',
    tx: (tx / 1024).toFixed(2) + 'KB',
  };
}

// API endpoint to retrieve container stats
router.get('/api/container-stats', async (req, res) => {
  try {
    // List all running containers
    const containers = await docker.listContainers();
    const statsPromises = containers.map(async (containerInfo) => {
      const container = docker.getContainer(containerInfo.Id);
      // Get one snapshot of stats (non-streaming)
      const stats = await container.stats({ stream: false });
      return {
        id: containerInfo.Id,
        name: containerInfo.Names[0].replace('/', ''),
        cpu: calculateCpuPercent(stats),
        memory: formatMemoryUsage(stats),
        network: calculateNetworkUsage(stats),
      };
    });

    const containerStats = await Promise.all(statsPromises);
    res.json(containerStats);
  } catch (error) {
    console.error('Error fetching container stats:', error);
    res.status(500).json({ error: 'Failed to fetch container stats' });
  }
});

module.exports = router;