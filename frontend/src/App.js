// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import AppHeader from './components/AppHeader';
import SideNav from './components/SideNav';
import Dashboard from './views/Dashboard';
import CreatePipeline from './views/CreatePipeline';
import Deployment from './views/Deployment';
import Monitoring from './views/Monitoring';
import Validation from './views/Validation';

function App() {
  return (
    <Router>
      <Box sx={{ display: 'flex' }}>
        {/* Fixed Header */}
        <AppHeader />
        {/* Sidebar Navigation */}
        <SideNav />
        {/* Main content area */}
        <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create-pipeline" element={<CreatePipeline />} />
            <Route path="/deployment/:pipelineId" element={<Deployment />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/validation/:pipelineId" element={<Validation />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}

export default App;