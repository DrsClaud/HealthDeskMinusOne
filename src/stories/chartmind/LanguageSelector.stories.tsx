/**
 * LanguageSelector Storybook Stories
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import LanguageSelector from '../../components/dashboard/chartmind/common/LanguageSelector';

const meta: Meta<typeof LanguageSelector> = {
  title: 'ChartMind/LanguageSelector',
  component: LanguageSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof LanguageSelector>;

/**
 * Interactive wrapper for controlled component
 */
const LanguageSelectorWrapper = (args: any) => {
  const [language, setLanguage] = useState(args.value || 'en-US');
  
  return (
    <Box sx={{ p: 2 }}>
      <LanguageSelector
        {...args}
        value={language}
        onChange={setLanguage}
      />
    </Box>
  );
};

/**
 * Default - English selected
 */
export const Default: Story = {
  render: (args) => <LanguageSelectorWrapper {...args} />,
  args: {
    value: 'en-US',
    disabled: false,
  },
};

/**
 * Spanish selected
 */
export const Spanish: Story = {
  render: (args) => <LanguageSelectorWrapper {...args} />,
  args: {
    value: 'es-ES',
    disabled: false,
  },
};

/**
 * Swahili selected
 */
export const Swahili: Story = {
  render: (args) => <LanguageSelectorWrapper {...args} />,
  args: {
    value: 'sw-KE',
    disabled: false,
  },
};

/**
 * Disabled state
 */
export const Disabled: Story = {
  render: (args) => <LanguageSelectorWrapper {...args} />,
  args: {
    value: 'en-US',
    disabled: true,
  },
};
