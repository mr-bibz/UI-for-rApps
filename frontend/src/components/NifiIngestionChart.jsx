// src/components/NifiIngestionChart.jsx
import React, { useEffect, useState } from 'react';
import { fetchNifiIngestionLogs } from '../api/apiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Paper, Typography } from '@mui/material';

const NifiIngestionChart = () => {
  const [data, setData] = useState([]);

  const loadData = async () => {
    try {
      const response = await fetchNifiIngestionLogs();
      // Assuming each log has { timestamp, ingestionRate } fields
      const formattedData = response.data.map((log) => ({
        timestamp: new Date(log.timestamp).toLocaleTimeString(),
        ingestionRate: log.ingestionRate,
      }));
      setData(formattedData);
    } catch (error) {
      console.error('Error fetching NiFi ingestion logs:', error);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        NiFi Ingestion Rates
      </Typography>
      <LineChart width={600} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis label={{ value: 'Records/sec', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="ingestionRate" stroke="#8884d8" />
      </LineChart>
    </Paper>
  );
};

export default NifiIngestionChart;