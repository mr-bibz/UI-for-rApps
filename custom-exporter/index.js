const express = require('express');
const Docker = require('dockerode');
const client = require('prom-client');

const app = express();
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Collect default Node.js process metrics
client.collectDefaultMetrics();

// Create a custom Gauge for container CPU usage (as an example)
const cpuGauge = new client.Gauge({
  name: 'custom_container_cpu_usage_percent',
  help: 'Custom container CPU usage percentage',
  labelNames: ['container']
});

// This function will update metrics for all running containers
async function updateMetrics() {
  try {
    const containers = await docker.listContainers();
    for (const containerInfo of containers) {
      const container = docker.getContainer(containerInfo.Id);
      // Get stats without streaming (returns a single snapshot)
      const stats = await container.stats({ stream: false });
      // For a simplified example, we calculate a dummy CPU usage value.
      // In production, you'd calculate CPU usage based on the stats.
      const cpuUsage = Math.random() * 100; // Replace with real calculation
      // Use the first name from containerInfo.Names (removing leading '/')
      const containerName = containerInfo.Names[0].replace(/^\//, '');
      cpuGauge.set({ container: containerName }, cpuUsage);
    }
  } catch (err) {
    console.error('Error updating container metrics:', err.message);
  }
}

// Update metrics every 15 seconds
setInterval(updateMetrics, 15000);

// Expose metrics on /metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Start the server on port 9100
const PORT = 9100;
app.listen(PORT, () => {
  console.log(`Custom exporter listening on port ${Port}`);
});