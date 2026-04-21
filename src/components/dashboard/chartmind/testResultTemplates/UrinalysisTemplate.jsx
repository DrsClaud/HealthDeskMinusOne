/**
 * UrinalysisTemplate - Urinalysis result entry template
 * 
 * Structured entry for common UA parameters:
 * - Color, Clarity
 * - Specific Gravity, pH
 * - Protein, Glucose, Ketones, Blood
 * - Leukocyte Esterase, Nitrites
 * - WBC, RBC, Bacteria
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Grid,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';

// UA parameters with scale options
const UA_PARAMETERS = [
  { 
    id: 'protein', 
    name: 'Protein', 
    type: 'scale',
    options: ['Negative', 'Trace', '1+', '2+', '3+', '4+'],
    normal: 'Negative',
  },
  { 
    id: 'glucose', 
    name: 'Glucose', 
    type: 'scale',
    options: ['Negative', 'Trace', '1+', '2+', '3+', '4+'],
    normal: 'Negative',
  },
  { 
    id: 'ketones', 
    name: 'Ketones', 
    type: 'scale',
    options: ['Negative', 'Trace', '1+', '2+', '3+'],
    normal: 'Negative',
  },
  { 
    id: 'blood', 
    name: 'Blood', 
    type: 'scale',
    options: ['Negative', 'Trace', '1+', '2+', '3+'],
    normal: 'Negative',
  },
  { 
    id: 'leukocytes', 
    name: 'Leuk Esterase', 
    type: 'scale',
    options: ['Negative', 'Trace', '1+', '2+', '3+'],
    normal: 'Negative',
  },
  { 
    id: 'nitrites', 
    name: 'Nitrites', 
    type: 'binary',
    options: ['Negative', 'Positive'],
    normal: 'Negative',
  },
  { 
    id: 'wbc', 
    name: 'WBC', 
    type: 'range',
    options: ['None', '0-5', '5-10', '10-25', '>25', 'TNTC'],
    normal: '0-5',
  },
  { 
    id: 'rbc', 
    name: 'RBC', 
    type: 'range',
    options: ['None', '0-5', '5-10', '10-25', '>25', 'TNTC'],
    normal: '0-5',
  },
  { 
    id: 'bacteria', 
    name: 'Bacteria', 
    type: 'scale',
    options: ['None', 'Few', 'Moderate', 'Many'],
    normal: 'None',
  },
];

// Common patterns
const QUICK_FINDINGS = [
  { id: 'uti', label: 'UTI Pattern', params: { leukocytes: '2+', nitrites: 'Positive', wbc: '10-25', bacteria: 'Many' } },
  { id: 'hematuria', label: 'Hematuria', params: { blood: '2+', rbc: '10-25' } },
  { id: 'proteinuria', label: 'Proteinuria', params: { protein: '2+' } },
  { id: 'glucosuria', label: 'Glucosuria', params: { glucose: '2+' } },
  { id: 'ketonuria', label: 'Ketonuria', params: { ketones: '2+' } },
  { id: 'pyuria', label: 'Pyuria', params: { wbc: '>25', leukocytes: '3+' } },
];

const UrinalysisTemplate = ({
  test,
  existingResult,
  onResultChange,
  notes,
  onNotesChange,
}) => {
  // Initialize with normal values
  const getInitialParameters = () => {
    const initial = {};
    UA_PARAMETERS.forEach(param => {
      initial[param.id] = null;
    });
    return initial;
  };

  const [parameters, setParameters] = useState(getInitialParameters);
  const [selectedFindings, setSelectedFindings] = useState([]);

  // Initialize from existing result
  useEffect(() => {
    if (existingResult?.structured) {
      setParameters(prev => ({ ...prev, ...existingResult.structured }));
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

  const handleParameterChange = useCallback((paramId, value) => {
    setParameters(prev => ({
      ...prev,
      [paramId]: value,
    }));
  }, []);

  const handleFindingToggle = useCallback((findingId) => {
    const finding = QUICK_FINDINGS.find(f => f.id === findingId);
    if (!finding) return;

    setSelectedFindings(prev => {
      const isSelected = prev.includes(findingId);
      if (isSelected) {
        return prev.filter(f => f !== findingId);
      } else {
        setParameters(prevParams => ({ ...prevParams, ...finding.params }));
        return [...prev, findingId];
      }
    });
  }, []);

  const handleAllNormal = useCallback(() => {
    const normalValues = {};
    UA_PARAMETERS.forEach(param => {
      normalValues[param.id] = param.normal;
    });
    setParameters(normalValues);
    setSelectedFindings([]);
  }, []);

  const buildResult = useCallback(() => {
    // Check if all values are normal
    const allNormal = UA_PARAMETERS.every(param => {
      const value = parameters[param.id];
      return value === null || value === param.normal;
    });
    
    const hasAbnormal = !allNormal && Object.values(parameters).some(v => v !== null);
    
    const proseParts = [];
    
    if (allNormal && Object.values(parameters).some(v => v !== null)) {
      proseParts.push('Urinalysis within normal limits');
    } else {
      const abnormalities = [];
      UA_PARAMETERS.forEach(param => {
        const value = parameters[param.id];
        if (value && value !== param.normal) {
          abnormalities.push(`${param.name}: ${value}`);
        }
      });
      
      if (abnormalities.length > 0) {
        proseParts.push(`UA shows ${abnormalities.join(', ')}`);
      }
      
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
          color={UA_PARAMETERS.every(p => parameters[p.id] === p.normal) ? 'primary' : 'default'}
          variant={UA_PARAMETERS.every(p => parameters[p.id] === p.normal) ? 'filled' : 'outlined'}
        />
      </Box>

      {/* Parameters */}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Dipstick & Microscopy
      </Typography>
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {UA_PARAMETERS.map(param => (
          <Grid item xs={6} key={param.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80, fontSize: '0.8rem' }}>
                {param.name}
              </Typography>
              <FormControl size="small" fullWidth>
                <Select
                  value={parameters[param.id] || ''}
                  onChange={(e) => handleParameterChange(param.id, e.target.value)}
                  displayEmpty
                  sx={{ 
                    fontSize: '0.8rem',
                    '& .MuiSelect-select': { py: 0.5 },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    <em>Select</em>
                  </MenuItem>
                  {param.options.map(opt => (
                    <MenuItem 
                      key={opt} 
                      value={opt}
                      sx={{ 
                        fontSize: '0.8rem',
                      }}
                    >
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Quick Findings */}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Quick Findings
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {QUICK_FINDINGS.map(finding => (
          <Chip
            key={finding.id}
            label={finding.label}
            onClick={() => handleFindingToggle(finding.id)}
            color={selectedFindings.includes(finding.id) ? 'primary' : 'default'}
            variant={selectedFindings.includes(finding.id) ? 'filled' : 'outlined'}
            size="small"
            sx={{ fontSize: '0.75rem' }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default UrinalysisTemplate;
