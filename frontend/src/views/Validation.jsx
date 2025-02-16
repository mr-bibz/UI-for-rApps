// src/views/Validation.jsx
import React from 'react';
import { Container, Typography } from '@mui/material';
import Grid2 from '@mui/material/Grid2';
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
      <Grid2 container spacing={3}>
        {/* NiFi Ingestion Chart */}
        <Grid2 xs={12} md={6}>
          <NifiIngestionChart />
        </Grid2>
        {/* Spark Training Chart */}
        <Grid xs={12} md={6}>
          <SparkTrainingChart />
        </Grid>
        {/* Pipeline Health Status */}
        <Grid2 xs={12} md={6}>
          <PipelineHealthStatus />
        </Grid2>
        {/* Recent Error Logs */}
        <Grid2 xs={12} md={6}>
          <ErrorLogsTable />
        </Grid2>
      </Grid2>
    </Container>
  );
};

export default Validation;