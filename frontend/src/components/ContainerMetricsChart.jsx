// ContainerMetricsChart.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Convert bytes to MB
function bytesToMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

// Shorten container names if they're too long
function shortenString(str, maxLength = 15) {
  if (str.length > maxLength) {
    return str.substring(0, maxLength) + '...';
  }
  return str;
}

// Attempt to derive a friendly container name
function deriveContainerName(container) {
  const labels = container.spec?.labels || {};

  // If your Docker Compose sets container_name: "nifi", cAdvisor might store it here:
  if (labels['com.docker.compose.container-name']) {
    return labels['com.docker.compose.container-name'];
  }

  // Or if it’s just "com.docker.compose.service"
  if (labels['com.docker.compose.service']) {
    return labels['com.docker.compose.service'];
  }

  if (container.aliases?.length) {
    return container.aliases[0];
  }

  if (container.name) {
    return container.name.replace(/^\/docker\//, '');
  }

  if (container.id) {
    return container.id.substring(0, 12);
  }

  return 'unknown';
}

const ContainerMetricsChart = () => {
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // cAdvisor proxy must be accessible at this URL (e.g., via Nginx or port mapping)
    axios.get('http://localhost:8086/api/v1.3/subcontainers')
      .then((res) => {
        const containersArray = Array.isArray(res.data)
          ? res.data
          : (typeof res.data === 'object' ? Object.values(res.data) : []);

        // Arrays for each metric
        const containerNames = [];
        const cpuUsages = [];
        const memUsages = [];
        const memLimits = [];
        const memPercents = [];
        const netRx = [];
        const netTx = [];

        containersArray.forEach((container) => {
          if (!container.stats || container.stats.length === 0) return;

          const latestStat = container.stats[container.stats.length - 1];
          let name = deriveContainerName(container);
          name = shortenString(name, 15);

          // CPU usage: convert nanoseconds -> seconds
          const cpuUsageSeconds = (latestStat.cpu.usage.total / 1e9).toFixed(2);

          // Memory usage
          const memUsageMB = bytesToMB(latestStat.memory.usage);

          // Memory limit (from container.spec if available)
          let memLimitMB = 0;
          if (container.spec?.memory?.limit) {
            memLimitMB = (container.spec.memory.limit / (1024 * 1024)).toFixed(2);
          }
          // Compute memory percentage
          const memPercent = memLimitMB > 0
            ? ((memUsageMB / memLimitMB) * 100).toFixed(2)
            : 0;

            // Network usage (sum across all interfaces)
          let rxBytes = 0;
          let txBytes = 0;
          if (latestStat.network?.interfaces) {
            latestStat.network.interfaces.forEach((iface) => {
              rxBytes += iface.rx_bytes;
              txBytes += iface.tx_bytes;
            });
          }
          const rxKB = (rxBytes / 1024).toFixed(2);
          const txKB = (txBytes / 1024).toFixed(2);

          containerNames.push(name);
          cpuUsages.push(parseFloat(cpuUsageSeconds));
          memUsages.push(parseFloat(memUsageMB));
          memLimits.push(parseFloat(memLimitMB));
          memPercents.push(parseFloat(memPercent));
          netRx.push(parseFloat(rxKB));
          netTx.push(parseFloat(txKB));
        });

        // Build the multi-series bar chart data
        const data = {
          labels: containerNames,
          datasets: [
            {
              label: 'CPU Usage (sec)',
              data: cpuUsages,
              backgroundColor: 'rgba(75,192,192,0.6)',
            },
            {
              label: 'Mem Usage (MB)',
              data: memUsages,
              backgroundColor: 'rgba(153,102,255,0.6)',
            },
            {
              label: 'Mem Limit (MB)',
              data: memLimits,
              backgroundColor: 'rgba(255,159,64,0.6)',
            },
            {
              label: 'Mem %',
              data: memPercents,
              backgroundColor: 'rgba(255,99,132,0.6)',
            },
            {
              label: 'Net RX (KB)',
              data: netRx,
              backgroundColor: 'rgba(54,162,235,0.6)',
            },
            {
              label: 'Net TX (KB)',
              data: netTx,
              backgroundColor: 'rgba(255,206,86,0.6)',
            },
          ],
        };

        setChartData(data);
      })
      .catch((err) => {
        console.error('Error fetching cAdvisor data:', err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  if (!chartData) {
    return <div>Loading cAdvisor data...</div>;
  }

  // Chart options
  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Container Metrics from cAdvisor',
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45, // Tilt labels if needed
          minRotation: 0,
        },
      },
    },
  };

  return (
    <div style={{ padding: '16px' }}>
      <h3>cAdvisor Container Metrics</h3>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default ContainerMetricsChart;