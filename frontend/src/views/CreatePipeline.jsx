// src/views/CreatePipeline.jsx
import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  MenuItem,
  Stack,
} from '@mui/material';
import { createMlPipeline } from '../api/apiService';
import { useNavigate } from 'react-router-dom';

const pipelineTemplates = [
  {
    value: 'default',
    label: 'Default Pipeline',
  },
  {
    value: 'qos-optimization',
    label: 'QoS Optimization',
  },
  {
    value: 'anomaly-detection',
    label: 'Anomaly Detection',
  },
  // Add more templates as needed
];

const CreatePipeline = () => {
  const navigate = useNavigate();

  // Simplified form state: only name and template
  const [pipelineName, setPipelineName] = useState('');
  const [template, setTemplate] = useState('default');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare the new pipeline configuration using default settings for the selected template.
    const newPipeline = {
      name: pipelineName,
      template, // the selected template; the backend will use this to assign default configurations
      // Optionally, you can include additional fields if needed, but defaults will be applied otherwise.
    };

    try {
      await createMlPipeline(newPipeline);
      // After creation, navigate back to the dashboard
      navigate('/');
    } catch (error) {
      console.error('Error creating pipeline:', error);
      // Optionally, display an error message to the user
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
          label="Pipeline Template"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          helperText="Select a default configuration template"
          fullWidth
        >
          {pipelineTemplates.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
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