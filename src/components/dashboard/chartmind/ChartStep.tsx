/**
 * ChartStep - Final clinical note generation and editing
 * 
 * Displays generated clinical note with editable sections
 * Matches design of other ChartMind steps
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  useTheme,
} from '@mui/material';
import {
  ContentCopyOutlined,
  CheckCircleRounded,
  RefreshRounded,
} from '@mui/icons-material';
import SectionCard from './SectionCard';
import ConfirmDialog from 'components/common/ConfirmDialog';

// ============================================================================
// Types
// ============================================================================

interface Section {
  key: string;
  title: string;
  placeholder?: string;
}

interface Template {
  name: string;
  sections: Section[];
}

interface ChartStepProps {
  noteSections: Record<string, string>;
  template: Template;
  feedbackRating?: number | null;
  feedbackRemarks?: string;
  loading: boolean;
  error: string | null;
  onUpdateSection?: (key: string, value: string) => void;
  onFeedbackRatingChange?: (rating: number | null) => void;
  onFeedbackRemarksChange?: (remarks: string) => void;
  onCopyToClipboard?: () => Promise<void>;
  onRegenerate?: () => void | Promise<void>;
}

// ============================================================================
// Main Component
// ============================================================================

const ChartStep: React.FC<ChartStepProps> = ({
  noteSections,
  template,
  feedbackRating = null,
  feedbackRemarks = '',
  loading,
  error,
  onUpdateSection,
  onFeedbackRatingChange,
  onFeedbackRemarksChange,
  onCopyToClipboard,
  onRegenerate,
}) => {
  const theme = useTheme();
  const [copySuccess, setCopySuccess] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);

  const sections = template?.sections || [];
  const hasNote = noteSections && Object.keys(noteSections).length > 0;

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await onCopyToClipboard?.();
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [onCopyToClipboard]);

  const handleEditSection = useCallback((sectionKey: string, currentContent: string, title: string) => {
    setModalTitle(title);
    setEditingSection(sectionKey);
    setEditedContent(currentContent);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingSection) {
      onUpdateSection?.(editingSection, editedContent);
    }
    setEditingSection(null);
    setEditedContent('');
  }, [editingSection, editedContent, onUpdateSection]);

  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
    setEditedContent('');
  }, []);

  const handleConfirmRegenerate = useCallback(() => {
    setRegenerateConfirmOpen(false);
    void onRegenerate?.();
  }, [onRegenerate]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1.5, fontWeight: 600 }}>
          Clinical Note
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Review and edit your clinical documentation. Click edit to customize any section.
        </Typography>
      </Box>

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          sx={{ width: '100%', mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={onRegenerate} startIcon={<RefreshRounded />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Generating clinical note...
          </Typography>
        </Box>
      )}

      {/* Generated note */}
      {!loading && hasNote && (
        <>
          {/* Action buttons */}
          <Box display="flex" gap={1} justifyContent="flex-end" mb={3}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshRounded />}
              onClick={() => setRegenerateConfirmOpen(true)}
            >
              Regenerate notes
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={copySuccess ? <CheckCircleRounded /> : <ContentCopyOutlined />}
              onClick={handleCopy}
              color={copySuccess ? 'success' : 'primary'}
            >
              {copySuccess ? 'Copied!' : 'Copy'}
            </Button>
          </Box>

          {/* Sections */}
          <Box sx={{ minHeight: 400 }}>
            {sections.map((section, index) => {
              const content = noteSections[section.key] || '';
              const colors = [
                theme.palette.primary.main,
                theme.palette.info.main,
                theme.palette.success.main,
                theme.palette.warning.main,
                theme.palette.secondary.main,
                theme.palette.error.main,
              ];
              return (
                <SectionCard
                  key={section.key}
                  title={section.title}
                  content={content}
                  placeholder={section.placeholder || 'Not documented during encounter'}
                  accentColor={colors[index % colors.length]}
                  onEdit={() => handleEditSection(section.key, content, section.title)}
                />
              );
            })}
          </Box>

          <Box
            sx={{
              mt: 3,
              px: 2.5,
              py: 2,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.grey[50],
              textAlign: 'center',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              Help us improve by providing feedback
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Rate how helpful this chart draft was.
            </Typography>
            <Rating
              name="chartmind-chart-feedback"
              value={feedbackRating}
              onChange={(event, value) => {
                const fallbackValue = Number(
                  (event.target as HTMLInputElement | null)?.value,
                );
                const nextValue =
                  typeof value === 'number' && Number.isFinite(value)
                    ? value
                    : Number.isFinite(fallbackValue) && fallbackValue > 0
                      ? fallbackValue
                      : null;

                onFeedbackRatingChange?.(nextValue);
              }}
              size="large"
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Additional remarks"
              placeholder="Tell us what worked well or what should improve."
              value={feedbackRemarks}
              onChange={(event) => onFeedbackRemarksChange?.(event.target.value)}
              sx={{ mt: 2, textAlign: 'left' }}
            />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
              {feedbackRating || feedbackRemarks.trim()
                ? 'Feedback is saved automatically with this chart.'
                : 'Select 1 to 5 stars and optionally leave remarks to save feedback with this chart.'}
            </Typography>
          </Box>
        </>
      )}

      {/* No note yet */}
      {!loading && !hasNote && !error && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Click "Generate Note" to create your clinical documentation.
          </Typography>
        </Box>
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

      <ConfirmDialog
        open={regenerateConfirmOpen}
        onClose={() => setRegenerateConfirmOpen(false)}
        title="Regenerate clinical note?"
        message="This replaces the entire note with a new AI-generated draft. Any edits you made to sections will be lost."
        confirmLabel="Regenerate notes"
        onConfirm={handleConfirmRegenerate}
        confirmColor="warning"
      />
    </Box>
  );
};

export default ChartStep;
