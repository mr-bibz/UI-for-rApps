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
} from '@mui/material';

const ContainerMetrics = () => {
  const [containers, setContainers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Use the JSON endpoint from cAdvisor (subcontainers)
        const response = await axios.get('http://localhost:8085/api/v1.3/subcontainers');
        setContainers(response.data);
      } catch (err) {
        setError(err.message || 'Error fetching metrics');
      }
    };

    fetchMetrics();
  }, []);

  if (error) {
    return (
      <Typography color="error">
        Error: {error}
      </Typography>
    );
  }

  if (!containers || containers.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <CircularProgress />
        <Typography>Loading container metrics...</Typography>
      </div>
    );
  }

  // Filter for containers that include "nifi", "kafka", or "spark" in their names
  const filteredContainers = containers.filter((container) => {
    const lowerName = container.name.toLowerCase();
    return lowerName.includes('nifi') || lowerName.includes('kafka') || lowerName.includes('spark');
  });

  return (
    <Paper style={{ padding: '16px', overflowX: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Container Metrics
      </Typography>
      {filteredContainers.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Container Name</TableCell>
              <TableCell>CPU Usage (Total)</TableCell>
              <TableCell>Memory Usage (Bytes)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredContainers.map((container) => {
              // Get the most recent stats entry
              const statsArray = container.stats;
              const latestStat = statsArray && statsArray.length > 0 ? statsArray[statsArray.length - 1] : {};
              const cpuUsage =
                latestStat.cpu && latestStat.cpu.usage ? latestStat.cpu.usage.total : 'N/A';
              const memoryUsage =
                latestStat.memory && latestStat.memory.usage ? latestStat.memory.usage : 'N/A';

              return (
                <TableRow key={container.id}>
                  <TableCell>{container.name}</TableCell>
                  <TableCell>{cpuUsage}</TableCell>
                  <TableCell>{memoryUsage}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Typography>No matching containers found.</Typography>
      )}
    </Paper>
  );
};

export default ContainerMetrics;