/**
 * PlanStep - Diagnostic testing/workup plan based on selected diagnoses
 *
 * Step 3 in the ChartMind flow:
 * 1. Record - Transcribe encounter
 * 2. Diagnosis - Select differential diagnoses
 * 3. Plan - Choose tests to confirm/rule out
 * 4. Chart - Generate medical note
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  Button,
} from '@mui/material';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import SelectableCard from './SelectableCard';
import AddTestModal from './AddTestModal';
import TestResultModal from './testResultTemplates/TestResultModal';

// ============================================================================
// Types
// ============================================================================

export interface Diagnosis {
  condition: string;
  likelihood: string;
  rationale?: string;
  urgent?: boolean;
}

export interface DiagnosticTest {
  id: string;
  name: string;
  category: 'lab' | 'imaging' | 'procedure' | 'other';
  rationale: string;
  linkedDiagnoses: string[];
  priority: 'stat' | 'urgent' | 'routine';
  turnaroundTime?: string;
  estimatedCost?: string;
  isCustom?: boolean;
}

export interface DiagnosticPlanData {
  tests: DiagnosticTest[];
  testingStrategy?: string;
  considerations?: string[];
}

export interface PlanStepProps {
  selectedDiagnoses: Diagnosis[];
  planData: DiagnosticPlanData | null;
  loading: boolean;
  error: string | null;
  hasTests: boolean;
  retry: () => void;
  disabledTestIds: Set<string>;
  onToggleTestDisabled: (testId: string) => void;
  onAddTest: (test: Partial<DiagnosticTest>) => void;
  testResults: Map<string, any>;
  onUpdateTestResult: (testId: string, result: any) => void;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  lab: 'Laboratory',
  imaging: 'Imaging',
  procedure: 'Procedures',
  other: 'Other',
};

// ============================================================================
// Sub-Components
// ============================================================================

interface TestCardProps {
  test: DiagnosticTest;
  disabled: boolean;
  onToggleDisabled: () => void;
  onClick: () => void;
  testResult?: any;
}

const getResultSummary = (testResult: any): string | null => {
  if (!testResult) return null;
  if (typeof testResult === 'string') return testResult;
  if (testResult.prose) return testResult.prose;
  if (testResult.status === 'Normal') return 'Normal';
  if (testResult.status === 'Abnormal') return testResult.description || 'Abnormal - see details';
  return 'Result entered';
};

const TestCard: React.FC<TestCardProps> = ({ test, disabled, onToggleDisabled, onClick, testResult }) => {
  const chips: Array<{
    label: string;
    color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
    variant?: 'filled' | 'outlined';
  }> = [];

  if (test.isCustom) chips.push({ label: 'Custom', color: 'default', variant: 'outlined' });
  if (test.priority === 'stat') chips.push({ label: 'STAT', color: 'error', variant: 'filled' });
  else if (test.priority === 'urgent') chips.push({ label: 'Urgent', color: 'warning', variant: 'filled' });

  const resultSummary = getResultSummary(testResult);

  const resultContent = resultSummary ? (
    <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        Result:
      </Typography>
      <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
        {resultSummary}
      </Typography>
    </Box>
  ) : null;

  return (
    <SelectableCard
      title={test.name}
      rationale={test.rationale}
      selectionVariant="none"
      disabled={disabled}
      onEdit={onClick}
      editTooltip={testResult ? "Edit result" : "Enter result"}
      onToggleDisabled={onToggleDisabled}
      chips={chips}
      additionalContent={resultContent}
    />
  );
};

// ============================================================================
// Main Component
// ============================================================================

const PlanStep: React.FC<PlanStepProps> = ({
  selectedDiagnoses,
  planData,
  loading,
  error,
  hasTests,
  retry,
  disabledTestIds,
  onToggleTestDisabled,
  onAddTest,
  testResults,
  onUpdateTestResult,
}) => {
  // ============================================================================
  // TODO: RE-ENABLE VISUALIZATION AFTER FIXING BUGS
  // Temporarily disabled visualization tab due to bugs - needs fixing before deadline
  // Uncomment below to restore visualization functionality:
  // ============================================================================
  // const [viewMode, setViewMode] = useState(1); // 0 = visualization, 1 = list
  // const visualizationContainerRef = useRef<HTMLDivElement>(null);
  // const [vizDimensions, setVizDimensions] = useState({ width: 600, height: 400 });
  
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<DiagnosticTest | null>(null);

  // Handlers for test result modal
  const handleTestClick = (test: DiagnosticTest) => {
    setSelectedTest(test);
    setResultModalOpen(true);
  };

  const handleResultModalClose = () => {
    setResultModalOpen(false);
    setSelectedTest(null);
  };

  const handleResultSave = (result: any) => {
    if (selectedTest) {
      onUpdateTestResult(selectedTest.id, result);
      handleResultModalClose();
    }
  };

  // Group tests by category, including disabled (they render in-place, just dimmed)
  const testsByCategory = useMemo(() => {
    if (!planData?.tests) return new Map<string, DiagnosticTest[]>();

    const grouped = new Map<string, DiagnosticTest[]>();
    for (const test of planData.tests) {
      const category = test.category || 'other';
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category)!.push(test);
    }
    return grouped;
  }, [planData?.tests]);

  // Get existing test names for duplicate check
  const existingTestNames = planData?.tests?.map((t) => t.name) || [];

  // ============================================================================
  // TODO: RE-ENABLE VISUALIZATION AFTER FIXING BUGS
  // ============================================================================
  // React.useEffect(() => {
  //   if (viewMode === 0 && visualizationContainerRef.current) {
  //     const observer = new ResizeObserver((entries) => {
  //       if (entries[0]) {
  //         const { width } = entries[0].contentRect;
  //         setVizDimensions({ width, height: 400 });
  //       }
  //     });
  //     observer.observe(visualizationContainerRef.current);
  //     return () => observer.disconnect();
  //   }
  // }, [viewMode]);

  // ============================================================================
  // TODO: RE-ENABLE VISUALIZATION AFTER FIXING BUGS
  // ============================================================================
  // const testsForVisualization = useMemo(() => {
  //   if (!planData?.tests) return [];
  //   return planData.tests.map((test) => ({
  //     condition: test.name,
  //     likelihood: 'Recommended',
  //     rationale: test.rationale,
  //     urgent: false,
  //   }));
  // }, [planData?.tests]);

  // No diagnoses selected
  if (selectedDiagnoses.length === 0) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
          Diagnostic Plan
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Select a diagnosis first to generate a diagnostic workup plan.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1.5, fontWeight: 600 }}>
          Diagnostic Plan
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Review recommended tests to confirm or rule out your diagnoses. Use the edit button to enter results. Hide tests that don't apply.
        </Typography>
      </Box>

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          sx={{ width: '100%', mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={retry} startIcon={<RefreshRounded />}>
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
            Generating diagnostic workup...
          </Typography>
        </Box>
      )}

      {/* Tests */}
      {!loading && hasTests && planData && (
        <Box sx={{ width: '100%' }}>
          <Box display="flex" justifyContent="flex-end" mb={3}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddRounded />}
              onClick={() => setAddModalOpen(true)}
            >
              Add Test
            </Button>
          </Box>

          {/* ============================================================================ */}
          {/* TODO: RE-ENABLE VISUALIZATION AFTER FIXING BUGS */}
          {/* ============================================================================ */}
          {/* {viewMode === 0 && (
            <Box ref={visualizationContainerRef} sx={{ mb: 3 }}>
              <ChartMindVisualization
                diagnoses={testsForVisualization}
                selectedIds={planData.tests.filter(t => !disabledTestIds.has(t.id)).map(t => t.name)}
                onDiagnosisClick={(test) => {
                  const testObj = planData.tests.find(t => t.name === test.condition);
                  if (testObj) {
                    onToggleTestDisabled(testObj.id);
                  }
                }}
                onAddDiagnosis={() => setAddModalOpen(true)}
                width={vizDimensions.width}
                height={vizDimensions.height}
              />
            </Box>
          )} */}

          {/* Testing Strategy — info alert so it reads as guidance, not another selectable card */}
          {planData.testingStrategy && (
            <Alert severity="info" sx={{ width: '100%', mb: 3 }}>
              <AlertTitle>Testing Strategy</AlertTitle>
              <Typography variant="body2" color="text.secondary" component="div">
                {planData.testingStrategy}
              </Typography>
            </Alert>
          )}

          {/* List View - Now always visible */}

          {/* Tests by category — disabled tests render in-place, dimmed */}
          {Array.from(testsByCategory.entries()).map(([category, tests]) => {
            const label = CATEGORY_LABELS[category] || 'Other';
            return (
              <Box key={category} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                  {label}
                </Typography>
                {tests.map((test) => (
                  <TestCard
                    key={test.id}
                    test={test}
                    disabled={disabledTestIds.has(test.id)}
                    onToggleDisabled={() => onToggleTestDisabled(test.id)}
                    onClick={() => handleTestClick(test)}
                    testResult={testResults.get(test.id)}
                  />
                ))}
              </Box>
            );
          })}

          {/* Considerations */}
          {planData.considerations && planData.considerations.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                    Clinical Considerations
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary' }}>
                    {planData.considerations.map((item, idx) => (
                      <li key={idx}>
                        <Typography variant="body2">{item}</Typography>
                      </li>
                    ))}
                  </Box>
                </Box>
          )}
        </Box>
      )}

      {/* Empty state */}
      {!loading && !hasTests && !error && (
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
          No diagnostic tests generated.
        </Typography>
      )}

      {/* Add Test Modal */}
      <AddTestModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={onAddTest}
        existingTests={existingTestNames}
      />

      {/* Test Result Modal */}
      <TestResultModal
        open={resultModalOpen}
        test={selectedTest}
        onSave={handleResultSave}
        onCancel={handleResultModalClose}
        existingResult={selectedTest ? testResults.get(selectedTest.id) : null}
        onAddReflexTest={(reflexTest) => {
          onAddTest({
            name: reflexTest.name,
            category: reflexTest.category as any,
            rationale: reflexTest.rationale,
            priority: reflexTest.priority as 'stat' | 'urgent' | 'routine',
            id: `${reflexTest.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            linkedDiagnoses: [],
          });
        }}
      />
    </Box>
  );
};

export default PlanStep;
