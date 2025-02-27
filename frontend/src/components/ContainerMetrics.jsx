// src/components/ContainerMetrics.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Grid2,
  Alert
} from '@mui/material';

const ContainerMetrics = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axios.get('http://localhost:8085/api/v1.3/subcontainers');
        setContainers(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Error fetching metrics');
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatCpu = (cpu) => {
    if (!cpu) return 'N/A';
    return `${(cpu / 1e9).toFixed(2)} GHz`;
  };

  const filteredContainers = containers.filter(container => {
    const name = container.name?.toLowerCase();
    return name?.includes('nifi') || 
           name?.includes('kafka') || 
           name?.includes('spark') || 
           name?.includes('cadvisor');
  });

  if (loading) {
    return (
      <Grid2 container justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <CircularProgress />
        <Typography variant="body2" style={{ marginLeft: 16 }}>Loading metrics...</Typography>
      </Grid2>
    );
  }

  if (error) {
    return <Alert severity="error" style={{ margin: 16 }}>{error}</Alert>;
  }

  return (
    <Paper style={{ padding: '16px', overflowX: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Container Metrics (cAdvisor)
      </Typography>
      
      {filteredContainers.length > 0 ? (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Container</TableCell>
              <TableCell align="right">CPU Usage</TableCell>
              <TableCell align="right">Memory</TableCell>
              <TableCell align="right">Network RX</TableCell>
              <TableCell align="right">Network TX</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredContainers.map((container) => {
              const stats = container.stats?.[container.stats.length - 1] || {};
              return (
                <TableRow key={container.id}>
                  <TableCell>
                    {container.name.replace('/docker/', '').split('_').slice(1).join(' ')}
                  </TableCell>
                  <TableCell align="right">
                    {formatCpu(stats.cpu?.usage?.total)}
                  </TableCell>
                  <TableCell align="right">
                    {formatBytes(stats.memory?.usage)}
                  </TableCell>
                  <TableCell align="right">
                    {formatBytes(stats.network?.rx_bytes)}
                  </TableCell>
                  <TableCell align="right">
                    {formatBytes(stats.network?.tx_bytes)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Typography variant="body2" style={{ padding: 16 }}>
          No containers found. Make sure your containers are running.
        </Typography>
      )}
    </Paper>
  );
};

export default ContainerMetrics;