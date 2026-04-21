import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Box } from "@mui/material";
import ClinicalReferencesPanel from "../../pages/dashboard/admin/prompts/components/ClinicalReferencesPanel";

const meta: Meta<typeof ClinicalReferencesPanel> = {
  title: "Prompts/ClinicalReferencesPanel",
  component: ClinicalReferencesPanel,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ClinicalReferencesPanel>;

export const EmptyState: Story = {
  render: (args) => (
    <Box sx={{ maxWidth: 900 }}>
      <ClinicalReferencesPanel {...args} />
    </Box>
  ),
  args: {
    references: [],
    disabled: false,
  },
};

export const WithReferences: Story = {
  render: (args) => (
    <Box sx={{ maxWidth: 900 }}>
      <ClinicalReferencesPanel {...args} />
    </Box>
  ),
  args: {
    disabled: false,
    references: [
      {
        id: "ref-1",
        fileName: "Sepsis_Management_Guideline_2025.pdf",
        source: "WHO",
        specialty: "Emergency Medicine",
        documentType: "guideline",
        createdAt: "2026-03-10T10:00:00.000Z",
      },
      {
        id: "ref-2",
        fileName: "Pediatric_Asthma_Protocol.pdf",
        source: "Local MOH",
        specialty: "Pediatrics",
        documentType: "protocol",
        createdAt: "2026-03-01T08:30:00.000Z",
      },
    ],
  },
};

export const Disabled: Story = {
  render: (args) => (
    <Box sx={{ maxWidth: 900 }}>
      <ClinicalReferencesPanel {...args} />
    </Box>
  ),
  args: {
    disabled: true,
    references: [
      {
        id: "ref-1",
        fileName: "Acute_Coronary_Syndrome_Algorithm.pdf",
        source: "ESC",
        specialty: "Cardiology",
        documentType: "algorithm",
        createdAt: "2026-02-20T10:30:00.000Z",
      },
    ],
  },
};
