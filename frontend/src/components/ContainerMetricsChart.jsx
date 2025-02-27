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

// Register the necessary Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ContainerMetricsChart = () => {
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState(null);

  // Helper to convert bytes to MB with 2 decimals.
  const bytesToMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

  useEffect(() => {
    axios.get('http://localhost:8085/api/v1.3/subcontainers')
      .then((res) => {
        console.log('cAdvisor raw data:', res.data);
        
        // Convert response to an array if it isn’t already
        const containersArray = Array.isArray(res.data)
          ? res.data
          : (typeof res.data === 'object' ? Object.values(res.data) : []);
        
        const containerNames = [];
        const cpuUsages = [];
        const memUsages = [];

        containersArray.forEach((container) => {
          // Use the first alias as the container name, or "unknown" if not available
          const name = container.aliases && container.aliases.length > 0 ? container.aliases[0] : 'unknown';

          // Use the latest stat from the container's stats array
          if (container.stats && container.stats.length > 0) {
            const latestStat = container.stats[container.stats.length - 1];

            // Convert CPU usage (nanoseconds) to seconds for display
            const cpuUsageSeconds = (latestStat.cpu.usage.total / 1e9).toFixed(2);
            // Convert memory usage from bytes to MB
            const memUsageMB = bytesToMB(latestStat.memory.usage);

            containerNames.push(name);
            cpuUsages.push(parseFloat(cpuUsageSeconds));
            memUsages.push(parseFloat(memUsageMB));
          }
        });

        // Prepare the Chart.js data object
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

  // Chart options configuration
  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Container Metrics from cAdvisor',
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