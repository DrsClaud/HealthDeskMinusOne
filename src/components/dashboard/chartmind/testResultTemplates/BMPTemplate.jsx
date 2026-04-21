/**
 * BMPTemplate - Basic Metabolic Panel result entry template
 * 
 * Structured entry for:
 * - Sodium (Na)
 * - Potassium (K)
 * - Chloride (Cl)
 * - CO2/Bicarbonate
 * - BUN
 * - Creatinine
 * - Glucose
 * - Calcium
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

// BMP parameters
const BMP_PARAMETERS = [
  { id: 'na', name: 'Na', fullName: 'Sodium', unit: 'mEq/L', category: 'electrolytes' },
  { id: 'k', name: 'K', fullName: 'Potassium', unit: 'mEq/L', category: 'electrolytes' },
  { id: 'cl', name: 'Cl', fullName: 'Chloride', unit: 'mEq/L', category: 'electrolytes' },
  { id: 'co2', name: 'CO₂', fullName: 'Bicarbonate', unit: 'mEq/L', category: 'electrolytes' },
  { id: 'bun', name: 'BUN', fullName: 'Blood Urea Nitrogen', unit: 'mg/dL', category: 'kidney' },
  { id: 'cr', name: 'Cr', fullName: 'Creatinine', unit: 'mg/dL', category: 'kidney' },
  { id: 'glucose', name: 'Glucose', fullName: 'Blood Glucose', unit: 'mg/dL', category: 'glucose' },
  { id: 'ca', name: 'Ca', fullName: 'Calcium', unit: 'mg/dL', category: 'other' },
];

// Common abnormality patterns
const QUICK_FINDINGS = [
  { id: 'hyponatremia', label: 'Hyponatremia', params: { na: 'low' } },
  { id: 'hypernatremia', label: 'Hypernatremia', params: { na: 'high' } },
  { id: 'hypokalemia', label: 'Hypokalemia', params: { k: 'low' } },
  { id: 'hyperkalemia', label: 'Hyperkalemia', params: { k: 'high' } },
  { id: 'aki', label: 'AKI', params: { bun: 'high', cr: 'high' } },
  { id: 'ckd', label: 'CKD Pattern', params: { bun: 'high', cr: 'high' } },
  { id: 'hyperglycemia', label: 'Hyperglycemia', params: { glucose: 'high' } },
  { id: 'hypoglycemia', label: 'Hypoglycemia', params: { glucose: 'low' } },
  { id: 'metabolic_acidosis', label: 'Metabolic Acidosis', params: { co2: 'low' } },
  { id: 'metabolic_alkalosis', label: 'Metabolic Alkalosis', params: { co2: 'high' } },
  { id: 'hypocalcemia', label: 'Hypocalcemia', params: { ca: 'low' } },
  { id: 'hypercalcemia', label: 'Hypercalcemia', params: { ca: 'high' } },
];

const BMPTemplate = ({
  test,
  existingResult,
  onResultChange,
  notes,
  onNotesChange,
}) => {
  const [parameters, setParameters] = useState({
    na: null, k: null, cl: null, co2: null,
    bun: null, cr: null, glucose: null, ca: null,
  });

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
      [paramId]: prev[paramId] === value ? null : value,
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
    const allNormal = {};
    BMP_PARAMETERS.forEach(p => { allNormal[p.id] = 'normal'; });
    setParameters(allNormal);
    setSelectedFindings([]);
  }, []);

  const buildResult = useCallback(() => {
    const hasAbnormal = Object.values(parameters).some(v => v === 'high' || v === 'low');
    const allNormal = Object.values(parameters).every(v => v === 'normal');
    
    const proseParts = [];
    
    if (allNormal) {
      proseParts.push('BMP within normal limits');
    } else {
      const abnormalities = [];
      BMP_PARAMETERS.forEach(param => {
        const value = parameters[param.id];
        if (value === 'high') {
          abnormalities.push(`elevated ${param.name}`);
        } else if (value === 'low') {
          abnormalities.push(`low ${param.name}`);
        }
      });
      
      if (abnormalities.length > 0) {
        proseParts.push(`BMP shows ${abnormalities.join(', ')}`);
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

  // Group parameters by category
  const electrolyteParams = BMP_PARAMETERS.filter(p => p.category === 'electrolytes');
  const kidneyParams = BMP_PARAMETERS.filter(p => p.category === 'kidney');
  const otherParams = BMP_PARAMETERS.filter(p => p.category === 'glucose' || p.category === 'other');

  const renderParameterRow = (param) => (
    <Grid item xs={6} key={param.id}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 0.5,
          borderRadius: 1,
          bgcolor: parameters[param.id] ? 'action.selected' : 'transparent',
        }}
      >
        <Tooltip title={param.fullName} arrow placement="left">
          <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 50, fontSize: '0.8rem' }}>
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
            <LowIcon sx={{ fontSize: 16 }} />
          </ToggleButton>
          <ToggleButton value="normal">
            <NormalIcon sx={{ fontSize: 16 }} />
          </ToggleButton>
          <ToggleButton value="high">
            <HighIcon sx={{ fontSize: 16 }} />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Grid>
  );

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

      {/* Electrolytes */}
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
        Electrolytes
      </Typography>
      <Grid container spacing={0.5} sx={{ mb: 1.5 }}>
        {electrolyteParams.map(renderParameterRow)}
      </Grid>

      {/* Kidney Function */}
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
        Kidney Function
      </Typography>
      <Grid container spacing={0.5} sx={{ mb: 1.5 }}>
        {kidneyParams.map(renderParameterRow)}
      </Grid>

      {/* Other */}
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
        Other
      </Typography>
      <Grid container spacing={0.5} sx={{ mb: 2 }}>
        {otherParams.map(renderParameterRow)}
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

export default BMPTemplate;
