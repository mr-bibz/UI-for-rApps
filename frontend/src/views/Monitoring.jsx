// src/views/Monitoring.jsx
import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2'; // Using the new Grid API
import { fetchLogs, fetchContainerMetrics } from '../api/apiService';

const Monitoring = () => {
  const [logs, setLogs] = useState([]);
  const [containerMetrics, setContainerMetrics] = useState(null);

  // Function to fetch logs from the backend
  const loadLogs = async () => {
    try {
      const response = await fetchLogs();
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  // Function to fetch container metrics from the backend
  const loadContainerMetrics = async () => {
    try {
      const response = await fetchContainerMetrics();
      setContainerMetrics(response.data);
    } catch (error) {
      console.error('Error fetching container metrics:', error);
    }
  };

  // Set up polling for logs and metrics
  useEffect(() => {
    loadLogs();
    loadContainerMetrics();
    const logsInterval = setInterval(loadLogs, 10000);      // Refresh logs every 10 seconds
    const metricsInterval = setInterval(loadContainerMetrics, 15000); // Refresh metrics every 15 seconds
    return () => {
      clearInterval(logsInterval);
      clearInterval(metricsInterval);
    };
  }, []);

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Monitoring Dashboard
      </Typography>
      <Grid container spacing={3}>
        {/* Logs Section */}
        <Grid xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              System & Error Logs
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Component</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{log.component}</TableCell>
                        <TableCell>{log.severity}</TableCell>
                        <TableCell>{log.message}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4}>No logs available.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Container Metrics Section */}
        <Grid xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Container Metrics
            </Typography>
            {containerMetrics ? (
              <Grid container spacing={2}>
                {Object.entries(containerMetrics).map(([containerName, metrics]) => (
                  <Grid key={containerName} xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="h6" align="center">
                        {containerName.toUpperCase()}
                      </Typography>
                      <Typography variant="body1">
                        CPU Usage: {metrics.cpuUsage}%
                      </Typography>
                      <Typography variant="body1">
                        Memory Usage: {metrics.memoryUsage} MB
                      </Typography>
                      <Typography variant="body1">
                        Network Throughput: {metrics.networkThroughput} MB/s
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body1">No container metrics available.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Monitoring;