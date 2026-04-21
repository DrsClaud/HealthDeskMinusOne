import React from 'react';
import BetaDisclaimer from '../components/dashboard/BetaDisclaimer';

export default {
    title: 'Dashboard/BetaDisclaimer',
    component: BetaDisclaimer,
    parameters: {
        layout: 'padded',
    },
};

// Default state story
export const Default = {
    args: {}
};

// Story showing how it looks in a page context
export const InPageContext = {
    decorators: [
        (Story) => (
            <div style={{ height: '100vh', position: 'relative' }}>
                <div style={{ padding: '20px' }}>
                    <h1>Page Content</h1>
                    <p>Some example content above the disclaimer...</p>
                </div>
                <Story />
            </div>
        ),
    ],
    args: {}
}; 