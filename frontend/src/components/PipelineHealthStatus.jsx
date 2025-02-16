// src/components/PipelineHealthStatus.jsx
import React, { useEffect, useState } from 'react';
import { fetchPipelineHealth } from '../api/apiService';
import { Grid, Paper, Typography } from '@mui/material';

const PipelineHealthStatus = () => {
  const [healthData, setHealthData] = useState([]);

  const loadData = async () => {
    try {
      const response = await fetchPipelineHealth();
      setHealthData(response.data);
    } catch (error) {
      console.error('Error fetching pipeline health data:', error);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Pipeline Health
      </Typography>
      <Grid container spacing={2}>
        {healthData.map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item._id}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle1">{item.component}</Typography>
              <Typography variant="body2">
                Status: {item.status}
              </Typography>
              <Typography variant="body2">
                Uptime: {item.uptime} sec
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export default PipelineHealthStatus;