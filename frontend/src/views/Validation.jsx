// src/views/Validation.jsx
import React from 'react';
import { Container, Typography, Paper } from '@mui/material';
import { useParams } from 'react-router-dom';
import Grid2 from '@mui/material/Grid2';

import InterpretabilityPanel from '../components/InterpretabilityPanel';
import ContainerMetrics from '../components/ContainerMetrics';

const Validation = () => {
  const { pipelineId } = useParams();

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Validation & AI Interpretability
      </Typography>
      
      <Grid2 container spacing={3}>
        <Grid2 item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <InterpretabilityPanel pipelineId={pipelineId} />
          </Paper>
        </Grid2>
        
        <Grid2 item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <ContainerMetrics />
          </Paper>
        </Grid2>
      </Grid2>
    </Container>
  );
};

export default Validation;