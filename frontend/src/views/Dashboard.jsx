// src/views/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { fetchMlPipelines, deleteMlPipeline } from '../api/apiService';

const Dashboard = () => {
  const [pipelines, setPipelines] = useState([]);
  const navigate = useNavigate();

  // Load pipelines from the backend
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

  // Navigate to the deployment page for a specific pipeline
  const handleView = (pipelineId) => {
    navigate(`/deployment/${pipelineId}`);
  };

  useEffect(() => {
    loadPipelines();
  }, []);

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        RAN Telemetry Pipelines Dashboard
      </Typography>
      
      {/* Button to navigate to Create Pipeline Page */}
      <Button
        variant="contained"
        color="primary"
        sx={{ mb: 3 }}
        onClick={() => navigate('/create-pipeline')}
      >
        Create New Pipeline
      </Button>

      {/* Pipelines Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Dataset</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Last Run</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pipelines.length > 0 ? (
              pipelines.map((pipeline) => (
                <TableRow key={pipeline._id}>
                  <TableCell>{pipeline.name}</TableCell>
                  <TableCell>{pipeline.dataset}</TableCell>
                  <TableCell>{new Date(pipeline.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    {pipeline.lastRun ? new Date(pipeline.lastRun).toLocaleString() : 'N/A'}
                  </TableCell>
                  <TableCell>{pipeline.status}</TableCell>
                  <TableCell align="center">
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => handleView(pipeline._id)}
                    >
                      Deploy
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleDelete(pipeline._id)}
                      sx={{ ml: 1 }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6}>No pipelines available.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default Dashboard;