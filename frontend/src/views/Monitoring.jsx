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

// If your API service has a dedicated function for monitoring, rename accordingly.
// Otherwise, if you use /status from your pipeline controller, do something like:
import { fetchMonitoringData } from '../api/apiService';

const Monitoring = () => {
  const [pipelineId, setPipelineId] = useState('');
  const [monitorData, setMonitorData] = useState(null);
  const [error, setError] = useState('');

  // Fetch pipeline status (which includes openRanAnalysis & trainingMetrics)
  const handleFetchMonitoring = async () => {
    try {
      const response = await fetchMonitoringData(pipelineId);
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

          {/* Show openRanAnalysis if present */}
          {monitorData.openRanAnalysis && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">OpenRAN TBS Analysis</Typography>
              <Typography>
                Total Records: {monitorData.openRanAnalysis.totalRecords}
              </Typography>
              <Typography>
                Total Load (tbs_sum): {monitorData.openRanAnalysis.totalLoad}
              </Typography>
              <Typography>
                Avg Throughput (Mbps):{' '}
                {monitorData.openRanAnalysis.avgThroughput?.toFixed(2)}
              </Typography>
              <Typography>
                Min Throughput (Mbps):{' '}
                {monitorData.openRanAnalysis.minThroughput?.toFixed(2)}
              </Typography>
              <Typography>
                Max Throughput (Mbps):{' '}
                {monitorData.openRanAnalysis.maxThroughput?.toFixed(2)}
              </Typography>
              <Typography>
                Approx Latency (s):{' '}
                {monitorData.openRanAnalysis.approxLatency?.toFixed(4)}
              </Typography>
              <Typography>
                Bottleneck Count: {monitorData.openRanAnalysis.bottleneckCount}
              </Typography>

              {/* If you want to display intervals */}
              {monitorData.openRanAnalysis.intervals &&
                monitorData.openRanAnalysis.intervals.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Intervals:</Typography>
                    {monitorData.openRanAnalysis.intervals.map(
                      (interval, idx) => (
                        <Box key={idx} sx={{ ml: 2, mb: 1 }}>
                          <Typography>
                            {interval.timestampStart} → {interval.timestampEnd}{' '}
                            (Δt: {interval.deltaT}s)
                          </Typography>
                          <Typography>
                            Throughput: {interval.throughput.toFixed(2)} Mbps |{' '}
                            Latency: {interval.latency.toFixed(4)}s |{' '}
                            Bottleneck: {interval.bottleneck ? 'Yes' : 'No'}
                          </Typography>
                        </Box>
                      )
                    )}
                  </Box>
                )}
            </Box>
          )}

          {/* Show training metrics if present */}
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