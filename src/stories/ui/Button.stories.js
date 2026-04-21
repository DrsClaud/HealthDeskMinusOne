import React from 'react';
import { ThemeProvider } from 'styled-components';
import Button from '../../components/styled/Button';
import { LoadingButton } from '@mui/lab';
import { CircularProgress } from '@mui/material';

const theme = {
    colors: {
        primary: '#117ACA',
        secondary: '#1B4584',
        white: '#FFFFFF',
        gray: '#EEEEEE',
        darkgray: '#666666'
    }
};

export default {
    title: 'UI/Button',
    component: Button,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        $small: {
            control: 'boolean',
            description: 'Whether to render a smaller button',
        },
        $secondary: {
            control: 'boolean',
            description: 'Whether to use secondary color styling',
        },
        $gray: {
            control: 'boolean',
            description: 'Whether to use gray styling',
        },
        $noMargin: {
            control: 'boolean',
            description: 'Whether to remove default margins',
        },
        disabled: {
            control: 'boolean',
            description: 'Whether the button is disabled',
        },
        children: {
            control: 'text',
            description: 'Button content',
        }
    },
    decorators: [
        (Story) => (
            <ThemeProvider theme={theme}>
                <Story />
            </ThemeProvider>
        ),
    ],
};

// Primary button
export const Primary = {
    args: {
        children: 'Primary Button',
        $small: false,
        $secondary: false,
        $gray: false,
        $noMargin: false,
        disabled: false
    }
};

// Secondary button
export const Secondary = {
    args: {
        children: 'Secondary Button',
        $secondary: true,
        $small: false,
        $gray: false,
        $noMargin: false,
        disabled: false
    }
};

// Small button
export const Small = {
    args: {
        children: 'Small Button',
        $small: true,
        $secondary: false,
        $gray: false,
        $noMargin: false,
        disabled: false
    }
};

// Gray button
export const Gray = {
    args: {
        children: 'Gray Button',
        $gray: true,
        $small: false,
        $secondary: false,
        $noMargin: false,
        disabled: false
    }
};

// Loading button example
export const Loading = () => (
    <LoadingButton
        loading={true}
        variant="contained"
        size="large"
        sx={{ minWidth: 200 }}
    >
        Loading Button
    </LoadingButton>
);

// Disabled button
export const Disabled = {
    args: {
        children: 'Disabled Button',
        disabled: true,
        $small: false,
        $secondary: false,
        $gray: false,
        $noMargin: false
    }
};

// No margin button
export const NoMargin = {
    args: {
        children: 'No Margin Button',
        $noMargin: true,
        $small: false,
        $secondary: false,
        $gray: false,
        disabled: false
    }
}; 