// src/components/AppHeader.jsx
import React from 'react';
import { AppBar, Toolbar, Typography } from '@mui/material';

const AppHeader = () => {
  return (
    <AppBar 
      position="fixed" 
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          rApp ML Hub
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader;