/**
 * TestResultModal - Smart modal for entering test results
 * 
 * Features:
 * - Context-sensitive templates based on test type
 * - Quick "Reassuring" button for one-click entry
 * - Specialized templates for CBC, BMP, Urinalysis, Chest X-Ray, EKG
 * - Generic template with AI smart choices for other tests
 * - Voice dictation support
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  ThumbUpAlt as ThumbUpIcon,
  Warning as WarningIcon,
  Add as AddIcon,
} from '@mui/icons-material';

// Import template registry (same folder, so use './')
import { getTemplateForTest, getTemplateDisplayName } from './index';
import { getReflexRecommendations } from './reflexTestingConfig';

// ============================================================================
// Types
// ============================================================================

export interface ReflexRecommendation {
  name: string;
  category: string;
  rationale: string;
}

export interface TestResult {
  status?: 'Normal' | 'Abnormal';
  description?: string;
  notes?: string;
  structured?: Record<string, any>;
  findings?: string[];
  prose?: string;
}

export interface Test {
  id?: string;
  name: string;
  category?: string;
  rationale?: string;
  priority?: string;
  urgency?: string;
}

interface ReflexTestFromRecommendation {
  name: string;
  category: string;
  rationale: string;
  priority: string;
}

interface TestResultModalProps {
  open: boolean;
  test: Test | null;
  onSave: (result: string | TestResult) => void;
  onCancel: () => void;
  existingResult?: string | TestResult | null;
  onGenerateSmartChoices?: (testName: string) => Promise<any>;
  isGeneratingChoices?: boolean;
  onAddReflexTest?: (test: ReflexTestFromRecommendation) => void;
}

// ============================================================================
// Component
// ============================================================================

const TestResultModal: React.FC<TestResultModalProps> = ({
  open,
  test,
  onSave,
  onCancel,
  existingResult = null,
  onGenerateSmartChoices,
  isGeneratingChoices = false,
  onAddReflexTest = null,
}) => {
  const [currentResult, setCurrentResult] = useState<string | TestResult | null>(null);
  const [notes, setNotes] = useState('');

  // Get the appropriate template for this test
  const { component: TemplateComponent } = test 
    ? getTemplateForTest(test) 
    : { component: null };

  // Reset state when modal opens with new test
  useEffect(() => {
    if (open) {
      setCurrentResult(existingResult);
      setNotes(typeof existingResult === 'object' && existingResult?.notes ? existingResult.notes : '');
    }
  }, [open, existingResult]);

  // Handle template result changes
  const handleResultChange = useCallback((result: string | TestResult) => {
    setCurrentResult(result);
  }, []);

  // Handle quick "Reassuring" action
  const handleReassuring = useCallback(() => {
    onSave('Reassuring');
  }, [onSave]);

  // Handle save
  const handleSave = useCallback(() => {
    if (currentResult) {
      // If result has notes field, merge in any separate notes
      if (typeof currentResult === 'object' && notes && !currentResult.notes) {
        onSave({ ...currentResult, notes });
      } else {
        onSave(currentResult);
      }
    }
  }, [currentResult, notes, onSave]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setCurrentResult(null);
    setNotes('');
    onCancel();
  }, [onCancel]);

  // Check if result is valid for save
  const canSave = useCallback(() => {
    if (!currentResult) return false;
    
    // String results (smart choices, Normal, Reassuring) are always valid
    if (typeof currentResult === 'string') return true;
    
    // Object results need a status
    if (currentResult.status) {
      // Abnormal needs description
      if (currentResult.status === 'Abnormal') {
        // Check if there's either a description or structured data
        const hasDescription = currentResult.description?.trim();
        const hasStructured = currentResult.structured && 
          Object.values(currentResult.structured).some(v => v !== null && v !== undefined);
        const hasFindings = currentResult.findings?.length > 0;
        return hasDescription || hasStructured || hasFindings;
      }
      return true;
    }
    
    // Has structured data
    if (currentResult.structured) return true;
    
    return false;
  }, [currentResult]);

  // Check if current result is "Reassuring"
  const isReassuring = existingResult === 'Reassuring';

  // Check for reflex testing recommendations
  const reflexRecommendations = useMemo(() => {
    if (!currentResult || !test?.name) return null;
    // Don't show recommendations for "Reassuring" or "Normal" results
    if (currentResult === 'Reassuring' || currentResult === 'Normal') return null;
    return getReflexRecommendations(test.name, currentResult);
  }, [currentResult, test?.name]);

  // Handle adding a reflex test to the plan
  const handleAddReflexTest = useCallback((recommendation: ReflexRecommendation) => {
    if (!onAddReflexTest) return;
    
    // Create a test object from the recommendation
    const reflexTest: ReflexTestFromRecommendation = {
      name: recommendation.name,
      category: recommendation.category || 'Laboratory',
      rationale: recommendation.rationale || `Reflex testing based on ${test?.name} result`,
      priority: 'medium',
    };
    
    onAddReflexTest(reflexTest);
  }, [onAddReflexTest, test?.name]);

  // Handle adding all reflex tests at once
  const handleAddAllReflexTests = useCallback(() => {
    if (!reflexRecommendations || !onAddReflexTest) return;
    
    reflexRecommendations.recommendations.forEach(rec => {
      const reflexTest: ReflexTestFromRecommendation = {
        name: rec.name,
        category: rec.category || 'Laboratory',
        rationale: rec.rationale || `Reflex testing based on ${test?.name} result`,
        priority: 'medium',
      };
      onAddReflexTest(reflexTest);
    });
  }, [reflexRecommendations, onAddReflexTest, test?.name]);

  if (!test || !TemplateComponent) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{test.name}</DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Enter test results or mark as reassuring for quick documentation.
        </DialogContentText>

        {/* Quick Reassuring Button - Always at top */}
        <Button
          fullWidth
          variant={isReassuring ? 'contained' : 'outlined'}
          startIcon={<ThumbUpIcon />}
          onClick={handleReassuring}
          sx={{ mb: 2 }}
        >
          {isReassuring ? 'Marked as Reassuring' : 'Mark as Reassuring'}
        </Button>

        <Divider sx={{ my: 2 }} />

        {/* Reflex Testing Recommendations Alert */}
        {reflexRecommendations && reflexRecommendations.recommendations.length > 0 && (
          <Alert severity="info" icon={<WarningIcon />} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Reflex Testing Recommended
            </Typography>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              {reflexRecommendations.explanation}
            </Typography>
            <List dense>
              {reflexRecommendations.recommendations.map((rec, idx) => (
                <ListItem
                  key={idx}
                  disablePadding
                  secondaryAction={
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleAddReflexTest(rec)}
                      variant="outlined"
                    >
                      Add
                    </Button>
                  }
                >
                  <ListItemText
                    primary={rec.name}
                    secondary={rec.rationale}
                  />
                </ListItem>
              ))}
            </List>
            {reflexRecommendations.recommendations.length > 1 && (
              <Button
                fullWidth
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddAllReflexTests}
                sx={{ mt: 1 }}
              >
                Add All Recommended Tests
              </Button>
            )}
          </Alert>
        )}

        {/* Template-specific content */}
        <TemplateComponent
          test={test}
          existingResult={existingResult}
          onResultChange={handleResultChange}
          notes={notes}
          onNotesChange={setNotes}
          onGenerateSmartChoices={onGenerateSmartChoices}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!canSave()}
        >
          Save Result
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TestResultModal;
