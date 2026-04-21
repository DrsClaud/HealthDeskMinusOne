/**
 * ImagingTemplate - Generic imaging result entry template
 * 
 * For CT, MRI, Ultrasound, and other imaging studies.
 * Provides structured Normal/Abnormal entry with common findings.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Button,
  ButtonGroup,
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

// Common imaging findings (generic)
const COMMON_FINDINGS = [
  { id: 'no_acute', label: 'No Acute Findings', normal: true },
  { id: 'mass', label: 'Mass/Lesion' },
  { id: 'fluid', label: 'Fluid Collection' },
  { id: 'inflammation', label: 'Inflammation' },
  { id: 'calcification', label: 'Calcification' },
  { id: 'obstruction', label: 'Obstruction' },
  { id: 'fracture', label: 'Fracture' },
  { id: 'degenerative', label: 'Degenerative Changes' },
  { id: 'lymphadenopathy', label: 'Lymphadenopathy' },
  { id: 'incidental', label: 'Incidental Finding' },
];

const ImagingTemplate = ({
  test,
  existingResult,
  onResultChange,
  notes,
  onNotesChange,
}) => {
  const [status, setStatus] = useState(null); // 'normal' | 'abnormal'
  const [selectedFindings, setSelectedFindings] = useState([]);
  const [description, setDescription] = useState('');
  
  // ============================================================================
  // TODO: RE-ENABLE VOICE DICTATION AFTER FIXING/TESTING
  // ============================================================================
  // const [isRecording, setIsRecording] = useState(false);
  // const [speechSupported, setSpeechSupported] = useState(false);
  // const recognitionRef = useRef(null);
  // const finalTranscriptRef = useRef('');
  
  const maxChars = 300;

  // Initialize from existing result
  useEffect(() => {
    if (existingResult?.structured) {
      if (existingResult.structured.status) setStatus(existingResult.structured.status);
      if (existingResult.structured.findings) setSelectedFindings(existingResult.structured.findings);
      if (existingResult.structured.description) setDescription(existingResult.structured.description);
    } else if (typeof existingResult === 'string') {
      if (existingResult === 'Normal' || existingResult === 'Reassuring') {
        setStatus('normal');
      }
    } else if (existingResult?.status === 'Abnormal') {
      setStatus('abnormal');
      if (existingResult.description) setDescription(existingResult.description);
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
  //         if (event.results[i].isFinal) {
  //           finalTranscript += event.results[i][0].transcript + ' ';
  //         }
  //       }
  //       if (finalTranscript) {
  //         finalTranscriptRef.current += finalTranscript;
  //         setDescription(prev => {
  //           const newText = (prev + ' ' + finalTranscriptRef.current).trim();
  //           return newText.length > maxChars ? newText.substring(0, maxChars) : newText;
  //         });
  //         finalTranscriptRef.current = '';
  //       }
  //     };
  //
  //     recognitionRef.current.onerror = () => setIsRecording(false);
  //     recognitionRef.current.onend = () => setIsRecording(false);
  //   }
  //
  //   return () => recognitionRef.current?.stop();
  // }, []);

  // Update parent when state changes
  useEffect(() => {
    if (status) {
      const result = buildResult();
      onResultChange?.(result);
    }
  }, [status, selectedFindings, description]);

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
  //       console.error('[ImagingTemplate] Failed to start recording:', err);
  //     }
  //   }
  // }, [isRecording]);

  const handleStatusChange = useCallback((newStatus) => {
    setStatus(newStatus);
    if (newStatus === 'normal') {
      setSelectedFindings(['no_acute']);
      setDescription('');
    } else {
      setSelectedFindings(prev => prev.filter(f => f !== 'no_acute'));
    }
  }, []);

  const handleFindingToggle = useCallback((findingId) => {
    setSelectedFindings(prev => {
      if (prev.includes(findingId)) {
        return prev.filter(f => f !== findingId);
      }
      // If selecting "no_acute", clear other findings and set to normal
      if (findingId === 'no_acute') {
        setStatus('normal');
        return ['no_acute'];
      }
      // If selecting abnormal finding, remove "no_acute" and set to abnormal
      setStatus('abnormal');
      return [...prev.filter(f => f !== 'no_acute'), findingId];
    });
  }, []);

  const buildResult = useCallback(() => {
    const isNormal = status === 'normal' || selectedFindings.includes('no_acute');
    
    const proseParts = [];
    const testType = test?.name || 'Imaging study';
    
    if (isNormal) {
      proseParts.push(`${testType} shows no acute findings`);
    } else {
      const abnormalLabels = selectedFindings
        .map(fId => COMMON_FINDINGS.find(f => f.id === fId)?.label)
        .filter(l => l && l !== 'No Acute Findings');
      
      if (abnormalLabels.length > 0) {
        proseParts.push(`${testType} shows ${abnormalLabels.join(', ')}`);
      }
      
      if (description.trim()) {
        proseParts.push(description.trim());
      }
    }

    return {
      status: isNormal ? 'Normal' : 'Abnormal',
      structured: {
        status: isNormal ? 'normal' : 'abnormal',
        findings: selectedFindings,
        description: description.trim(),
      },
      notes: notes || '',
      prose: proseParts.join('; ') + '.',
    };
  }, [status, selectedFindings, description, test, notes]);

  return (
    <Box>
      {/* Normal/Abnormal Toggle */}
      <Box sx={{ mb: 2 }}>
        <ButtonGroup fullWidth size="large">
          <Button
            variant={status === 'normal' ? 'contained' : 'outlined'}
            onClick={() => handleStatusChange('normal')}
            startIcon={<CheckCircleIcon />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Normal
          </Button>
          <Button
            variant={status === 'abnormal' ? 'contained' : 'outlined'}
            onClick={() => handleStatusChange('abnormal')}
            startIcon={<WarningIcon />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Abnormal
          </Button>
        </ButtonGroup>
      </Box>

      {/* Common Findings */}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Findings
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
        {COMMON_FINDINGS.map(finding => (
          <Chip
            key={finding.id}
            label={finding.label}
            onClick={() => handleFindingToggle(finding.id)}
            color={selectedFindings.includes(finding.id) ? 'primary' : 'default'}
            variant={selectedFindings.includes(finding.id) ? 'filled' : 'outlined'}
            size="small"
          />
        ))}
      </Box>

      {/* Description field (for abnormal) */}
      {status === 'abnormal' && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Describe Findings
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
            placeholder="Describe the abnormal findings in detail..."
            helperText={`${description.length}/${maxChars} characters`}
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

export default ImagingTemplate;
