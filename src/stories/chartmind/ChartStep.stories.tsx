import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import ChartStep from '../../components/dashboard/chartmind/ChartStep';

const meta: Meta<typeof ChartStep> = {
  title: 'ChartMind/ChartStep',
  component: ChartStep,
  parameters: {
    layout: 'fullscreen',
    padded: true,
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ChartStep>;

const mockTemplate = {
  name: 'SOAP Note',
  sections: [
    {
      key: 'subjective',
      title: 'Subjective',
      placeholder: 'Chief complaint, HPI, ROS, PMH/PSH/FH/SH...',
    },
    {
      key: 'objective',
      title: 'Objective',
      placeholder: 'Vital signs, physical examination findings, test results...',
    },
    {
      key: 'assessment',
      title: 'Assessment',
      placeholder: 'Clinical summary, differential diagnosis, working diagnosis...',
    },
    {
      key: 'plan',
      title: 'Plan',
      placeholder: 'Treatment plan, medications, follow-up, patient education...',
    },
  ],
};

const mockNoteSections = {
  subjective: `Chief Complaint: Chest pain

History of Present Illness:
Patient is a 45-year-old male presenting with chest pain that started 2 hours ago while exercising. Patient describes the pain as a pressure-like sensation in the center of his chest, rated 7/10 in severity. The pain does not radiate. He denies shortness of breath, nausea, vomiting, or diaphoresis. Pain has improved somewhat with rest.

Review of Systems:
Constitutional: Denies fever, chills, weight changes
Cardiovascular: Chest pain as described, denies palpitations
Respiratory: Denies shortness of breath, cough
GI: Denies nausea, vomiting, abdominal pain

Past Medical History: Hypertension, hyperlipidemia
Past Surgical History: None
Family History: Father with MI at age 55
Social History: Non-smoker, occasional alcohol use, sedentary lifestyle`,

  objective: `Vital Signs:
BP: 145/90 mmHg
HR: 88 bpm
RR: 16/min
Temp: 98.6°F
SpO2: 98% on room air

Physical Examination:
General: Alert, anxious-appearing male in no acute distress
Cardiovascular: Regular rate and rhythm, no murmurs, rubs, or gallops. No JVD. Peripheral pulses 2+ bilaterally
Respiratory: Clear to auscultation bilaterally, no wheezes or crackles
Abdomen: Soft, non-tender, non-distended

Diagnostic Results:
EKG: Normal sinus rhythm, no ST-segment changes
Troponin: Negative (< 0.01 ng/mL)`,

  assessment: `Assessment:
1. Chest Pain - Rule out Acute Coronary Syndrome
   - Patient presents with typical cardiac risk factors (age, male, hypertension, hyperlipidemia, family history)
   - Pain occurred during exertion but resolved with rest
   - Initial troponin negative, normal EKG
   - Differential includes ACS, musculoskeletal pain, anxiety

2. Hypertension - currently elevated BP
3. Anxiety - patient appears anxious`,

  plan: `Plan:
1. Chest Pain workup:
   - Serial troponins (now, 3 hours, 6 hours)
   - Continuous cardiac monitoring
   - Aspirin 325mg given
   - Sublingual nitroglycerin as needed for chest pain
   - Will consult cardiology if troponins positive or symptoms recur
   - Stress test if troponins remain negative

2. Hypertension management:
   - Continue home medications
   - Monitor BP closely

3. Patient Education:
   - Discussed warning signs (recurrent chest pain, shortness of breath)
   - Advised to seek immediate care if symptoms worsen
   - Risk factor modification counseling provided (diet, exercise, smoking cessation)

4. Follow-up:
   - Follow up with primary care physician within 1 week
   - Follow up with cardiology if stress test abnormal

Disposition: Observation for serial troponins`,
};

/**
 * Default state with generated note
 */
export const Default: Story = {
  args: {
    noteSections: mockNoteSections,
    template: mockTemplate,
    loading: false,
    error: null,
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    noteSections: {},
    template: mockTemplate,
    loading: true,
    error: null,
  },
};

/**
 * Error state
 */
export const Error: Story = {
  args: {
    noteSections: {},
    template: mockTemplate,
    loading: false,
    error: 'Failed to generate clinical note. Please try again.',
  },
};

/**
 * Empty state (should not happen with auto-generation)
 */
export const Empty: Story = {
  args: {
    noteSections: {},
    template: mockTemplate,
    loading: false,
    error: null,
  },
};

/**
 * Interactive story with editing
 */
export const Interactive: Story = {
  render: () => {
    const [sections, setSections] = useState(mockNoteSections);
    const [copySuccess, setCopySuccess] = useState(false);

    const handleUpdate = (key: string, value: string) => {
      setSections(prev => ({ ...prev, [key]: value }));
    };

    const handleCopy = async () => {
      const text = Object.entries(sections)
        .map(([key, content]) => {
          const section = mockTemplate.sections.find(s => s.key === key);
          return `${section?.title || key}:\n${content}\n`;
        })
        .join('\n');
      
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleRegenerate = () => {
      console.log('Regenerate clicked');
    };

    return (
      <ChartStep
        noteSections={sections}
        template={mockTemplate}
        loading={false}
        error={null}
        onUpdateSection={handleUpdate}
        onCopyToClipboard={handleCopy}
        onRegenerate={handleRegenerate}
      />
    );
  },
};

/**
 * Minimal note (some sections empty)
 */
export const MinimalNote: Story = {
  args: {
    noteSections: {
      subjective: 'Patient presents with headache for 3 days.',
      objective: 'BP: 120/80, HR: 72, Temp: 98.6°F\nNeurological exam normal.',
      assessment: 'Tension headache',
      plan: 'Advised OTC pain relief, hydration, rest. Follow up if symptoms worsen.',
    },
    template: mockTemplate,
    loading: false,
    error: null,
  },
};
