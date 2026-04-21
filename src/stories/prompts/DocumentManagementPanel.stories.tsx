import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Box } from "@mui/material";
import DocumentManagementPanel from "../../pages/dashboard/admin/prompts/components/DocumentManagementPanel";

const meta: Meta<typeof DocumentManagementPanel> = {
  title: "Prompts/DocumentManagementPanel",
  component: DocumentManagementPanel,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DocumentManagementPanel>;

export const EmptyState: Story = {
  render: (args) => (
    <Box sx={{ maxWidth: 900 }}>
      <DocumentManagementPanel {...args} />
    </Box>
  ),
  args: {
    disabled: false,
  },
};

export const WithDocuments: Story = {
  render: (args) => (
    <Box sx={{ maxWidth: 900 }}>
      <DocumentManagementPanel {...args} />
    </Box>
  ),
  args: {
    disabled: false,
  },
};

export const Disabled: Story = {
  render: (args) => (
    <Box sx={{ maxWidth: 900 }}>
      <DocumentManagementPanel {...args} />
    </Box>
  ),
  args: {
    disabled: true,
  },
};
