// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import AppHeader from './components/AppHeader';
import SideNav from './components/SideNav';
import Dashboard from './views/Dashboard';
import Deployment from './views/Deployment';
import Monitoring from './views/Monitoring';
import Validation from './views/Validation';
import CreatePipeline from './views/CreatePipeline';

function App() {
  return (
    <Router>
      <Box sx={{ display: 'flex' }}>
        {/* Fixed Header */}
        <AppHeader />
        
        {/* Sidebar Navigation */}
        <SideNav />

        {/* Main content area */}
        <Box component="main" sx={{ flexGrow: 1, p: 3, mt: '64px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/deployment" element={<Deployment />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/validation" element={<Validation />} />
            <Route path="/create-pipeline" element={<CreatePipeline />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}

export default App;
