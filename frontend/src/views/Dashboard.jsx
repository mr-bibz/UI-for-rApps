// src/views/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Button, Stack } from '@mui/material';
import Grid2 from '@mui/material/Grid2'; // Updated import for new Grid API
import { useNavigate } from 'react-router-dom';
import { fetchMlPipelines, deleteMlPipeline } from '../api/apiService';

const Dashboard = () => {
  const [pipelines, setPipelines] = useState([]);
  const navigate = useNavigate();

  // Function to load pipelines from the backend
  const loadPipelines = async () => {
    try {
      const response = await fetchMlPipelines();
      setPipelines(response.data);
    } catch (error) {
      console.error('Error fetching pipelines:', error);
    }
  };

  // Delete a pipeline and refresh the list
  const handleDelete = async (pipelineId) => {
    try {
      await deleteMlPipeline(pipelineId);
      loadPipelines();
    } catch (error) {
      console.error('Error deleting pipeline:', error);
    }
  };

  // Load pipelines on mount and refresh every 10 seconds
  useEffect(() => {
    loadPipelines();
    const interval = setInterval(loadPipelines, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Button to navigate to the "Create New Pipeline" page */}
      <Button
        variant="contained"
        color="primary"
        sx={{ mb: 3 }}
        onClick={() => navigate('/create-pipeline')}
      >
        Create New Pipeline
      </Button>

      {/* Display a grid of pipeline cards using Unstable_Grid2 */}
      <Grid2 container spacing={3}>
        {pipelines.length > 0 ? (
          pipelines.map((pipeline) => (
            <Grid2 xs={12} sm={6} md={4} key={pipeline._id}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6">{pipeline.name}</Typography>
                <Typography variant="body2">
                  Template: {pipeline.template}
                </Typography>
                <Typography variant="body2">
                  Status: {pipeline.status}
                </Typography>
                <Typography variant="body2">
                  Created: {new Date(pipeline.createdAt).toLocaleString()}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate('/view-pipeline/${pipeline._id}')}
                    >
                    View
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate('/edit-pipeline/${pipeline._id}')}
                    >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => handleDelete(pipeline._id)}
                  >
                    Delete
                  </Button>
                </Stack>
              </Paper>
            </Grid2>
          ))
        ) : (
          <Typography variant="body1">No pipelines available.</Typography>
        )}
      </Grid2>
    </Container>
  );
};

export default Dashboard;