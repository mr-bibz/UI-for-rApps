// src/components/SparkTrainingChart.jsx
import React, { useEffect, useState } from 'react';
import { fetchSparkTrainingLogs } from '../api/apiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Paper, Typography } from '@mui/material';

const SparkTrainingChart = () => {
  const [data, setData] = useState([]);

  const loadData = async () => {
    try {
      const response = await fetchSparkTrainingLogs();
      // Assuming each log has { timestamp, accuracy, loss } fields
      const formattedData = response.data.map((log) => ({
        timestamp: new Date(log.timestamp).toLocaleTimeString(),
        accuracy: log.accuracy,
        loss: log.loss,
      }));
      setData(formattedData);
    } catch (error) {
      console.error('Error fetching Spark training logs:', error);
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
        Spark Training Metrics
      </Typography>
      <LineChart width={600} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis label={{ value: 'Metric Value', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="accuracy" stroke="#82ca9d" name="Accuracy" />
        <Line type="monotone" dataKey="loss" stroke="#8884d8" name="Loss" />
      </LineChart>
    </Paper>
  );
};

export default SparkTrainingChart;