import React from 'react';
import HelpIcon from "../../components/common/HelpIcon";

export default {
    title: 'UI/HelpIcon',
    component: HelpIcon,
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
    argTypes: {
        radius: {
            control: 'number',
            description: 'Size of the help icon in pixels',
        },
        text: {
            control: 'text',
            description: 'Help text to display when clicked',
        }
    }
};

// Default help icon
export const Default = {
    args: {
        radius: 50,
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. <br><br> Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    }
};
