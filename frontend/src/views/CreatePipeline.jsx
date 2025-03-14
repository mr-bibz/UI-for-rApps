// src/views/CreatePipeline.jsx
import React, { useState } from 'react';
import { Container, Typography, Box, TextField, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { createMlPipeline } from '../api/apiService';

const CreatePipeline = () => {
  const navigate = useNavigate();
  const [pipelineName, setPipelineName] = useState('');
  const [datasetFile, setDatasetFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setDatasetFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pipelineName || !datasetFile) {
      alert('Please provide both a pipeline name and a dataset file.');
      return;
    }
    try {
      // Create a FormData object to hold the pipeline name and dataset file.
      const formData = new FormData();
      formData.append('name', pipelineName);
      formData.append('dataset', datasetFile);

      await createMlPipeline(formData);
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
        <Button variant="contained" component="label">
          Import Dataset File
          <input
            type="file"
            hidden
            onChange={handleFileChange}
            accept=".csv, .json, .xlsx"
          />
        </Button>
        {datasetFile && (
          <Typography variant="body1">
            Selected file: {datasetFile.name}
          </Typography>
        )}
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