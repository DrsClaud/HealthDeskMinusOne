import React from 'react';
import SvgMarker from '../../components/styled/SvgMarker';
import { Box, Typography } from '@mui/material';

export default {
  title: 'Map/MarkerVisual',
  component: SvgMarker,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1a1a1a' },
        { name: 'map', value: '#e5e3df' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    queueEnabled: {
      control: 'boolean',
      description: 'Whether queue functionality is enabled for this marker',
    },
    baseHue: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: 'Color value between 0 and 1 (red to green)',
    },
    owned: {
      control: 'boolean',
      description: 'Whether the marker represents a facility with registered users',
    },
    visible: {
      control: 'boolean',
      description: 'Whether the marker is visible',
    },
    type: {
      control: 'select',
      options: ['Urgent Care', 'Emergency Department', 'Clinic'],
      description: 'Type of healthcare facility',
    },
  },
};

// Wrapper component to display a marker with proper scale
const MarkerDisplay = ({ children, label }) => (
  <Box sx={{ 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center',
    m: 2,
    p: 2,
    border: '1px solid #eee',
    borderRadius: 2,
    width: 150,
    height: 180,
  }}>
    <Box sx={{ 
      position: 'relative',
      height: 120,
      width: 120,
      transform: 'scale(3)',
      transformOrigin: 'center',
      mt: 2
    }}>
      {children}
    </Box>
    <Typography variant="caption" sx={{ mt: 'auto', textAlign: 'center' }}>
      {label}
    </Typography>
  </Box>
);

// Main story
export const MarkerVariations = {
  render: (args) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
      <MarkerDisplay label="Default Marker">
        <SvgMarker
          queueEnabled={true}
          baseHue={0.5}
          owned={false}
          visible={true}
          type="Urgent Care"
        />
      </MarkerDisplay>
      
      <MarkerDisplay label="Emergency Department">
        <SvgMarker
          queueEnabled={true}
          baseHue={0.8}
          owned={false}
          visible={true}
          type="Emergency Department"
        />
      </MarkerDisplay>
      
      <MarkerDisplay label="Low Score (Red)">
        <SvgMarker
          queueEnabled={true}
          baseHue={0.1}
          owned={false}
          visible={true}
          type="Urgent Care"
        />
      </MarkerDisplay>
      
      <MarkerDisplay label="High Score (Green)">
        <SvgMarker
          queueEnabled={true}
          baseHue={0.9}
          owned={false}
          visible={true}
          type="Urgent Care"
        />
      </MarkerDisplay>
      
      <MarkerDisplay label="Owned Facility">
        <SvgMarker
          queueEnabled={true}
          baseHue={0.6}
          owned={true}
          visible={true}
          type="Urgent Care"
        />
      </MarkerDisplay>
      
      <MarkerDisplay label="Queue Disabled">
        <SvgMarker
          queueEnabled={false}
          baseHue={0.5}
          owned={false}
          visible={true}
          type="Urgent Care"
        />
      </MarkerDisplay>
    </Box>
  )
};

// Interactive story with controls
export const InteractiveMarker = {
  args: {
    queueEnabled: true,
    baseHue: 0.5,
    owned: false,
    visible: true,
    type: 'Urgent Care',
  },
  render: (args) => (
    <Box sx={{ 
      position: 'relative',
      height: 150,
      width: 150,
      transform: 'scale(4)',
      transformOrigin: 'center',
    }}>
      <SvgMarker {...args} />
    </Box>
  )
}; 