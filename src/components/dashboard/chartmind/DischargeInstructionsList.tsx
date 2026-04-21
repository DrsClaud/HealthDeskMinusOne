/**
 * DischargeInstructionsList - List view of Discharge Instructions
 * Shows instruction categories with preview snippets and include checkboxes
 * 
 * Features:
 * - Instructions grouped by category
 * - Preview snippet of prose (first 100 chars)
 * - Include checkbox for each instruction
 * - Click to expand and edit inline
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  Chip,
  TextField,
  Button,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  EditOutlined,
  CheckOutlined,
  MedicationOutlined,
  DirectionsRunOutlined,
  RestaurantOutlined,
  EventOutlined,
  WarningAmberRounded,
  HealingOutlined,
  InfoOutlined,
} from '@mui/icons-material';
import SelectableCard from './SelectableCard';

// ============================================================================
// Types
// ============================================================================

interface Instruction {
  id: string;
  title: string;
  category: string;
  prose: string;
  dependsOn: string[];
  includedByDefault: boolean;
  medicationName?: string;
}

interface DischargeInstructionsListProps {
  instructions: Instruction[];
  includedInstructionIds: Set<string>;
  onToggleIncluded?: (id: string) => void;
  onUpdateProse?: (id: string, newProse: string) => void;
  isAnalyzing?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_ICONS: Record<string, React.ReactElement> = {
  medication_general: <MedicationOutlined />,
  medication_specific: <MedicationOutlined />,
  activity: <DirectionsRunOutlined />,
  diet: <RestaurantOutlined />,
  followup: <EventOutlined />,
  warning_signs: <WarningAmberRounded />,
  wound_care: <HealingOutlined />,
  other: <InfoOutlined />,
};

const CATEGORY_COLORS: Record<string, string> = {
  medication_general: '#1976d2',
  medication_specific: '#1976d2',
  activity: '#2e7d32',
  diet: '#ff9800',
  followup: '#9c27b0',
  warning_signs: '#d32f2f',
  wound_care: '#9c27b0',
  other: '#757575',
};

const CATEGORY_ORDER = [
  'medication_general',
  'medication_specific',
  'activity',
  'diet',
  'followup',
  'warning_signs',
  'wound_care',
  'other',
];

// ============================================================================
// Main Component
// ============================================================================

const DischargeInstructionsList: React.FC<DischargeInstructionsListProps> = ({
  instructions = [],
  includedInstructionIds = new Set(),
  onToggleIncluded,
  onUpdateProse,
  isAnalyzing = false,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedProse, setEditedProse] = useState('');

  // Group instructions by category
  const groupedInstructions = useMemo(() => {
    const groups: Record<string, Instruction[]> = {};
    instructions.forEach(inst => {
      const category = inst.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(inst);
    });
    return groups;
  }, [instructions]);

  const handleEditClick = useCallback((instruction: Instruction) => {
    setEditingId(instruction.id);
    setEditedProse(instruction.prose || '');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingId && onUpdateProse) {
      onUpdateProse(editingId, editedProse);
    }
    setEditingId(null);
    setEditedProse('');
  }, [editingId, editedProse, onUpdateProse]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditedProse('');
  }, []);

  // Get preview snippet (first 100 characters)
  const getPreview = useCallback((prose: string) => {
    if (!prose) return '';
    if (prose.length <= 100) return prose;
    return prose.substring(0, 100) + '...';
  }, []);

  if (isAnalyzing) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Generating discharge instructions...
        </Typography>
      </Box>
    );
  }

  if (instructions.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No discharge instructions generated yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {CATEGORY_ORDER.map(category => {
        const categoryInstructions = groupedInstructions[category] || [];
        if (categoryInstructions.length === 0) return null;

        const categoryLabel = category
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        return (
          <Box key={category} sx={{ mb: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {CATEGORY_ICONS[category] || CATEGORY_ICONS.other}
              {categoryLabel}
            </Typography>

            {categoryInstructions.map(instruction => {
              const isIncluded = includedInstructionIds.has(instruction.id);
              const isEditing = editingId === instruction.id;
              const preview = getPreview(instruction.prose);

              return (
                <Box key={instruction.id} sx={{ position: 'relative' }}>
                  <SelectableCard
                    title={instruction.title}
                    rationale={!isEditing ? preview : undefined}
                    selected={isIncluded}
                    onClick={() => {
                      if (onToggleIncluded && !isEditing) {
                        onToggleIncluded(instruction.id);
                      }
                    }}
                    chips={[
                      ...(isIncluded ? [{ label: 'Included', color: 'success' as const }] : []),
                    ]}
                    additionalContent={
                      <Box>
                        {/* Edit button inline */}
                        {!isEditing && (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                            <Button
                              size="small"
                              startIcon={<EditOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(instruction);
                              }}
                            >
                              Edit
                            </Button>
                          </Box>
                        )}

                        {/* Inline editing */}
                        <Collapse in={isEditing} sx={{ mt: 1 }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={6}
                            value={editedProse}
                            onChange={(e) => setEditedProse(e.target.value)}
                            variant="outlined"
                            sx={{ mb: 1 }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit();
                              }}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="small" 
                              variant="contained" 
                              startIcon={<CheckOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveEdit();
                              }}
                            >
                              Save
                            </Button>
                          </Box>
                        </Collapse>
                      </Box>
                    }
                  />
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
};

export default DischargeInstructionsList;
