// src/views/Validation.jsx
import React from 'react';
import { Container, Typography, Paper } from '@mui/material';
import { useParams } from 'react-router-dom';
import Grid2 from '@mui/material/Grid2';

import InterpretabilityPanel from '../components/InterpretabilityPanel';
import ContainerMetrics from '../components/ContainerMetrics';

const Validation = () => {
  const { pipelineId } = useParams(); // Fetch pipelineId from URL if needed

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Validation & AI Interpretability
      </Typography>
      <Grid2 container spacing={3}>
        <Grid2 item xs={12}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <InterpretabilityPanel pipelineId={pipelineId} />
          </Paper>
        </Grid2>
        <Grid2 item xs={12}>
          <Paper sx={{ p: 2 }}>
            <ContainerMetrics />
          </Paper>
        </Grid2>
      </Grid2>
    </Container>
  );
};

export default Validation;