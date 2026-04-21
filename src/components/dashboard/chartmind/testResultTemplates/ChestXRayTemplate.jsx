/**
 * ChestXRayTemplate - Chest X-Ray result entry template
 * 
 * Structured entry for common CXR findings:
 * - Lungs (clear, infiltrate, consolidation, nodule, effusion)
 * - Heart (normal, cardiomegaly)
 * - Mediastinum
 * - Bones
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Grid,
  FormControlLabel,
  Checkbox,
} from '@mui/material';

// CXR findings organized by region
const CXR_FINDINGS = {
  lungs: {
    label: 'Lungs',
    options: [
      { id: 'clear', label: 'Clear', normal: true },
      { id: 'infiltrate', label: 'Infiltrate' },
      { id: 'consolidation', label: 'Consolidation' },
      { id: 'nodule', label: 'Nodule/Mass' },
      { id: 'effusion', label: 'Pleural Effusion' },
      { id: 'pneumothorax', label: 'Pneumothorax' },
      { id: 'atelectasis', label: 'Atelectasis' },
      { id: 'hyperinflation', label: 'Hyperinflation' },
      { id: 'interstitial', label: 'Interstitial Pattern' },
    ],
  },
  heart: {
    label: 'Heart',
    options: [
      { id: 'normal_heart', label: 'Normal Size', normal: true },
      { id: 'cardiomegaly', label: 'Cardiomegaly' },
      { id: 'enlarged_left', label: 'Left Atrial Enlargement' },
    ],
  },
  mediastinum: {
    label: 'Mediastinum',
    options: [
      { id: 'normal_mediastinum', label: 'Normal', normal: true },
      { id: 'widened', label: 'Widened' },
      { id: 'mass', label: 'Mass/Lymphadenopathy' },
    ],
  },
  other: {
    label: 'Other',
    options: [
      { id: 'normal_bones', label: 'Bones Normal', normal: true },
      { id: 'rib_fracture', label: 'Rib Fracture' },
      { id: 'degenerative', label: 'Degenerative Changes' },
      { id: 'devices', label: 'Lines/Tubes Present' },
    ],
  },
};

// Common patterns for quick selection
const QUICK_FINDINGS = [
  { id: 'pneumonia', label: 'Pneumonia', findings: ['infiltrate', 'consolidation'] },
  { id: 'chf', label: 'CHF Pattern', findings: ['cardiomegaly', 'effusion', 'interstitial'] },
  { id: 'copd', label: 'COPD Pattern', findings: ['hyperinflation', 'clear'] },
  { id: 'normal', label: 'Normal CXR', findings: ['clear', 'normal_heart', 'normal_mediastinum', 'normal_bones'] },
];

const ChestXRayTemplate = ({
  test,
  existingResult,
  onResultChange,
  notes,
  onNotesChange,
}) => {
  const [selectedFindings, setSelectedFindings] = useState([]);
  const [quickPatterns, setQuickPatterns] = useState([]);

  // Initialize from existing result
  useEffect(() => {
    if (existingResult?.structured?.findings) {
      setSelectedFindings(existingResult.structured.findings);
    }
    if (existingResult?.patterns) {
      setQuickPatterns(existingResult.patterns);
    }
  }, [existingResult]);

  // Update parent when findings change
  useEffect(() => {
    if (selectedFindings.length > 0) {
      const result = buildResult();
      onResultChange?.(result);
    }
  }, [selectedFindings, quickPatterns]);

  const handleFindingToggle = useCallback((findingId) => {
    setSelectedFindings(prev => {
      if (prev.includes(findingId)) {
        return prev.filter(f => f !== findingId);
      } else {
        return [...prev, findingId];
      }
    });
  }, []);

  const handleQuickPattern = useCallback((patternId) => {
    const pattern = QUICK_FINDINGS.find(p => p.id === patternId);
    if (!pattern) return;

    setQuickPatterns(prev => {
      const isSelected = prev.includes(patternId);
      if (isSelected) {
        return prev.filter(p => p !== patternId);
      } else {
        // Add pattern's findings
        setSelectedFindings(prevFindings => {
          const newFindings = [...prevFindings];
          pattern.findings.forEach(f => {
            if (!newFindings.includes(f)) {
              newFindings.push(f);
            }
          });
          return newFindings;
        });
        return [...prev, patternId];
      }
    });
  }, []);

  const handleAllNormal = useCallback(() => {
    setSelectedFindings(['clear', 'normal_heart', 'normal_mediastinum', 'normal_bones']);
    setQuickPatterns(['normal']);
  }, []);

  const buildResult = useCallback(() => {
    // Get all findings metadata
    const allOptions = Object.values(CXR_FINDINGS).flatMap(cat => cat.options);
    const normalFindings = allOptions.filter(o => o.normal).map(o => o.id);
    
    // Check if all selected are normal
    const hasAbnormal = selectedFindings.some(f => !normalFindings.includes(f));
    
    const proseParts = [];
    
    if (!hasAbnormal && selectedFindings.length > 0) {
      proseParts.push('Chest X-ray unremarkable');
    } else {
      const abnormalLabels = [];
      selectedFindings.forEach(findingId => {
        const option = allOptions.find(o => o.id === findingId);
        if (option && !option.normal) {
          abnormalLabels.push(option.label.toLowerCase());
        }
      });
      
      if (abnormalLabels.length > 0) {
        proseParts.push(`CXR shows ${abnormalLabels.join(', ')}`);
      }
      
      // Add pattern labels
      if (quickPatterns.length > 0 && quickPatterns[0] !== 'normal') {
        const patternLabels = quickPatterns.map(pId => 
          QUICK_FINDINGS.find(p => p.id === pId)?.label
        ).filter(Boolean);
        if (patternLabels.length > 0) {
          proseParts.push(`consistent with ${patternLabels.join(', ')}`);
        }
      }
    }

    return {
      status: hasAbnormal ? 'Abnormal' : 'Normal',
      structured: { findings: selectedFindings },
      patterns: quickPatterns,
      notes: notes || '',
      prose: proseParts.length > 0 ? proseParts.join('; ') + '.' : 'Chest X-ray performed.',
    };
  }, [selectedFindings, quickPatterns, notes]);

  // Check if normal
  const isAllNormal = selectedFindings.length > 0 && 
    selectedFindings.every(f => ['clear', 'normal_heart', 'normal_mediastinum', 'normal_bones'].includes(f));

  return (
    <Box>
      {/* All Normal Button */}
      <Box sx={{ mb: 2 }}>
        <Chip
          label="Normal / Unremarkable"
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
        {QUICK_FINDINGS.filter(p => p.id !== 'normal').map(pattern => (
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

      {/* Detailed Findings by Region */}
      {Object.entries(CXR_FINDINGS).map(([regionKey, region]) => (
        <Box key={regionKey} sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
            {region.label}
          </Typography>
          <Grid container spacing={0}>
            {region.options.map(option => (
              <Grid item xs={6} key={option.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedFindings.includes(option.id)}
                      onChange={() => handleFindingToggle(option.id)}
                      size="small"
                    />
                  }
                  label={
                    <Typography 
                      variant="body2" 
                      sx={{ fontSize: '0.8rem' }}
                    >
                      {option.label}
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
};

export default ChestXRayTemplate;
