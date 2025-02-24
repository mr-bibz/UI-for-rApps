// src/views/Monitoring.jsx
import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Box
} from '@mui/material';
import { fetchPipelineStatus } from '../api/apiService';

const Monitoring = () => {
  const [pipelineId, setPipelineId] = useState('');
  const [monitorData, setMonitorData] = useState(null);
  const [error, setError] = useState('');

  // Fetch monitoring data (analysis + training metrics) for a given pipelineId
  const handleFetchMonitoring = async () => {
    try {
      const response = await fetchPipelineStatus(pipelineId);
      setMonitorData(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error fetching monitoring data');
      setMonitorData(null);
    }
  };
 
  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Monitoring Dashboard
      </Typography>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <TextField
          label="Pipeline ID"
          value={pipelineId}
          onChange={(e) => setPipelineId(e.target.value)}
          sx={{ mr: 2 }}
        />
        <Button variant="contained" onClick={handleFetchMonitoring}>
          Fetch Monitoring Data
        </Button>
      </Box>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      {monitorData && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Pipeline ID: {monitorData.pipelineId}
          </Typography>
          <Typography variant="body1">Status: {monitorData.status}</Typography>

          {monitorData.analysis && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Dataset Analysis</Typography>
              <Typography>Record Count: {monitorData.analysis.count}</Typography>
              <Typography>
                Average Throughput: {monitorData.analysis.averageThroughput}
              </Typography>
              <Typography>
                Average Latency: {monitorData.analysis.averageLatency}
              </Typography>
              <Typography>
                Min Throughput: {monitorData.analysis.minThroughput}
              </Typography>
              <Typography>
                Max Throughput: {monitorData.analysis.maxThroughput}
              </Typography>
              <Typography>
                Min Latency: {monitorData.analysis.minLatency}
              </Typography>
              <Typography>
                Max Latency: {monitorData.analysis.maxLatency}
              </Typography>
            </Box>
          )}

          {monitorData.trainingMetrics && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Training Metrics</Typography>
              <Typography>
                Accuracy: {monitorData.trainingMetrics.accuracy}
              </Typography>
              <Typography>
                Artifact Path: {monitorData.trainingMetrics.artifactPath}
              </Typography>
              <Typography>
                Last Updated:{' '}
                {new Date(monitorData.trainingMetrics.updatedAt).toLocaleString()}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Container>
  );
};

export default Monitoring;