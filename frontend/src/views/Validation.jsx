// src/views/Validation.jsx
import React from 'react';
import { Container, Typography, Paper} from '@mui/material';
import InterpretabilityPanel from '../components/InterpretabilityPanel';
import { useParams } from 'react-router-dom';
import Grid2 from '@mui/material/Unstable_Grid2';

const Validation = () => {
  const { pipelineId } = useParams(); // This automatically fetches the pipelineId from the URL
  
  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Validation & AI Interpretability
      </Typography>
      <Grid2 container spacing={3}>
        <Grid2 item xs={12}>
          <Paper sx={{ p: 2 }}>
            <InterpretabilityPanel pipelineId={pipelineId} />
          </Paper>
        </Grid2>
      </Grid2>
    </Container>
  );
};

export default Validation;