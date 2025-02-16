// src/components/InterpretabilityPanel.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableRow, TableContainer, Paper } from '@mui/material';
import { fetchInterpretabilityMetrics } from '../api/apiService';

const InterpretabilityPanel = ({ pipelineId }) => {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const response = await fetchInterpretabilityMetrics(pipelineId);
        setMetrics(response.data);
      } catch (error) {
        console.error('Error fetching interpretability metrics:', error);
      }
    };
    loadMetrics();
  }, [pipelineId]);

  if (!metrics) {
    return <Typography>Loading interpretability metrics...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Feature Importance (Heatmap)
      </Typography>
      <Typography variant="subtitle2" gutterBottom>
        Feature Importances:
      </Typography>
      {/* Display feature importances as a simple table */}
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableBody>
            {metrics.featureImportance.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>{item.feature}</TableCell>
                <TableCell>{item.importance.toFixed(3)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle2" gutterBottom>
        Heatmap:
      </Typography>
      {/* Display the heatmap: a 2D grid of numbers */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableBody>
            {metrics.heatmap.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((value, colIndex) => (
                  <TableCell key={colIndex} sx={{ 
                    backgroundColor: 'rgba(136, 132, 216, ${value})',
                    color: value > 0.5 ? 'white' : 'black'
                  }}>
                    {value.toFixed(2)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default InterpretabilityPanel;
