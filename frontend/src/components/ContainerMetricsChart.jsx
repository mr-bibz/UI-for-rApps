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

function bytesToMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

// Shorten any string if it's too long
function shortenString(str, maxLength = 15) {
  if (str.length > maxLength) {
    return str.substring(0, maxLength) + '...';
  }
  return str;
}

function deriveContainerName(container) {
  // 1. Check Docker Compose label (e.g. "nifi", "spark-master", "kafka")
  if (container.spec?.labels?.['com.docker.compose.service']) {
    return container.spec.labels['com.docker.compose.service'];
  }

  // 2. If aliases exist, use the first alias
  if (container.aliases && container.aliases.length > 0) {
    return container.aliases[0];
  }

  // 3. If container.name exists, strip out any "/docker/" prefix
  if (container.name) {
    const rawName = container.name.replace(/^\/docker\//, '');
    return rawName;
  }

  // 4. If container.id exists, show the first 12 characters (like a short Docker ID)
  if (container.id) {
    return container.id.substring(0, 12);
  }

  // 5. Fallback
  return 'unknown';
}

const ContainerMetricsChart = () => {
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:8086/api/v1.3/subcontainers')
      .then((res) => {
        // cAdvisor might return an array or object, so convert to array
        const containersArray = Array.isArray(res.data)
          ? res.data
          : (typeof res.data === 'object' ? Object.values(res.data) : []);

        const containerNames = [];
        const cpuUsages = [];
        const memUsages = [];

        containersArray.forEach((container) => {
          // Derive a meaningful name
          let name = deriveContainerName(container);
          // Truncate if too long
          name = shortenString(name, 15);

          // If container has stats
          if (container.stats && container.stats.length > 0) {
            const latestStat = container.stats[container.stats.length - 1];

            // CPU usage: convert nanoseconds -> seconds
            const cpuUsageSeconds = (latestStat.cpu.usage.total / 1e9).toFixed(2);
            // Memory usage: bytes -> MB
            const memUsageMB = bytesToMB(latestStat.memory.usage);

            containerNames.push(name);
            cpuUsages.push(parseFloat(cpuUsageSeconds));
            memUsages.push(parseFloat(memUsageMB));
          }
        });

        // Chart.js data object
        const data = {
          labels: containerNames,
          datasets: [
            {
              label: 'CPU Usage (seconds)',
              data: cpuUsages,
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
            },
            {
              label: 'Memory Usage (MB)',
              data: memUsages,
              backgroundColor: 'rgba(153, 102, 255, 0.6)',
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

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Container Metrics from cAdvisor',
      },
    },
    // Optional: rotate x-axis labels if they're still long
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
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