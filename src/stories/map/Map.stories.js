import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import Marker from '../../components/map/Marker';
import { Box } from '@mui/material';

export default {
    title: 'Map/Marker',
    component: Marker,
    parameters: {
        layout: 'centered',
        backgrounds: {
            default: 'dark',
            values: [
                {
                    name: 'dark',
                    value: '#1a1a1a',
                },
            ],
        },
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <Box sx={{ height: '600px', width: '600px', backgroundColor: '#3a3a3a' }}>
                <MapContainer
                    center={[41.881832, -87.623177]} // Chicago coordinates
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer url={`https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${process.env.REACT_APP_MAPTILER_KEY || ''}`} />
                    <Story />
                </MapContainer>
            </Box>
        ),
    ],
    argTypes: {
        data: {
            control: 'object',
            description: 'Marker data including location, wait times, and facility info',
        },
        filter: {
            control: 'object',
            description: 'Filter settings for determining marker visibility',
        },
        setModalOpen: {
            action: 'modalOpened',
            description: 'Function called with marker data when clicked',
        },
        setModalVisible: {
            action: 'modalVisibilityChanged',
            description: 'Function called to control modal visibility',
        },
    },
};


// Base marker data
const baseMarkerData = {
    id: '1',
    title: 'Downtown Medical Center',
    lat: 41.873545,
    lng: -87.623177,
    type: 'Urgent Care',
    queueEnabled: true,
    rating: 4.5,
    users: [],
    customPhone: '555-123-4567',
    telehealth: true,
    pending: false,
};

// Helper function to create marker data with different wait times
const createMarkerWithWaitTime = (waitTime) => ({
    ...baseMarkerData,
    id: `marker-${waitTime}`,
    averageWaitTime: waitTime,
    title: `Marker with ${waitTime} min wait time`,
    lat: 41.881832 + (Math.random() - 0.5) * 0.02, // Small random offset
    lng: -87.623177 + (Math.random() - 0.5) * 0.02,
});

// Helper function to create marker data with wait score
const createMarkerWithWaitScore = (score) => ({
    ...baseMarkerData,
    id: `marker-score-${score}`,
    waitScore: score,
    title: `Marker with ${score} wait score`,
    lat: 41.881832 + (Math.random() - 0.5) * 0.02,
    lng: -87.623177 + (Math.random() - 0.5) * 0.02,
});

// Standard filter object that shows all markers
const standardFilter = {
    facility: 'all',
    rating: 0,
};

// Emergency department filter
const emergencyFilter = {
    facility: 'emergency',
    rating: 0,
};

// Clinic filter
const clinicFilter = {
    facility: 'clinic',
    rating: 0,
};


// Multiple markers with different states
export const MultipleMarkers = {
    render: (args) => (
        <>
            <Marker
                data={createMarkerWithWaitTime(20)}
                filter={standardFilter}
                setModalOpen={args.setModalOpen}
                setModalVisible={args.setModalVisible}
            />
            <Marker
                data={createMarkerWithWaitTime(120)}
                filter={standardFilter}
                setModalOpen={args.setModalOpen}
                setModalVisible={args.setModalVisible}
            />
            <Marker
                data={createMarkerWithWaitTime(300)}
                filter={standardFilter}
                setModalOpen={args.setModalOpen}
                setModalVisible={args.setModalVisible}
            />
            <Marker
                data={{
                    ...baseMarkerData,
                    type: 'Emergency Department',
                    title: 'Emergency Department',
                    lat: 41.878113,
                    lng: -87.629799,
                }}
                filter={standardFilter}
                setModalOpen={args.setModalOpen}
                setModalVisible={args.setModalVisible}
            />
        </>
    ),
};
