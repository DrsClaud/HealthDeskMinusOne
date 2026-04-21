import React from 'react';
import ColorGradient from '../../components/dashboard/ColorGradient';

export default {
    title: 'Map/ColorGradient',
    component: ColorGradient,
    parameters: {
        layout: 'centered',
        backgrounds: {
            // default: 'dark',F
            // values: [
            //     { name: 'dark', value: '#2d2d2d' },
            // ],
        },
    },
    tags: ['autodocs'],
    argTypes: {
        startColor: {
            control: 'color',
            description: 'Starting color of the gradient',
        },
        endColor: {
            control: 'color',
            description: 'Ending color of the gradient',
        },
        width: {
            control: 'number',
            description: 'Width of the component in pixels',
        },
        height: {
            control: 'number',
            description: 'Height of the component in pixels',
        },
        onChange: {
            description: 'Callback function when a color is selected',
        },
    },
};

// Default gradient display
export const Default = {
    args: {
        width: 600,
        height: 200,
        startColor: '#841B45',
        endColor: '#45841B'
    }
};

// Custom colors
export const CustomColors = {
    args: {
        width: 600,
        height: 200,
        startColor: '#FF0000',
        endColor: '#0000FF'
    }
}; 