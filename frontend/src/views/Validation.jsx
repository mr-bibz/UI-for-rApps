// src/views/Validation.jsx
import React from 'react';
import { Container, Typography } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import NifiIngestionChart from '../components/NifiIngestionChart';
import SparkTrainingChart from '../components/SparkTrainingChart';
import PipelineHealthStatus from '../components/PipelineHealthStatus';
import ErrorLogsTable from '../components/ErrorLogsTable';

const Validation = () => {
  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Validation & ML Performance
      </Typography>
      <Grid container spacing={3}>
        {/* NiFi Ingestion Chart */}
        <Grid xs={12} md={6}>
          <NifiIngestionChart />
        </Grid>
        {/* Spark Training Chart */}
        <Grid xs={12} md={6}>
          <SparkTrainingChart />
        </Grid>
        {/* Pipeline Health Status */}
        <Grid xs={12} md={6}>
          <PipelineHealthStatus />
        </Grid>
        {/* Recent Error Logs */}
        <Grid xs={12} md={6}>
          <ErrorLogsTable />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Validation;