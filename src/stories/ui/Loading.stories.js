import React from 'react';
import { ThemeProvider } from 'styled-components';
import Loading from '../../components/Loading';

const theme = {
    colors: {
        primary: '#117ACA',
        white: '#FFFFFF',
    }
};

export default {
    title: 'UI/Loading',
    component: Loading,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        page: {
            control: 'boolean',
            description: 'Whether the loading spinner should take up full page height',
        },
        search: {
            control: 'boolean',
            description: 'Whether the loading spinner is used in a search context',
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

// Full page loading spinner
export const FullPage = {
    args: {
        page: true,
        search: false
    }
};
