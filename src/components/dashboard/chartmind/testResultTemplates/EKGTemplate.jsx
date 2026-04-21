/**
 * EKGTemplate - EKG/ECG result entry template
 * 
 * Structured entry for:
 * - Rhythm (NSR, Afib, Flutter, etc.)
 * - Rate
 * - Intervals (PR, QRS, QTc)
 * - Axis
 * - ST/T wave changes
 * - Other findings
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Grid,
  FormControl,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';

// Rhythm options
const RHYTHM_OPTIONS = [
  { id: 'nsr', label: 'Normal Sinus Rhythm', normal: true },
  { id: 'sinus_brady', label: 'Sinus Bradycardia' },
  { id: 'sinus_tachy', label: 'Sinus Tachycardia' },
  { id: 'afib', label: 'Atrial Fibrillation' },
  { id: 'aflutter', label: 'Atrial Flutter' },
  { id: 'svt', label: 'SVT' },
  { id: 'vtach', label: 'Ventricular Tachycardia' },
  { id: 'vfib', label: 'Ventricular Fibrillation' },
  { id: 'paced', label: 'Paced Rhythm' },
  { id: 'junctional', label: 'Junctional Rhythm' },
  { id: 'idioventricular', label: 'Idioventricular' },
];

// Rate categories
const RATE_OPTIONS = [
  { id: 'bradycardic', label: '<60 bpm' },
  { id: 'normal_rate', label: '60-100 bpm', normal: true },
  { id: 'tachycardic', label: '>100 bpm' },
];

// Axis options
const AXIS_OPTIONS = [
  { id: 'normal_axis', label: 'Normal Axis', normal: true },
  { id: 'lad', label: 'Left Axis Deviation' },
  { id: 'rad', label: 'Right Axis Deviation' },
  { id: 'extreme', label: 'Extreme Axis' },
];

// Interval findings
const INTERVAL_FINDINGS = [
  { id: 'normal_intervals', label: 'Normal Intervals', normal: true },
  { id: 'prolonged_pr', label: 'Prolonged PR (1° AVB)' },
  { id: 'short_pr', label: 'Short PR' },
  { id: 'wide_qrs', label: 'Wide QRS' },
  { id: 'prolonged_qt', label: 'Prolonged QTc' },
  { id: 'lbbb', label: 'LBBB' },
  { id: 'rbbb', label: 'RBBB' },
  { id: 'lafb', label: 'LAFB' },
  { id: 'lpfb', label: 'LPFB' },
];

// ST/T changes
const ST_T_FINDINGS = [
  { id: 'normal_st', label: 'No ST/T Changes', normal: true },
  { id: 'st_elevation', label: 'ST Elevation' },
  { id: 'st_depression', label: 'ST Depression' },
  { id: 't_inversion', label: 'T Wave Inversion' },
  { id: 't_peaked', label: 'Peaked T Waves' },
  { id: 't_flattened', label: 'Flattened T Waves' },
];

// Other findings
const OTHER_FINDINGS = [
  { id: 'lvh', label: 'LVH' },
  { id: 'rvh', label: 'RVH' },
  { id: 'lae', label: 'Left Atrial Enlargement' },
  { id: 'rae', label: 'Right Atrial Enlargement' },
  { id: 'pacs', label: 'PACs' },
  { id: 'pvcs', label: 'PVCs' },
  { id: 'wpw', label: 'WPW Pattern' },
  { id: 'early_repol', label: 'Early Repolarization' },
  { id: 'low_voltage', label: 'Low Voltage' },
  { id: 'pericarditis', label: 'Pericarditis Pattern' },
];

// Quick patterns
const QUICK_PATTERNS = [
  { id: 'normal_ekg', label: 'Normal EKG', findings: { rhythm: 'nsr', rate: 'normal_rate', axis: 'normal_axis', intervals: ['normal_intervals'], stT: ['normal_st'] } },
  { id: 'stemi', label: 'STEMI Pattern', findings: { stT: ['st_elevation'] } },
  { id: 'nstemi', label: 'NSTEMI Pattern', findings: { stT: ['st_depression', 't_inversion'] } },
  { id: 'afib_rvr', label: 'Afib w/ RVR', findings: { rhythm: 'afib', rate: 'tachycardic' } },
  { id: 'hyperkalemia', label: 'Hyperkalemia Pattern', findings: { stT: ['t_peaked'], intervals: ['wide_qrs'] } },
];

const EKGTemplate = ({
  test,
  existingResult,
  onResultChange,
  notes,
  onNotesChange,
}) => {
  const [rhythm, setRhythm] = useState(null);
  const [rate, setRate] = useState(null);
  const [axis, setAxis] = useState(null);
  const [intervalFindings, setIntervalFindings] = useState([]);
  const [stTFindings, setStTFindings] = useState([]);
  const [otherFindings, setOtherFindings] = useState([]);
  const [quickPatterns, setQuickPatterns] = useState([]);

  // Initialize from existing result
  useEffect(() => {
    if (existingResult?.structured) {
      const s = existingResult.structured;
      if (s.rhythm) setRhythm(s.rhythm);
      if (s.rate) setRate(s.rate);
      if (s.axis) setAxis(s.axis);
      if (s.intervals) setIntervalFindings(s.intervals);
      if (s.stT) setStTFindings(s.stT);
      if (s.other) setOtherFindings(s.other);
    }
  }, [existingResult]);

  // Update parent when any state changes
  useEffect(() => {
    const hasAnyValue = rhythm || rate || axis || 
      intervalFindings.length > 0 || stTFindings.length > 0 || otherFindings.length > 0;
    if (hasAnyValue) {
      const result = buildResult();
      onResultChange?.(result);
    }
  }, [rhythm, rate, axis, intervalFindings, stTFindings, otherFindings]);

  const handleQuickPattern = useCallback((patternId) => {
    const pattern = QUICK_PATTERNS.find(p => p.id === patternId);
    if (!pattern) return;

    // Apply pattern
    if (pattern.findings.rhythm) setRhythm(pattern.findings.rhythm);
    if (pattern.findings.rate) setRate(pattern.findings.rate);
    if (pattern.findings.axis) setAxis(pattern.findings.axis);
    if (pattern.findings.intervals) setIntervalFindings(pattern.findings.intervals);
    if (pattern.findings.stT) setStTFindings(pattern.findings.stT);
    
    setQuickPatterns(prev => {
      if (prev.includes(patternId)) {
        return prev.filter(p => p !== patternId);
      }
      return [...prev, patternId];
    });
  }, []);

  const handleAllNormal = useCallback(() => {
    setRhythm('nsr');
    setRate('normal_rate');
    setAxis('normal_axis');
    setIntervalFindings(['normal_intervals']);
    setStTFindings(['normal_st']);
    setOtherFindings([]);
    setQuickPatterns(['normal_ekg']);
  }, []);

  const toggleFinding = useCallback((findingId, setState) => {
    setState(prev => {
      if (prev.includes(findingId)) {
        return prev.filter(f => f !== findingId);
      }
      return [...prev, findingId];
    });
  }, []);

  const buildResult = useCallback(() => {
    // Check if normal
    const isNormal = rhythm === 'nsr' && rate === 'normal_rate' && axis === 'normal_axis' &&
      intervalFindings.includes('normal_intervals') && stTFindings.includes('normal_st') &&
      otherFindings.length === 0;

    const proseParts = [];
    
    if (isNormal) {
      proseParts.push('EKG shows normal sinus rhythm with normal intervals');
    } else {
      // Rhythm
      const rhythmLabel = RHYTHM_OPTIONS.find(r => r.id === rhythm)?.label;
      if (rhythmLabel && rhythm !== 'nsr') {
        proseParts.push(rhythmLabel);
      } else if (rhythmLabel) {
        proseParts.push('NSR');
      }
      
      // Rate
      const rateLabel = RATE_OPTIONS.find(r => r.id === rate)?.label;
      if (rate && rate !== 'normal_rate') {
        proseParts.push(rateLabel);
      }
      
      // Abnormal findings
      const abnormals = [];
      
      intervalFindings.forEach(f => {
        const opt = INTERVAL_FINDINGS.find(i => i.id === f);
        if (opt && !opt.normal) abnormals.push(opt.label);
      });
      
      stTFindings.forEach(f => {
        const opt = ST_T_FINDINGS.find(i => i.id === f);
        if (opt && !opt.normal) abnormals.push(opt.label);
      });
      
      otherFindings.forEach(f => {
        const opt = OTHER_FINDINGS.find(i => i.id === f);
        if (opt) abnormals.push(opt.label);
      });
      
      if (abnormals.length > 0) {
        proseParts.push(`with ${abnormals.join(', ')}`);
      }
    }

    return {
      status: isNormal ? 'Normal' : 'Abnormal',
      structured: {
        rhythm,
        rate,
        axis,
        intervals: intervalFindings,
        stT: stTFindings,
        other: otherFindings,
      },
      patterns: quickPatterns,
      notes: notes || '',
      prose: 'EKG: ' + proseParts.join(', ') + '.',
    };
  }, [rhythm, rate, axis, intervalFindings, stTFindings, otherFindings, quickPatterns, notes]);

  // Check if normal
  const isAllNormal = rhythm === 'nsr' && rate === 'normal_rate' && axis === 'normal_axis' &&
    intervalFindings.includes('normal_intervals') && stTFindings.includes('normal_st');

  return (
    <Box>
      {/* All Normal Button */}
      <Box sx={{ mb: 2 }}>
        <Chip
          label="Normal EKG"
          onClick={handleAllNormal}
          color={isAllNormal ? 'primary' : 'default'}
          variant={isAllNormal ? 'filled' : 'outlined'}
        />
      </Box>

      {/* Quick Patterns */}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Quick Patterns
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
        {QUICK_PATTERNS.filter(p => p.id !== 'normal_ekg').map(pattern => (
          <Chip
            key={pattern.id}
            label={pattern.label}
            onClick={() => handleQuickPattern(pattern.id)}
            color={quickPatterns.includes(pattern.id) ? 'primary' : 'default'}
            variant={quickPatterns.includes(pattern.id) ? 'filled' : 'outlined'}
            size="small"
          />
        ))}
      </Box>

      {/* Rhythm */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
            Rhythm
          </Typography>
          <FormControl size="small" fullWidth>
            <Select
              value={rhythm || ''}
              onChange={(e) => setRhythm(e.target.value)}
              displayEmpty
              sx={{ fontSize: '0.8rem' }}
            >
              <MenuItem value=""><em>Select</em></MenuItem>
              {RHYTHM_OPTIONS.map(opt => (
                <MenuItem key={opt.id} value={opt.id} sx={{ fontSize: '0.8rem' }}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
            Rate
          </Typography>
          <ToggleButtonGroup
            value={rate}
            exclusive
            onChange={(_, v) => v && setRate(v)}
            size="small"
            color="primary"
            fullWidth
          >
            {RATE_OPTIONS.map(opt => (
              <ToggleButton key={opt.id} value={opt.id} sx={{ fontSize: '0.7rem', px: 1 }}>
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Grid>
      </Grid>

      {/* Axis */}
      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        Axis
      </Typography>
      <ToggleButtonGroup
        value={axis}
        exclusive
        onChange={(_, v) => v && setAxis(v)}
        size="small"
        color="primary"
        sx={{ mb: 2 }}
      >
        {AXIS_OPTIONS.map(opt => (
          <ToggleButton key={opt.id} value={opt.id} sx={{ fontSize: '0.7rem', px: 1 }}>
            {opt.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Intervals & ST/T */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
            Intervals
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {INTERVAL_FINDINGS.map(opt => (
              <Chip
                key={opt.id}
                label={opt.label}
                onClick={() => toggleFinding(opt.id, setIntervalFindings)}
                color={intervalFindings.includes(opt.id) ? 'primary' : 'default'}
                variant={intervalFindings.includes(opt.id) ? 'filled' : 'outlined'}
                size="small"
                sx={{ fontSize: '0.65rem' }}
              />
            ))}
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
            ST/T Changes
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {ST_T_FINDINGS.map(opt => (
              <Chip
                key={opt.id}
                label={opt.label}
                onClick={() => toggleFinding(opt.id, setStTFindings)}
                color={stTFindings.includes(opt.id) ? 'primary' : 'default'}
                variant={stTFindings.includes(opt.id) ? 'filled' : 'outlined'}
                size="small"
                sx={{ fontSize: '0.65rem' }}
              />
            ))}
          </Box>
        </Grid>
      </Grid>

      {/* Other Findings */}
      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        Other Findings
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {OTHER_FINDINGS.map(opt => (
          <Chip
            key={opt.id}
            label={opt.label}
            onClick={() => toggleFinding(opt.id, setOtherFindings)}
            color={otherFindings.includes(opt.id) ? 'primary' : 'default'}
            variant={otherFindings.includes(opt.id) ? 'filled' : 'outlined'}
            size="small"
            sx={{ fontSize: '0.65rem' }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default EKGTemplate;
