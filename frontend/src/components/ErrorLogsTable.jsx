// src/components/ErrorLogsTable.jsx
import React, { useEffect, useState } from 'react';
import { fetchErrorLogs } from '../api/apiService';
import {
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  Paper,
  Typography,
} from '@mui/material';

const ErrorLogsTable = () => {
  const [logs, setLogs] = useState([]);

  const loadLogs = async () => {
    try {
      const response = await fetchErrorLogs(); // Optionally pass a severity filter
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching error logs:', error);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Error Logs
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Timestamp</TableCell>
            <TableCell>Component</TableCell>
            <TableCell>Message</TableCell>
            <TableCell>Severity</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log._id}>
              <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
              <TableCell>{log.component}</TableCell>
              <TableCell>{log.message}</TableCell>
              <TableCell>{log.severity}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default ErrorLogsTable;