// src/components/SideNav.jsx
import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BuildIcon from '@mui/icons-material/Build';
import MonitorIcon from '@mui/icons-material/Assessment';
import VerifiedIcon from '@mui/icons-material/Verified';
import { Link } from 'react-router-dom';

const drawerWidth = 240;

const SideNav = () => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        ['& .MuiDrawer-paper']: {width: drawerWidth, boxSizing: 'border-box'},
    }}
    >
      <List>
        <ListItem button component={Link} to="/">
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button component={Link} to="/deployment">
          <ListItemIcon>
            <BuildIcon />
          </ListItemIcon>
          <ListItemText primary="Deployment" />
        </ListItem>
        <ListItem button component={Link} to="/monitoring">
          <ListItemIcon>
            <MonitorIcon />
          </ListItemIcon>
          <ListItemText primary="Monitoring" />
        </ListItem>
        <ListItem button component={Link} to="/validation">
          <ListItemIcon>
            <VerifiedIcon />
          </ListItemIcon>
          <ListItemText primary="Validation" />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default SideNav;