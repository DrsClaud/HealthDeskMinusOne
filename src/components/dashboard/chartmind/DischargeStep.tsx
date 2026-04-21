/**
 * DischargeStep - Discharge instructions step for ChartMind
 * 
 * Auto-generates patient-friendly discharge instructions when mounted
 * Shows sections with modal editing
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material';
import { RefreshRounded } from '@mui/icons-material';
import SectionCard from './SectionCard';

// ============================================================================
// Types
// ============================================================================

interface DischargeStepProps {
  transcript: string;
  selectedDiagnoses: any[];
  selectedTreatments: any[];
  autoGenerate?: boolean;
  // Lifted state from parent
  instructions: any[];
  includedInstructionIds: Set<string>;
  loading: boolean;
  error: string | null;
  isGenerating: boolean;
  hasBeenGenerated: boolean;
  generateDischargeInstructions: (transcript: string, diagnosis: any, treatments: any[]) => Promise<void>;
  regenerateDischargeInstructions: (transcript: string, diagnosis: any, treatments: any[]) => Promise<void>;
  toggleInstructionIncluded: (id: string) => void;
  updateInstructionProse: (id: string, prose: string) => void;
}

// ============================================================================
// Main DischargeStep Component
// ============================================================================

const DischargeStep: React.FC<DischargeStepProps> = ({
  transcript,
  selectedDiagnoses,
  selectedTreatments,
  autoGenerate = true,
  // Lifted state from parent
  instructions,
  includedInstructionIds,
  loading,
  error,
  isGenerating,
  hasBeenGenerated,
  generateDischargeInstructions,
  regenerateDischargeInstructions,
  toggleInstructionIncluded,
  updateInstructionProse,
}) => {
  const theme = useTheme();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');

  // Auto-generate on mount if not already generated
  useEffect(() => {
    if (autoGenerate && !hasBeenGenerated && !isGenerating && transcript && selectedDiagnoses.length > 0) {
      const primaryDiagnosis = selectedDiagnoses[0];
      const includedTreatments = selectedTreatments.filter(t => !t.disabled);
      generateDischargeInstructions(transcript, primaryDiagnosis, includedTreatments);
    }
  }, [autoGenerate, hasBeenGenerated, isGenerating, transcript, selectedDiagnoses, selectedTreatments, generateDischargeInstructions]);

  const handleRegenerate = useCallback(() => {
    const primaryDiagnosis = selectedDiagnoses.length > 0 ? selectedDiagnoses[0] : null;
    const includedTreatments = selectedTreatments.filter(t => !t.disabled);
    regenerateDischargeInstructions(transcript, primaryDiagnosis, includedTreatments);
  }, [transcript, selectedDiagnoses, selectedTreatments, regenerateDischargeInstructions]);

  // Group instructions by category
  const groupedInstructions = React.useMemo(() => {
    const groups: Record<string, any[]> = {
      medication_general: [],
      medication_specific: [],
      activity: [],
      diet: [],
      followup: [],
      warning_signs: [],
      wound_care: [],
      other: [],
    };
    
    // Log instructions for debugging
    console.log('[DischargeStep] All instructions:', instructions);
    
    instructions.forEach(inst => {
      const category = inst.category || 'other';
      console.log('[DischargeStep] Processing instruction:', { id: inst.id, category, title: inst.title });
      
      if (groups[category]) {
        groups[category].push(inst);
      } else {
        groups.other.push(inst);
      }
    });
    
    console.log('[DischargeStep] Grouped instructions:', groups);
    
    return groups;
  }, [instructions]);

  const handleEditSection = useCallback((sectionKey: string, currentContent: string, title: string, description: string) => {
    setModalTitle(title);
    setModalDescription(description);
    setEditingSection(sectionKey);
    setEditedContent(currentContent);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingSection) {
      // Find the instruction for this section and update it
      const sectionInstructions = groupedInstructions[editingSection] || [];
      if (sectionInstructions.length > 0) {
        // Update the first instruction in this section
        updateInstructionProse(sectionInstructions[0].id, editedContent);
      }
    }
    setEditingSection(null);
    setEditedContent('');
  }, [editingSection, editedContent, groupedInstructions, updateInstructionProse]);

  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
    setEditedContent('');
  }, []);


  // Section configurations - matching LLM output categories
  const sections = [
    {
      key: 'medication_general',
      title: 'Medication General',
      color: theme.palette.primary.main,
      placeholder: "General medication safety and administration guidelines",
      description: "General instructions for taking medications safely and effectively.",
    },
    {
      key: 'medication_specific',
      title: 'Medication Specific',
      color: theme.palette.primary.main,
      placeholder: "Specific medication instructions",
      description: "Detailed instructions for each prescribed medication.",
    },
    {
      key: 'activity',
      title: 'Activity',
      color: theme.palette.info.main,
      placeholder: "Activity restrictions and recommendations",
      description: "What activities to avoid or limit, and when to return to normal activity.",
    },
    {
      key: 'diet',
      title: 'Diet',
      color: theme.palette.success.main,
      placeholder: "Dietary recommendations or restrictions",
      description: "What to eat and drink, and any foods to avoid.",
    },
    {
      key: 'followup',
      title: 'Followup',
      color: theme.palette.secondary.main,
      placeholder: "Follow-up instructions",
      description: "When and with whom the patient should follow up.",
    },
    {
      key: 'warning_signs',
      title: 'Warning Signs',
      color: theme.palette.error.main,
      placeholder: "Red flags that require immediate medical attention",
      description: "Symptoms that mean the patient should seek immediate medical care.",
    },
    {
      key: 'wound_care',
      title: 'Wound Care',
      color: theme.palette.warning.main,
      placeholder: "Instructions for wound care if applicable",
      description: "How to care for any wounds, incisions, or injuries.",
    },
    {
      key: 'other',
      title: 'Other',
      color: theme.palette.grey[600],
      placeholder: "Other relevant instructions",
      description: "Any other important instructions for the patient.",
    },
  ];

  const getSectionContent = (sectionKey: string) => {
    const sectionInstructions = groupedInstructions[sectionKey] || [];
    if (sectionInstructions.length === 0) return '';
    return sectionInstructions.map(inst => inst.prose).join('\n\n');
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 900 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1.5, fontWeight: 600 }}>
          Discharge Instructions
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Review and edit patient-friendly discharge instructions. Click edit to customize any section.
        </Typography>
      </Box>

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          sx={{ width: '100%', mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleRegenerate} startIcon={<RefreshRounded />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading */}
      {isGenerating && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Generating discharge instructions...
          </Typography>
        </Box>
      )}

      {/* Generated instructions */}
      {!isGenerating && hasBeenGenerated && (
        <>
          {/* Sections - only show sections with content */}
          <Box sx={{ minHeight: 400 }}>
            {sections.map((section) => {
              const content = getSectionContent(section.key);
              if (!content) return null;
              return (
                <SectionCard
                  key={section.key}
                  title={section.title}
                  content={content}
                  accentColor={section.color}
                  onEdit={() => handleEditSection(section.key, content, section.title, section.description)}
                />
              );
            })}
          </Box>
        </>
      )}

      {/* Edit Modal */}
      <Dialog
        open={editingSection !== null}
        onClose={handleCancelEdit}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="div">
            {modalTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {modalDescription}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={12}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            variant="outlined"
            placeholder={sections.find(s => s.key === editingSection)?.placeholder}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit}>
            Close
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DischargeStep;
