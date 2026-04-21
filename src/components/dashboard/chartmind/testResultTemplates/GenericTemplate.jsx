/**
 * GenericTemplate - Generic test result entry template
 * 
 * Fallback template for tests without specialized templates.
 * Uses test-specific smart defaults when available.
 * Provides Normal/Abnormal selection with optional description for unknown tests.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { getSmartDefaultsForTest } from './testSmartDefaults';

const GenericTemplate = ({
  test,
  existingResult,
  onResultChange,
  notes,
  onNotesChange,
  onGenerateSmartChoices, // Optional: for AI-generated choices
}) => {
  const [status, setStatus] = useState(null); // 'normal' | 'abnormal' | smart choice string
  const [description, setDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [smartChoices, setSmartChoices] = useState(null);
  const [loadingChoices, setLoadingChoices] = useState(false);
  
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const maxChars = 200;

  // Determine if this is a lab test
  const isLabTest = test?.category === 'Laboratory' || test?.category === 'Lab';

  // Get test-specific defaults for this test (memoized)
  const testDefaults = useMemo(() => {
    return test?.name ? getSmartDefaultsForTest(test.name) : null;
  }, [test?.name]);
  
  const hasSpecificDefaults = testDefaults?.matched || false;

  // Determine if we should use smart choices UI
  // Use smart choices if: 
  // 1. Test has specific defaults (any category), OR
  // 2. It's a lab test (we'll either use defaults or try AI)
  const useSmartChoicesUI = hasSpecificDefaults || isLabTest;

  // Initialize from existing result
  useEffect(() => {
    if (existingResult) {
      if (typeof existingResult === 'string') {
        if (existingResult === 'Normal' || existingResult === 'Reassuring') {
          setStatus('normal');
        } else {
          // Smart choice result - set it directly
          setStatus(existingResult);
        }
      } else if (existingResult.status === 'Abnormal') {
        setStatus('abnormal');
        if (existingResult.description) setDescription(existingResult.description);
      }
    }
  }, [existingResult]);

  // Load smart choices for tests
  useEffect(() => {
    // Only load if we're using smart choices UI and don't have them yet
    if (!useSmartChoicesUI || smartChoices || loadingChoices) {
      return;
    }

    // First check if test already has smart choices cached
    if (test?.smartChoices?.length >= 2) {
      console.log('[GenericTemplate] Using cached smart choices for:', test?.name);
      setSmartChoices(test.smartChoices);
      return;
    }

    // If we have test-specific defaults, use those (faster, no API call)
    if (hasSpecificDefaults && testDefaults?.choices) {
      console.log('[GenericTemplate] Using test-specific defaults for:', test?.name, testDefaults.choices);
      setSmartChoices(testDefaults.choices);
      return;
    }

    // For lab tests without specific defaults, try AI generation
    if (isLabTest && onGenerateSmartChoices) {
      setLoadingChoices(true);
      onGenerateSmartChoices(test)
        .then(choices => {
          console.log('[GenericTemplate] AI generated choices for:', test?.name, choices);
          setSmartChoices(choices);
          setLoadingChoices(false);
        })
        .catch(() => {
          // Fall back to generic defaults
          const fallbackChoices = ['Normal', 'Abnormal'];
          console.log('[GenericTemplate] AI failed, using generic fallback for:', test?.name);
          setSmartChoices(fallbackChoices);
          setLoadingChoices(false);
        });
    } else {
      // Non-lab test without specific defaults - use generic
      setSmartChoices(['Normal', 'Abnormal']);
    }
  }, [useSmartChoicesUI, smartChoices, loadingChoices, test, hasSpecificDefaults, testDefaults, isLabTest, onGenerateSmartChoices]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
          setDescription(prev => {
            const newText = (prev + ' ' + finalTranscriptRef.current).trim();
            return newText.length > maxChars ? newText.substring(0, maxChars) : newText;
          });
          finalTranscriptRef.current = '';
        }
      };

      recognitionRef.current.onerror = () => setIsRecording(false);
      recognitionRef.current.onend = () => setIsRecording(false);
    }

    return () => recognitionRef.current?.stop();
  }, []);

  // Update parent when state changes
  useEffect(() => {
    if (status) {
      const result = buildResult();
      onResultChange?.(result);
    }
  }, [status, description]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      finalTranscriptRef.current = '';
    } else {
      finalTranscriptRef.current = '';
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (err) {
        console.error('[GenericTemplate] Failed to start recording:', err);
      }
    }
  }, [isRecording]);

  const handleSmartChoice = useCallback((choice) => {
    setStatus(choice);
    // Only clear description if not selecting "Abnormal" type choices
    if (!choice.toLowerCase().includes('abnormal') && 
        !choice.toLowerCase().includes('positive') &&
        !choice.toLowerCase().includes('elevated') &&
        !choice.toLowerCase().includes('concerning')) {
      setDescription('');
    }
  }, []);

  const buildResult = useCallback(() => {
    const isNormal = status === 'normal' || status === 'Normal';
    const isAbnormal = status === 'abnormal';
    
    // Smart choice (not just 'normal' or 'abnormal')
    if (!isNormal && !isAbnormal && status) {
      // If there's also a description, include it
      if (description.trim()) {
        return {
          status: status,
          description: description.trim(),
          prose: `${test?.name || 'Test'}: ${status} - ${description.trim()}`,
        };
      }
      return status; // Return string directly for smart choices without description
    }
    
    if (isAbnormal && description.trim()) {
      return {
        status: 'Abnormal',
        description: description.trim(),
        prose: `${test?.name || 'Test'}: Abnormal - ${description.trim()}`,
      };
    }
    
    if (isNormal) {
      return 'Normal';
    }
    
    return null;
  }, [status, description, test]);

  // Check if current selection might need a description
  const selectedNeedsDescription = useMemo(() => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === 'abnormal' || 
           s.includes('positive') || 
           s.includes('elevated') ||
           s.includes('concerning') ||
           s.includes('other');
  }, [status]);

  return (
    <Box>
      {/* Smart choices UI */}
      {useSmartChoicesUI && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Select the result:
          </Typography>
          
          {loadingChoices ? (
            <Box display="flex" alignItems="center" gap={1} py={2}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Loading options...
              </Typography>
            </Box>
          ) : smartChoices ? (
            <Box display="flex" flexDirection="column" gap={1}>
              {smartChoices.map((choice, idx) => {
                const isSelected = status === choice;
                
                return (
                  <Button
                    key={idx}
                    variant={isSelected ? 'contained' : 'outlined'}
                    onClick={() => handleSmartChoice(choice)}
                    startIcon={isSelected ? <CheckCircleIcon /> : null}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {choice}
                  </Button>
                );
              })}
            </Box>
          ) : null}
        </Box>
      )}

      {/* Non-smart-choices UI (fallback for tests without any defaults) */}
      {!useSmartChoicesUI && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            fullWidth
            variant={status === 'normal' ? 'contained' : 'outlined'}
            onClick={() => { setStatus('normal'); setDescription(''); }}
            startIcon={<CheckCircleIcon />}
          >
            Normal
          </Button>
          <Button
            fullWidth
            variant={status === 'abnormal' ? 'contained' : 'outlined'}
            onClick={() => setStatus('abnormal')}
            startIcon={<WarningIcon />}
          >
            Abnormal
          </Button>
        </Box>
      )}

      {/* Description field for selections that need more detail */}
      {selectedNeedsDescription && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Additional Details (optional)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue.length <= maxChars) {
                setDescription(newValue);
              }
            }}
            placeholder="Describe findings, organism, or other relevant details..."
            helperText={`${description.length}/${maxChars} characters`}
            /* TODO: Re-enable voice dictation after testing */
            // InputProps={{
            //   endAdornment: speechSupported && (
            //     <InputAdornment position="end">
            //       <Tooltip title={isRecording ? 'Stop' : 'Voice dictation'}>
            //         <IconButton
            //           onClick={handleToggleRecording}
            //           size="small"
            //         >
            //           {isRecording ? <MicOffIcon /> : <MicIcon />}
            //         </IconButton>
            //       </Tooltip>
            //     </InputAdornment>
            //   ),
            // }}
          />
          {/* TODO: Re-enable voice dictation after testing */}
          {/* {isRecording && (
            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', animation: 'pulse 1s infinite' }} />
              <Typography variant="caption" color="text.secondary">Recording...</Typography>
            </Box>
          )} */}
        </Box>
      )}
    </Box>
  );
};

export default GenericTemplate;
