import React from 'react';
import QueueDisplay from '../components/queue/splitflap/QueueDisplay';

export default {
    title: 'Queue/QueueDisplay',
    component: QueueDisplay,
    parameters: {
        layout: 'padded',
    },
};

// Mock queue data
const mockQueue = [
    { id: 1, phone: '555-123-4567', date: new Date().getTime() },
    { id: 2, phone: '555-234-5678', date: new Date().getTime() - 1000 * 60 * 15 },
    { id: 3, phone: '555-345-6789', date: new Date().getTime() - 1000 * 60 * 30 },
];

// Default display
export const Default = {
    args: {
        queue: mockQueue,
        showClock: true,
        showHeader: true,
        compact: false,
    },
};

// Compact display
export const Compact = {
    args: {
        queue: mockQueue,
        showClock: true,
        showHeader: true,
        compact: true,
    },
};

// No clock or header
export const MinimalDisplay = {
    args: {
        queue: mockQueue,
        showClock: false,
        showHeader: false,
        compact: false,
    },
};

// Empty queue
export const EmptyQueue = {
    args: {
        queue: [],
        showClock: true,
        showHeader: true,
        compact: false,
    },
}; 