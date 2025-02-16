// src/views/Deployment.jsx
import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Button, Stack, Box } from '@mui/material';
import Grid2 from '@mui/material/Unstable_Grid2';
import { useParams } from 'react-router-dom';
import {
  startNifiFlow,
  stopNifiFlow,
  trainSparkModel,
  retrainSparkModel
} from '../api/apiService';

const Deployment = () => {
  const { pipelineId } = useParams(); // Suppose we navigate here with /deployment/:pipelineId
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => {
    setLogs((prev) => [...prev, '${new Date().toLocaleTimeString()}: ${msg}']);
  };

  const handleStartNifi = async () => {
    try {
      await startNifiFlow(pipelineId);
      addLog('NiFi flow started.');
    } catch (error) {
      addLog('Error starting NiFi flow: ${error.message}');
    }
  };

  const handleStopNifi = async () => {
    try {
      await stopNifiFlow(pipelineId);
      addLog('NiFi flow stopped.');
    } catch (error) {
      addLog('Error stopping NiFi flow: ${error.message}');
    }
  };

  const handleTrainModel = async () => {
    try {
      await trainSparkModel(pipelineId);
      addLog('Spark model training started.');
    } catch (error) {
      addLog('Error training Spark model: ${error.message}');
    }
  };

  const handleRetrainModel = async () => {
    try {
      await retrainSparkModel(pipelineId);
      addLog('Spark model retraining started.');
    } catch (error) {
      addLog('Error retraining Spark model: ${error.message}');
    }
  };

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Deployment & Orchestration
      </Typography>
      <Typography variant="body1" gutterBottom>
        Pipeline ID: {pipelineId}
      </Typography>

      <Grid2 container spacing={3}>
        {/* NiFi Controls */}
        <Grid2 item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Data Processing (NiFi)
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={handleStartNifi}>
                Start NiFi Flow
              </Button>
              <Button variant="outlined" color="error" onClick={handleStopNifi}>
                Stop NiFi Flow
              </Button>
            </Stack>
          </Paper>
        </Grid2>

        {/* Spark Controls */}
        <Grid2 item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              ML Training (Spark)
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={handleTrainModel}>
                Train Model
              </Button>
              <Button variant="outlined" onClick={handleRetrainModel}>
                Retrain Model
              </Button>
            </Stack>
          </Paper>
        </Grid2>

        {/* Logs */}
        <Grid2 item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Deployment Logs
            </Typography>
            <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
              {logs.length > 0 ? (
                logs.map((log, idx) => (
                  <Typography key={idx} variant="body2">
                    {log}
                  </Typography>
                ))
              ) : (
                <Typography variant="body2">No deployment logs available.</Typography>
              )}
            </Box>
          </Paper>
        </Grid2>
      </Grid2>
    </Container>
  );
};

export default Deployment;