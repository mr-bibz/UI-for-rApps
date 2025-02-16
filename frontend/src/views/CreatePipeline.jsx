// src/views/CreatePipeline.jsx
import React, { useState } from 'react';
import { Container, Typography, Box, TextField, Button, Stack, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { createMlPipeline } from '../api/apiService';

const CreatePipeline = () => {
  const navigate = useNavigate();
  const [pipelineName, setPipelineName] = useState('');
  const [template, setTemplate] = useState('default');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare JSON payload with pipeline name and template
      const payload = { name: pipelineName, template };
      await createMlPipeline(payload);
      navigate('/');
    } catch (error) {
      console.error('Error creating pipeline:', error);
    }
  };

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Create New Pipeline
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <TextField
          required
          label="Pipeline Name"
          value={pipelineName}
          onChange={(e) => setPipelineName(e.target.value)}
          fullWidth
        />
        <TextField
          select
          label="Template"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          fullWidth
          helperText="Select the pipeline template"
        >
          <MenuItem value="default">Default</MenuItem>
          <MenuItem value="qos-optimization">QoS Optimization</MenuItem>
          <MenuItem value="anomaly-detection">Anomaly Detection</MenuItem>
        </TextField>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button type="submit" variant="contained" color="primary">
            Create Pipeline
          </Button>
          <Button variant="outlined" onClick={() => navigate('/')}>
            Cancel
          </Button>
        </Stack>
      </Box>
    </Container>
  );
};

export default CreatePipeline;