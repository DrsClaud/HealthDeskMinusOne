/**
 * CBCTemplate - Complete Blood Count result entry template
 * 
 * Structured entry for:
 * - WBC (White Blood Cells)
 * - RBC (Red Blood Cells)
 * - Hemoglobin (Hgb)
 * - Hematocrit (Hct)
 * - Platelets (Plt)
 * 
 * Quick findings for common abnormalities
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  ArrowUpward as HighIcon,
  ArrowDownward as LowIcon,
  Remove as NormalIcon,
} from '@mui/icons-material';

// CBC parameters with clinical context
const CBC_PARAMETERS = [
  { id: 'wbc', name: 'WBC', fullName: 'White Blood Cells', unit: 'K/µL' },
  { id: 'rbc', name: 'RBC', fullName: 'Red Blood Cells', unit: 'M/µL' },
  { id: 'hgb', name: 'Hgb', fullName: 'Hemoglobin', unit: 'g/dL' },
  { id: 'hct', name: 'Hct', fullName: 'Hematocrit', unit: '%' },
  { id: 'plt', name: 'Plt', fullName: 'Platelets', unit: 'K/µL' },
];

// Common abnormality patterns for quick selection
const QUICK_FINDINGS = [
  { id: 'anemia', label: 'Anemia', params: { hgb: 'low', hct: 'low' } },
  { id: 'leukocytosis', label: 'Leukocytosis', params: { wbc: 'high' } },
  { id: 'leukopenia', label: 'Leukopenia', params: { wbc: 'low' } },
  { id: 'thrombocytopenia', label: 'Thrombocytopenia', params: { plt: 'low' } },
  { id: 'thrombocytosis', label: 'Thrombocytosis', params: { plt: 'high' } },
  { id: 'polycythemia', label: 'Polycythemia', params: { rbc: 'high', hgb: 'high', hct: 'high' } },
  { id: 'pancytopenia', label: 'Pancytopenia', params: { wbc: 'low', rbc: 'low', plt: 'low' } },
];

const CBCTemplate = ({
  test,
  existingResult,
  onResultChange,
  notes,
  onNotesChange,
}) => {
  // Parameter states: 'normal', 'high', 'low', or null (not set)
  const [parameters, setParameters] = useState({
    wbc: null,
    rbc: null,
    hgb: null,
    hct: null,
    plt: null,
  });

  // Selected quick findings
  const [selectedFindings, setSelectedFindings] = useState([]);

  // Initialize from existing result
  useEffect(() => {
    if (existingResult?.structured) {
      setParameters(prev => ({
        ...prev,
        ...existingResult.structured,
      }));
    }
    if (existingResult?.findings) {
      setSelectedFindings(existingResult.findings);
    }
  }, [existingResult]);

  // Update parent when parameters change
  useEffect(() => {
    const hasAnyValue = Object.values(parameters).some(v => v !== null);
    if (hasAnyValue || selectedFindings.length > 0) {
      const result = buildResult();
      onResultChange?.(result);
    }
  }, [parameters, selectedFindings]);

  // Handle parameter toggle
  const handleParameterChange = useCallback((paramId, value) => {
    setParameters(prev => ({
      ...prev,
      [paramId]: prev[paramId] === value ? null : value, // Toggle off if same value
    }));
  }, []);

  // Handle quick finding selection
  const handleFindingToggle = useCallback((findingId) => {
    const finding = QUICK_FINDINGS.find(f => f.id === findingId);
    if (!finding) return;

    setSelectedFindings(prev => {
      const isSelected = prev.includes(findingId);
      if (isSelected) {
        // Remove finding
        return prev.filter(f => f !== findingId);
      } else {
        // Add finding and set its parameters
        setParameters(prevParams => ({
          ...prevParams,
          ...finding.params,
        }));
        return [...prev, findingId];
      }
    });
  }, []);

  // Set all parameters to normal
  const handleAllNormal = useCallback(() => {
    setParameters({
      wbc: 'normal',
      rbc: 'normal',
      hgb: 'normal',
      hct: 'normal',
      plt: 'normal',
    });
    setSelectedFindings([]);
  }, []);

  // Build result object
  const buildResult = useCallback(() => {
    const hasAbnormal = Object.values(parameters).some(v => v === 'high' || v === 'low');
    
    // Generate prose summary
    const proseParts = [];
    
    // Check for all normal
    const allNormal = Object.values(parameters).every(v => v === 'normal');
    if (allNormal) {
      proseParts.push('CBC within normal limits');
    } else {
      // Build description of abnormalities
      const abnormalities = [];
      CBC_PARAMETERS.forEach(param => {
        const value = parameters[param.id];
        if (value === 'high') {
          abnormalities.push(`elevated ${param.name}`);
        } else if (value === 'low') {
          abnormalities.push(`low ${param.name}`);
        }
      });
      
      if (abnormalities.length > 0) {
        proseParts.push(`CBC shows ${abnormalities.join(', ')}`);
      }
      
      // Add findings
      if (selectedFindings.length > 0) {
        const findingLabels = selectedFindings.map(fId => 
          QUICK_FINDINGS.find(f => f.id === fId)?.label
        ).filter(Boolean);
        if (findingLabels.length > 0) {
          proseParts.push(`consistent with ${findingLabels.join(', ')}`);
        }
      }
    }

    return {
      status: hasAbnormal ? 'Abnormal' : 'Normal',
      structured: parameters,
      findings: selectedFindings,
      notes: notes || '',
      prose: proseParts.join('; ') + '.',
    };
  }, [parameters, selectedFindings, notes]);

  return (
    <Box>
      {/* All Normal Button */}
      <Box sx={{ mb: 2 }}>
        <Chip
          label="All Within Normal Limits"
          onClick={handleAllNormal}
          color={Object.values(parameters).every(v => v === 'normal') ? 'primary' : 'default'}
          variant={Object.values(parameters).every(v => v === 'normal') ? 'filled' : 'outlined'}
        />
      </Box>

      {/* Parameter Grid */}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Individual Parameters
      </Typography>
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {CBC_PARAMETERS.map(param => (
          <Grid item xs={12} key={param.id}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 1,
                borderRadius: 1,
                bgcolor: parameters[param.id] ? 'action.selected' : 'transparent',
              }}
            >
              <Tooltip title={param.fullName} arrow placement="left">
                <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 50 }}>
                  {param.name}
                </Typography>
              </Tooltip>
              <ToggleButtonGroup
                value={parameters[param.id]}
                exclusive
                size="small"
                color="primary"
                onChange={(_, value) => handleParameterChange(param.id, value)}
              >
                <ToggleButton value="low">
                  <LowIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="normal">
                  <NormalIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="high">
                  <HighIcon fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Quick Findings */}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Quick Findings
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {QUICK_FINDINGS.map(finding => (
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
    </Box>
  );
};

export default CBCTemplate;
