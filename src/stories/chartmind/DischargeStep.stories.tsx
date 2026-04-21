import type { Meta, StoryObj } from '@storybook/react';
import DischargeInstructionsList from '../../components/dashboard/chartmind/DischargeInstructionsList';

const meta: Meta<typeof DischargeInstructionsList> = {
  title: 'ChartMind/DischargeInstructionsList',
  component: DischargeInstructionsList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DischargeInstructionsList>;

const mockInstructions = [
  {
    id: 'med-gen-1',
    title: 'Medication Instructions (General)',
    category: 'medication_general',
    prose: 'Take all medications exactly as prescribed by your doctor. Do not stop taking any medication without talking to your doctor first. If you have questions about your medications, ask your pharmacist or doctor.',
    dependsOn: [],
    includedByDefault: true,
  },
  {
    id: 'med-spec-1',
    title: 'Antibiotic Instructions - Amoxicillin',
    category: 'medication_specific',
    prose: 'Take your Amoxicillin exactly as prescribed. Take it with food to avoid stomach upset. Finish all the medicine even if you start feeling better. Do not skip doses. If you miss a dose, take it as soon as you remember, but do not take two doses at once.',
    dependsOn: ['antibiotic'],
    includedByDefault: true,
    medicationName: 'Amoxicillin',
  },
  {
    id: 'med-spec-2',
    title: 'Pain Medication Instructions - Ibuprofen',
    category: 'medication_specific',
    prose: 'Take Ibuprofen with food or milk to prevent stomach upset. Do not take more than directed. If pain is not controlled, contact your doctor. Do not take if you have stomach ulcers or kidney problems.',
    dependsOn: ['analgesic'],
    includedByDefault: true,
    medicationName: 'Ibuprofen',
  },
  {
    id: 'activity-1',
    title: 'Activity Restrictions',
    category: 'activity',
    prose: 'Rest as much as possible for the next 48 hours. Avoid heavy lifting (more than 10 pounds). You may return to normal activities gradually as you feel better. Listen to your body and do not push yourself too hard.',
    dependsOn: [],
    includedByDefault: true,
  },
  {
    id: 'diet-1',
    title: 'Diet Instructions',
    category: 'diet',
    prose: 'Eat a normal diet unless your doctor tells you otherwise. Drink plenty of fluids (water, juice, soup) to stay hydrated. Avoid alcohol while taking antibiotics. If you have nausea, try eating small, frequent meals.',
    dependsOn: [],
    includedByDefault: true,
  },
  {
    id: 'followup-1',
    title: 'Follow-up Instructions',
    category: 'followup',
    prose: 'Follow up with your primary care doctor within 1 week. Call to schedule an appointment. Bring this discharge paperwork with you. Your doctor may want to check your progress and adjust your treatment.',
    dependsOn: [],
    includedByDefault: true,
  },
  {
    id: 'warning-1',
    title: 'Warning Signs - When to Return',
    category: 'warning_signs',
    prose: 'Return to the emergency department immediately if you develop: fever over 101°F, increased pain or swelling, difficulty breathing, chest pain, confusion, severe headache, or any other concerning symptoms. If you are unsure, it is better to be safe and get checked.',
    dependsOn: [],
    includedByDefault: true,
  },
  {
    id: 'wound-1',
    title: 'Wound Care Instructions',
    category: 'wound_care',
    prose: 'Keep the wound clean and dry. Change the bandage once daily or if it gets wet or dirty. Wash your hands before touching the wound. Watch for signs of infection: increased redness, swelling, warmth, pus, or red streaks. If you see any of these signs, contact your doctor.',
    dependsOn: [],
    includedByDefault: false,
  },
];

/**
 * Default state with all instructions and some included by default
 */
export const Default: Story = {
  args: {
    instructions: mockInstructions,
    includedInstructionIds: new Set([
      'med-gen-1',
      'med-spec-1',
      'med-spec-2',
      'activity-1',
      'diet-1',
      'followup-1',
      'warning-1',
    ]),
    isAnalyzing: false,
  },
};

/**
 * All instructions included
 */
export const AllIncluded: Story = {
  args: {
    instructions: mockInstructions,
    includedInstructionIds: new Set(mockInstructions.map(i => i.id)),
    isAnalyzing: false,
  },
};

/**
 * Minimal instructions (only medication and follow-up)
 */
export const MinimalInstructions: Story = {
  args: {
    instructions: mockInstructions.filter(i => 
      i.category === 'medication_general' || 
      i.category === 'medication_specific' || 
      i.category === 'followup'
    ),
    includedInstructionIds: new Set([
      'med-gen-1',
      'med-spec-1',
      'followup-1',
    ]),
    isAnalyzing: false,
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    instructions: [],
    includedInstructionIds: new Set(),
    isAnalyzing: true,
  },
};

/**
 * Empty state (no instructions generated)
 */
export const Empty: Story = {
  args: {
    instructions: [],
    includedInstructionIds: new Set(),
    isAnalyzing: false,
  },
};

/**
 * None included (all unchecked)
 */
export const NoneIncluded: Story = {
  args: {
    instructions: mockInstructions,
    includedInstructionIds: new Set(),
    isAnalyzing: false,
  },
};
