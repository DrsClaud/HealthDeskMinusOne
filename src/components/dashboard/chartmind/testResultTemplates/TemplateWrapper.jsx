/**
 * TemplateWrapper - Common wrapper for all test result templates
 * 
 * Provides:
 * - Quick "Reassuring" button at top
 * - Voice dictation support for notes field
 * - Common header/footer structure
 * - Save/Cancel actions
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  ThumbUpAlt as ThumbUpIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
} from '@mui/icons-material';

const TemplateWrapper = ({
  testName,
  children,
  onSave,
  onReassuring,
  existingResult,
  showNotesField = true,
  notesLabel = 'Additional Notes',
  notesPlaceholder = 'Add any additional observations or notes...',
  maxNotesLength = 200,
}) => {
  const [notes, setNotes] = useState('');
  
  // ============================================================================
  // TODO: RE-ENABLE VOICE DICTATION AFTER FIXING/TESTING
  // ============================================================================
  // const [isRecording, setIsRecording] = useState(false);
  // const [speechSupported, setSpeechSupported] = useState(false);
  // const recognitionRef = useRef(null);
  // const finalTranscriptRef = useRef('');

  // Check for existing notes in result
  useEffect(() => {
    if (existingResult?.notes) {
      setNotes(existingResult.notes);
    }
  }, [existingResult]);

  // ============================================================================
  // TODO: RE-ENABLE VOICE DICTATION AFTER FIXING/TESTING
  // ============================================================================
  // useEffect(() => {
  //   const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  //   if (SpeechRecognition) {
  //     setSpeechSupported(true);
  //     recognitionRef.current = new SpeechRecognition();
  //     recognitionRef.current.continuous = true;
  //     recognitionRef.current.interimResults = true;
  //     recognitionRef.current.lang = 'en-US';
  //
  //     recognitionRef.current.onresult = (event) => {
  //       let finalTranscript = '';
  //       for (let i = event.resultIndex; i < event.results.length; i++) {
  //         const transcript = event.results[i][0].transcript;
  //         if (event.results[i].isFinal) {
  //           finalTranscript += transcript + ' ';
  //         }
  //       }
  //       if (finalTranscript) {
  //         finalTranscriptRef.current += finalTranscript;
  //         setNotes(prev => {
  //           const newText = (prev + ' ' + finalTranscriptRef.current).trim();
  //           return newText.length > maxNotesLength ? newText.substring(0, maxNotesLength) : newText;
  //         });
  //         finalTranscriptRef.current = '';
  //       }
  //     };
  //
  //     recognitionRef.current.onerror = () => {
  //       setIsRecording(false);
  //     };
  //
  //     recognitionRef.current.onend = () => {
  //       setIsRecording(false);
  //     };
  //   }
  //
  //   return () => {
  //     if (recognitionRef.current) {
  //       recognitionRef.current.stop();
  //     }
  //   };
  // }, [maxNotesLength]);

  // ============================================================================
  // TODO: RE-ENABLE VOICE DICTATION AFTER FIXING/TESTING
  // ============================================================================
  // const handleToggleRecording = useCallback(() => {
  //   if (isRecording) {
  //     recognitionRef.current?.stop();
  //     setIsRecording(false);
  //     finalTranscriptRef.current = '';
  //   } else {
  //     finalTranscriptRef.current = '';
  //     try {
  //       recognitionRef.current?.start();
  //       setIsRecording(true);
  //     } catch (err) {
  //       console.error('[TemplateWrapper] Failed to start recording:', err);
  //     }
  //   }
  // }, [isRecording]);

  // Handle quick "Reassuring" action
  const handleReassuring = useCallback(() => {
    onReassuring?.();
  }, [onReassuring]);

  // Check if current result is "Reassuring"
  const isReassuring = existingResult === 'Reassuring';

  return (
    <Box>
      {/* Quick Reassuring Button */}
      <Box sx={{ mb: 2 }}>
        <Button
          fullWidth
          variant={isReassuring ? 'contained' : 'outlined'}
          startIcon={<ThumbUpIcon />}
          onClick={handleReassuring}
          sx={{
            py: 1.5,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            borderColor: isReassuring ? undefined : '#2e7d32',
            color: isReassuring ? undefined : '#2e7d32',
            '&:hover': {
              borderColor: '#2e7d32',
              backgroundColor: isReassuring ? undefined : 'rgba(46, 125, 50, 0.08)',
            },
          }}
        >
          {isReassuring ? 'Marked as Reassuring' : 'Mark as Reassuring'}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
          Quick action for clinically reassuring results
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Or enter detailed results
        </Typography>
      </Divider>

      {/* Template-specific content */}
      {children}

      {/* Notes field with voice dictation */}
      {showNotesField && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            {notesLabel}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={notes}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue.length <= maxNotesLength) {
                setNotes(newValue);
              }
            }}
            placeholder={notesPlaceholder}
            helperText={`${notes.length}/${maxNotesLength} characters`}
          />
          {/* TODO: RE-ENABLE VOICE DICTATION - Restore InputProps with mic button */}
          {/* TODO: RE-ENABLE VOICE DICTATION - Restore recording indicator */}
          {/* Original InputProps code:
          InputProps={{
            endAdornment: speechSupported && (
              <InputAdornment position="end">
                <Tooltip title={isRecording ? 'Stop recording' : 'Start voice dictation'}>
                  <IconButton onClick={handleToggleRecording} edge="end" size="small">
                    {isRecording ? <MicOffIcon /> : <MicIcon />}
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
          */}
          {/* Original recording indicator:
          {isRecording && (
            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'error.main', animation: 'pulse 1s ease-in-out infinite', '@keyframes pulse': { '0%': { opacity: 1 }, '50%': { opacity: 0.5 }, '100%': { opacity: 1 } } }} />
              <Typography variant="caption" color="text.secondary">Recording...</Typography>
            </Box>
          )}
          */}
        </Box>
      )}
    </Box>
  );
};

// Export notes getter for templates to use
export const useTemplateNotes = () => {
  const [notes, setNotes] = useState('');
  return { notes, setNotes };
};

export default TemplateWrapper;
