// src/views/Deployment.jsx
import React, { useState } from 'react';
import { Container, Typography, Paper, Button, Stack, Box } from '@mui/material';
import Grid2 from '@mui/material/Grid2'; // New Grid API
import {
  startNifi,
  stopNifi,
  startKafka,
  stopKafka,
  deploySparkJob,
  stopSparkJob
  // If you have endpoints for rApps, you could import them as well.
} from '../api/apiService';

const Deployment = () => {
  const [logs, setLogs] = useState([]);

  // Helper function to append log messages with a timestamp
  const addLog = (message) => {
    const timeStampedMessage = '${new Date().toLocaleTimeString()}: ${message}';
    setLogs((prevLogs) => [...prevLogs, timeStampedMessage]);
  };

  // NiFi actions
  const handleStartNifi = async () => {
    try {
      await startNifi();
      addLog('NiFi started successfully.');
    } catch (error) {
      addLog('Error starting NiFi: ${error.message}');
    }
};

const handleStopNifi = async () => {
  try {
    await stopNifi();
    addLog('NiFi stopped successfully.');
  } catch (error) {
    addLog('Error stopping NiFi: ${error.message}');
}
};

// Kafka actions
const handleStartKafka = async () => {
  try {
    await startKafka();
    addLog('Kafka started successfully.');
  } catch (error) {
    addLog('Error starting Kafka: ${error.message}');
}
};

const handleStopKafka = async () => {
  try {
    await stopKafka();
    addLog('Kafka stopped successfully.');
  } catch (error) {
    addLog('Error stopping Kafka: ${error.message}');
}
};

// Spark actions
const handleDeploySpark = async () => {
    try {
      // Create a default job configuration; adjust as needed.
      const jobConfig = { jobType: 'training' };
      await deploySparkJob(jobConfig);
      addLog('Spark job deployed successfully.');
    } catch (error) {
      addLog('Error deploying Spark job: ${error.message}');
    }
};

const handleStopSpark = async () => {
  try {
    await stopSparkJob();
    addLog('Spark job stopped successfully.');
  } catch (error) {
    addLog('Error stopping Spark job: ${error.message}');
}
};

// rApps actions (placeholder implementation)
const handleStartRapps = () => {
  // Implement real API call if available
  addLog('rApps started successfully.');
};

const handleStopRapps = () => {
  // Implement real API call if available
  addLog('rApps stopped successfully.');
};

return (
  <Container sx={{ mt: 4, mb: 4 }}>
    <Typography variant="h4" gutterBottom>
      Deployment & Orchestration
    </Typography>

    {/* Control Panel */}
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Control Panel
      </Typography>
      <Grid2 container spacing={3}>
        {/* NiFi Controls */}
        <Grid2 xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" align="center">
              NiFi
            </Typography>
            <Stack spacing={1} direction="column">
              <Button variant="contained" color="primary" onClick={handleStartNifi}>
                Start NiFi
              </Button>
              <Button variant="outlined" color="error" onClick={handleStopNifi}>
                Stop NiFi
              </Button>
            </Stack>
          </Paper>
        </Grid2>
        {/* Kafka Controls */}
        <Grid2 xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" align="center">
              Kafka
            </Typography>
            <Stack spacing={1} direction="column">
              <Button variant="contained" color="primary" onClick={handleStartKafka}>
                Start Kafka
              </Button>
              <Button variant="outlined" color="error" onClick={handleStopKafka}>
                Stop Kafka
              </Button>
            </Stack>
          </Paper>
        </Grid2>
        {/* Spark Controls */}
        <Grid2 xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" align="center">
              Spark
            </Typography>
            <Stack spacing={1} direction="column">
              <Button variant="contained" color="primary" onClick={handleDeploySpark}>
                Deploy Spark Job
              </Button>
              <Button variant="outlined" color="error" onClick={handleStopSpark}>
                Stop Spark Job
              </Button>
            </Stack>
          </Paper>
        </Grid2>
        {/* rApps Controls */}
        <Grid2 xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" align="center">
              rApps
            </Typography>
            <Stack spacing={1} direction="column">
              <Button variant="contained" color="primary" onClick={handleStartRapps}>
                Start rApps
              </Button>
              <Button variant="outlined" color="error" onClick={handleStopRapps}>
                Stop rApps
              </Button>
            </Stack>
          </Paper>
        </Grid2>
      </Grid2>
    </Paper>

    {/* Deployment Logs Section */}
    <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Deployment Logs / History
        </Typography>
        {logs.length > 0 ? (
          <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
            {logs.map((log, index) => (
              <Typography key={index} variant="body2">
                {log}
              </Typography>
            ))}
          </Box>
        ) : (
          <Typography variant="body1">No deployment logs available.</Typography>
        )}
      </Paper>
    </Container>
  );
};

export default Deployment;
