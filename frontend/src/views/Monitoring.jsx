// src/views/Monitoring.jsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Box
} from '@mui/material';
import Grid2 from '@mui/material/Unstable_Grid2';
import { fetchAggregatedMetrics } from '../api/apiService';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const Monitoring = () => {
  const [aggregatedData, setAggregatedData] = useState(null);

  // Load aggregated metrics from our backend's aggregated endpoint
  const loadAggregatedMetrics = async () => {
    try {
      const response = await fetchAggregatedMetrics();
      setAggregatedData(response.data);
    } catch (error) {
      console.error('Error fetching aggregated metrics:', error);
    }
  };

  useEffect(() => {
    loadAggregatedMetrics();
    const intervalId = setInterval(loadAggregatedMetrics, 15000); // Poll every 15 seconds
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Monitoring Dashboard
      </Typography>
      <Grid2 container spacing={3}>
        {/* NiFi Ingestion Chart */}
        <Grid2 item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              NiFi Ingestion Rate
            </Typography>
            {aggregatedData &&
            aggregatedData.nifiIngestion &&
            aggregatedData.nifiIngestion.length > 0 ? (
              <LineChart width={500} height={300} data={aggregatedData.nifiIngestion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(tick) => new Date(tick).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip labelFormatter={(label) => new Date(label).toLocaleTimeString()} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="ingestionRate"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            ) : (
              <Typography>No ingestion data available.</Typography>
            )}
          </Paper>
        </Grid2>
        {/* Container Metrics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Container Metrics
            </Typography>
            {aggregatedData && aggregatedData.containerMetrics ? (
              Object.entries(aggregatedData.containerMetrics).map(([container, metrics]) => (
                <Box key={container} sx={{ mb: 1 }}>
                  <Typography variant="subtitle1">
                    {container.toUpperCase()}
                  </Typography>
                  <Typography variant="body2">
                    CPU: {metrics.cpuUsage}% | Memory: {metrics.memoryUsage} MB | Throughput: {metrics.networkThroughput} MB/s
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography>No container metrics available.</Typography>
            )}
          </Paper>
        </Grid>

        {/* Error Logs Table */}
        <Grid2 item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Error Logs
            </Typography>
            {aggregatedData &&
            aggregatedData.errorLogs &&
            aggregatedData.errorLogs.length > 0 ? (
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
                    {aggregatedData.errorLogs.map((log) => (
                      <TableRow key={log._id}>
                        <TableCell>
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>{log.component}</TableCell>
                        <TableCell>{log.severity}</TableCell>
                        <TableCell>{log.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography>No error logs available.</Typography>
            )}
          </Paper>
        </Grid2>
      </Grid2>
    </Container>
  );
};

export default Monitoring;