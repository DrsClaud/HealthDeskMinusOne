/**
 * useChartMindSession - Master hook for ChartMind session state management
 * 
 * Composes all ChartMind hooks and lifts component state into a single
 * coordinated session that can be serialized for Firestore persistence.
 * 
 * Phase 1: Hook composition and state consolidation
 * Phase 2: Serialization layer (serializeSession, hydrateSession)
 * Phase 3: Firestore integration (saveSession, loadSession)
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useDebounce, useDebouncedCallback } from "use-debounce";
import useVoiceRecording from "hooks/useVoiceRecording";
import useChartMind from "hooks/useChartMind";
import useChartGeneration from "hooks/useChartGeneration";
import useDiagnosticPlan from "hooks/useDiagnosticPlan";
import useConfirmDiagnosis from "hooks/useConfirmDiagnosis";
import useTreatmentPlan from "hooks/useTreatmentPlan";
import useChartMindDischarge from "hooks/useChartMindDischarge";
import { useAuth } from "hooks/useAuth";
import { STEPS } from "components/dashboard/chartmind/ChartMindHeader";
import * as sessionService from "services/chartMindSessionService";

/**
 * useChartMindSession Hook
 * 
 * @param {string|null} initialSessionId - Optional session ID to load on mount
 * @returns {Object} Grouped session state and actions
 */
function useChartMindSession(initialSessionId = null) {
  // Get current user for session persistence
  const { user, organizationId, isGlobalAdmin } = useAuth();

  // ============================================================================
  // COMPOSE EXISTING HOOKS
  // ============================================================================
  
  // Note: onDataChanged callbacks will be defined after autoSaveSession is created
  // We'll use a ref to avoid circular dependencies
  const onDataChangedRef = useRef(null);
  
  const [recordingLanguage, setRecordingLanguage] = useState('en-US');
  const recordingHook = useVoiceRecording({ language: recordingLanguage });
  const diagnosisHook = useChartMind({ onDataChanged: () => onDataChangedRef.current?.() });
  const chartHook = useChartGeneration({ onDataChanged: () => onDataChangedRef.current?.() });
  const diagnosticPlanHook = useDiagnosticPlan({ onDataChanged: () => onDataChangedRef.current?.() });
  const confirmDiagnosisHook = useConfirmDiagnosis({ onDataChanged: () => onDataChangedRef.current?.() });
  const treatmentPlanHook = useTreatmentPlan({ onDataChanged: () => onDataChangedRef.current?.() });
  const dischargeHook = useChartMindDischarge({ onDataChanged: () => onDataChangedRef.current?.() });
  
  // Debounce transcript for manual text input (1.5s after typing stops)
  const [debouncedTranscript] = useDebounce(recordingHook.transcript, 1500);
  const reportingMetadata = useMemo(
    () => ({
      organizationId: organizationId || null,
      isSimulation: Boolean(isGlobalAdmin),
    }),
    [organizationId, isGlobalAdmin],
  );

  // ============================================================================
  // SESSION STATE
  // ============================================================================
  
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!initialSessionId);
  const [sessionError, setSessionError] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasLoadedSession, setHasLoadedSession] = useState(false); // Track if we've loaded the initial session
  const [lastSavedAt, setLastSavedAt] = useState(null); // Timestamp of last successful save
  
  // If we're loading a session on mount, start with hydrating flag true
  const [isInitialLoad] = useState(!!initialSessionId);
  
  // ============================================================================
  // AUTO-SAVE STATE
  // ============================================================================
  
  // Track last saved snapshot for change detection
  const lastSavedSnapshotRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const autoSaveSessionRef = useRef(null);
  const isSavingRef = useRef(false); // Prevent concurrent saves
  const isHydratingRef = useRef(isInitialLoad); // Start true if loading session on mount
  // Always-current ref for serializeSession — avoids stale closure inside loadSession's setTimeout
  const serializeSessionRef = useRef(null);

  // ============================================================================
  // LIFT LOCAL STATE (previously in ChartMindPage)
  // ============================================================================
  
  // Navigation state
  const [currentStep, setCurrentStep] = useState(STEPS.RECORD);
  const [visitedSteps, setVisitedSteps] = useState(new Set([STEPS.RECORD]));
  
  // Diagnosis state
  const [selectedDiagnoses, setSelectedDiagnoses] = useState([]);
  /** User-added diagnoses from "Add Diagnosis" — must live in session for save/hydrate */
  const [customDiagnoses, setCustomDiagnoses] = useState([]);
  const [disabledDiagnosisIds, setDisabledDiagnosisIds] = useState(new Set());
  
  // Diagnostic plan state
  const [disabledTestIds, setDisabledTestIds] = useState(new Set());
  const [testResults, setTestResults] = useState(new Map());
  
  // Confirmed diagnosis state
  const [selectedConfirmedDiagnoses, setSelectedConfirmedDiagnoses] = useState([]);
  
  // Treatment state
  const [disabledTreatmentIds, setDisabledTreatmentIds] = useState(new Set());
  const [selectedTreatments, setSelectedTreatments] = useState(new Set());
  
  // UI behavior tracking refs (not serialized to DB)
  const userNavigatedRef = useRef(false);
  const analysisTriggeredRef = useRef(false);
  const generatedForRef = useRef(null);

  // ============================================================================
  // AUTO-ANALYSIS EFFECTS
  // ============================================================================

  // Auto-analyze on debounced manual text input (when not recording)
  useEffect(() => {
    if (
      !recordingHook.isRecording &&
      debouncedTranscript &&
      debouncedTranscript.length >= 50 &&
      !diagnosisHook.loading &&
      !analysisTriggeredRef.current &&
      !diagnosisHook.hasDiagnoses // Don't auto-analyze if we already have diagnoses (from loaded session)
    ) {
      diagnosisHook.analyzeDDX(debouncedTranscript);
    }
  }, [debouncedTranscript, recordingHook.isRecording, diagnosisHook.loading, diagnosisHook.analyzeDDX, diagnosisHook.hasDiagnoses]);

  // Reset analysis trigger when transcript changes significantly
  useEffect(() => {
    analysisTriggeredRef.current = false;
  }, [recordingHook.transcript]);

  // ============================================================================
  // HANDLERS (lifted from ChartMindPage)
  // ============================================================================

  /**
   * Handle mic button click
   */
  const handleMicClick = useCallback(async () => {
    if (recordingHook.isRecording) {
      // When stopping, immediately start DDX analysis
      await recordingHook.stopRecording();
      userNavigatedRef.current = false;
      analysisTriggeredRef.current = true;

      // Start DDX analysis immediately with current transcript
      if (recordingHook.transcript && recordingHook.transcript.length >= 50) {
        diagnosisHook.analyzeDDX(recordingHook.transcript);
      }
    } else {
      await recordingHook.startRecording();
    }
  }, [
    recordingHook.isRecording, 
    recordingHook.stopRecording, 
    recordingHook.startRecording,
    recordingHook.transcript,
    diagnosisHook.analyzeDDX
  ]);

  /**
   * Handle step change (manual navigation)
   */
  const handleStepChange = useCallback((step) => {
    userNavigatedRef.current = true;
    setCurrentStep(step);
    // Unlock Diagnosis when manually navigating to it
    if (step === STEPS.DIAGNOSIS && recordingHook.transcript) {
      setVisitedSteps(prev => new Set([...prev, STEPS.DIAGNOSIS]));
    }
    // Auto-save on navigation (only if data changed)
    autoSaveSessionRef.current?.('handleStepChange');
  }, [recordingHook.transcript]);

  /**
   * Handle diagnosis selection change
   */
  const handleSelectionChange = useCallback((newSelection) => {
    setSelectedDiagnoses(newSelection);
  }, []);

  /**
   * Add a custom diagnosis from the modal and select it so session snapshot updates (auto-save).
   */
  const handleAddCustomDiagnosis = useCallback((diagnosis) => {
    setCustomDiagnoses((prev) => [...prev, diagnosis]);
    setSelectedDiagnoses([diagnosis]);
  }, []);

  /**
   * Handle confirmed diagnosis selection change
   */
  const handleConfirmedSelectionChange = useCallback((newSelection) => {
    setSelectedConfirmedDiagnoses(newSelection);
  }, []);

  /**
   * Toggle diagnosis disabled state
   */
  const handleToggleDiagnosisDisabled = useCallback((diagnosisId) => {
    setDisabledDiagnosisIds((prev) => {
      const next = new Set(prev);
      if (next.has(diagnosisId)) {
        next.delete(diagnosisId);
      } else {
        next.add(diagnosisId);
      }
      return next;
    });
  }, []);

  /**
   * Toggle diagnostic test disabled state
   */
  const handleToggleTestDisabled = useCallback((testId) => {
    setDisabledTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  }, []);

  /**
   * Update test result
   */
  const handleUpdateTestResult = useCallback((testId, result) => {
    setTestResults((prev) => {
      const next = new Map(prev);
      if (result === null || result === undefined) {
        next.delete(testId);
      } else {
        next.set(testId, result);
      }
      return next;
    });
  }, []);

  /**
   * Toggle treatment disabled state
   */
  const handleToggleTreatmentDisabled = useCallback((treatmentId) => {
    setDisabledTreatmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(treatmentId)) {
        next.delete(treatmentId);
      } else {
        next.add(treatmentId);
        // Auto-deselect when disabling
        setSelectedTreatments((prevSelected) => {
          const nextSelected = new Set(prevSelected);
          nextSelected.delete(treatmentId);
          return nextSelected;
        });
      }
      return next;
    });
  }, []);

  /**
   * Toggle treatment selected state
   */
  const handleToggleTreatmentSelected = useCallback((treatmentId) => {
    setSelectedTreatments((prev) => {
      const next = new Set(prev);
      if (next.has(treatmentId)) {
        next.delete(treatmentId);
      } else {
        next.add(treatmentId);
      }
      return next;
    });
  }, []);

  /**
   * Create stable identifier for generation request
   */
  const getGenerationKey = useCallback((transcript, diagnoses) => {
    const diagnosisCondition = diagnoses[0]?.condition || '';
    return `${transcript.slice(0, 100)}|${diagnosisCondition}`;
  }, []);

  /**
   * Prefetch note generation (called after debounce when diagnosis selected)
   * DISABLED: This was causing premature note generation before discharge step
   */
  const handlePrefetch = useCallback(async (diagnoses) => {
    // Prefetch disabled - note will only generate when user clicks "Generate Note" button
    // if (diagnoses.length > 0 && recordingHook.transcript) {
    //   const genKey = getGenerationKey(recordingHook.transcript, diagnoses);
    //   generatedForRef.current = genKey;
    //   await chartHook.generateNote(recordingHook.transcript, diagnoses);
    // }
  }, [currentStep]);

  /**
   * Continue to Diagnosis step
   */
  const handleContinueToDiagnosis = useCallback(() => {
    setCurrentStep(STEPS.DIAGNOSIS);
    setVisitedSteps(prev => new Set([...prev, STEPS.RECORD, STEPS.DIAGNOSIS]));
    autoSaveSessionRef.current?.('handleContinueToDiagnosis');
  }, []);

  /**
   * Continue to Diagnostic Plan step
   */
  const handleContinueToPlan = useCallback(() => {
    setCurrentStep(STEPS.DIAGNOSTIC_PLAN);
    setVisitedSteps(prev => new Set([...prev, STEPS.DIAGNOSIS, STEPS.DIAGNOSTIC_PLAN]));
    // Generate diagnostic plan based on transcript and selected diagnoses
    if (recordingHook.transcript && selectedDiagnoses.length > 0) {
      diagnosticPlanHook.generatePlan(recordingHook.transcript, selectedDiagnoses);
    }
    autoSaveSessionRef.current?.('handleContinueToPlan');
  }, [recordingHook.transcript, selectedDiagnoses, diagnosticPlanHook.generatePlan]);

  /**
   * Continue to Confirm Diagnosis step
   */
  const handleContinueToConfirm = useCallback(() => {
    setCurrentStep(STEPS.CONFIRM_DIAGNOSIS);
    setVisitedSteps(prev => new Set([...prev, STEPS.DIAGNOSTIC_PLAN, STEPS.CONFIRM_DIAGNOSIS]));
    // Generate confirmed diagnoses based on test results
    // IMPORTANT: Pass the ORIGINAL DDX data (not just selected diagnoses) as the seed
    if (recordingHook.transcript && diagnosisHook.ddxData) {
      confirmDiagnosisHook.generateConfirmedDiagnoses(
        recordingHook.transcript,
        testResults,
        diagnosisHook.ddxData,  // Original DDX is the seed
        disabledDiagnosisIds    // Pass disabled diagnosis IDs to LLM
      );
    }
    autoSaveSessionRef.current?.('handleContinueToConfirm');
  }, [
    recordingHook.transcript,
    diagnosisHook.ddxData,
    testResults,
    disabledDiagnosisIds,
    confirmDiagnosisHook.generateConfirmedDiagnoses
  ]);

  /**
   * Continue to Treatment step
   */
  const handleContinueToTreatment = useCallback(() => {
    setCurrentStep(STEPS.TREATMENT);
    setVisitedSteps(prev => new Set([...prev, STEPS.CONFIRM_DIAGNOSIS, STEPS.TREATMENT]));
    // Generate treatment plan - use confirmed diagnoses if available, otherwise use preliminary
    const diagnosesForTreatment = selectedConfirmedDiagnoses.length > 0 
      ? selectedConfirmedDiagnoses 
      : selectedDiagnoses;
    
    if (recordingHook.transcript && diagnosesForTreatment.length > 0) {
      treatmentPlanHook.generatePlan(
        recordingHook.transcript, 
        diagnosesForTreatment, 
        diagnosticPlanHook.planData
      );
    }
    autoSaveSessionRef.current?.('handleContinueToTreatment');
  }, [
    recordingHook.transcript, 
    selectedDiagnoses,
    selectedConfirmedDiagnoses,
    diagnosticPlanHook.planData, 
    treatmentPlanHook.generatePlan
  ]);

  /**
   * Continue to Discharge step
   */
  const handleContinueToDischarge = useCallback(() => {
    setCurrentStep(STEPS.DISCHARGE);
    setVisitedSteps(prev => new Set([...prev, STEPS.TREATMENT, STEPS.DISCHARGE]));
    autoSaveSessionRef.current?.('handleContinueToDischarge');
  }, []);

  /**
   * Continue to Chart step
   */
  const handleContinueToChart = useCallback(async () => {
    setCurrentStep(STEPS.CHART);
    setVisitedSteps(prev => new Set([...prev, STEPS.DISCHARGE, STEPS.CHART]));

    // Check if we already have a valid note generated
    const genKey = getGenerationKey(recordingHook.transcript, selectedDiagnoses);
    const alreadyGenerated = 
      chartHook.hasNote && 
      chartHook.noteSections && 
      Object.keys(chartHook.noteSections).length > 0 && 
      generatedForRef.current === genKey;

    // Only generate if not already generated for this diagnosis + transcript combo
    if (!alreadyGenerated) {
      generatedForRef.current = genKey;
      await chartHook.generateNote(recordingHook.transcript, selectedDiagnoses);
    }
    
    autoSaveSessionRef.current?.('handleContinueToChart');
  }, [
    recordingHook.transcript, 
    selectedDiagnoses, 
    chartHook.generateNote, 
    chartHook.hasNote, 
    chartHook.noteSections, 
    getGenerationKey,
    currentStep
  ]);

  /**
   * Copy note to clipboard
   */
  const handleCopyToClipboard = useCallback(async () => {
    const text = chartHook.formatForClipboard();
    await navigator.clipboard.writeText(text);
  }, [chartHook.formatForClipboard]);

  /**
   * Regenerate note
   */
  const handleRegenerate = useCallback(async () => {
    generatedForRef.current = null;
    const genKey = getGenerationKey(recordingHook.transcript, selectedDiagnoses);
    generatedForRef.current = genKey;
    await chartHook.generateNote(recordingHook.transcript, selectedDiagnoses);
  }, [recordingHook.transcript, selectedDiagnoses, chartHook.generateNote, getGenerationKey]);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    if (currentStep === STEPS.DIAGNOSIS) {
      setCurrentStep(STEPS.RECORD);
    } else if (currentStep === STEPS.DIAGNOSTIC_PLAN) {
      setCurrentStep(STEPS.DIAGNOSIS);
    } else if (currentStep === STEPS.CONFIRM_DIAGNOSIS) {
      setCurrentStep(STEPS.DIAGNOSTIC_PLAN);
    } else if (currentStep === STEPS.TREATMENT) {
      setCurrentStep(STEPS.CONFIRM_DIAGNOSIS);
    } else if (currentStep === STEPS.DISCHARGE) {
      setCurrentStep(STEPS.TREATMENT);
    } else if (currentStep === STEPS.CHART) {
      setCurrentStep(STEPS.DISCHARGE);
    }
    autoSaveSessionRef.current?.('handleBack');
  }, [currentStep]);

  // ============================================================================
  // SERIALIZATION (Phase 2) - MUST BE BEFORE AUTO-SAVE
  // ============================================================================

  /**
   * Helper: Check if a value is "empty" (null, undefined, empty string, empty array, empty object)
   */
  const isEmpty = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
  };

  /**
   * Helper: Remove empty values from an object recursively
   */
  const removeEmptyValues = (obj) => {
    if (Array.isArray(obj)) {
      const filtered = obj.filter(item => !isEmpty(item));
      return filtered.length > 0 ? filtered : undefined;
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = removeEmptyValues(value);
        if (!isEmpty(cleanedValue)) {
          cleaned[key] = cleanedValue;
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }
    
    return isEmpty(obj) ? undefined : obj;
  };

  /**
   * Serialize current session state to JSON-safe object for Firestore
   * Optimizations:
   * - Excludes: empty sections, navigation, template, version, rawResponse (debug only)
   * - Excludes: timestamp (added by Firestore via serverTimestamp)
   * - Stores diagnosis references (condition names) instead of full objects
   * - Minimal data for efficient storage
   */
  const serializeSession = useCallback(() => {
    const raw = {
      // Navigation state (current step)
      navigation: {
        currentStep,
      },
      
      // Recording state (only if transcript exists)
      recording: recordingHook.transcript && recordingHook.transcript.trim() ? {
        transcript: recordingHook.transcript,
      } : undefined,
      
      // Diagnosis state (only if has data)
      // Store ddxData (full AI response) + selected diagnosis names (not full objects)
      diagnosis: (diagnosisHook.ddxData || (selectedDiagnoses && selectedDiagnoses.length > 0) || disabledDiagnosisIds.size > 0 || customDiagnoses.length > 0) ? {
        ...(diagnosisHook.ddxData && { ddxData: diagnosisHook.ddxData }),
        ...(customDiagnoses.length > 0 && { customDiagnoses }),
        // Store only condition names, not full objects (reduces duplication)
        ...(selectedDiagnoses && selectedDiagnoses.length > 0 && { 
          selectedDiagnosisNames: selectedDiagnoses.map(d => d.condition || d.name)
        }),
        ...(disabledDiagnosisIds.size > 0 && { disabledDiagnosisIds: Array.from(disabledDiagnosisIds) }),
      } : undefined,
      
      // Diagnostic plan state (only if has data)
      diagnosticPlan: (diagnosticPlanHook.planData || disabledTestIds.size > 0 || testResults.size > 0) ? {
        ...(diagnosticPlanHook.planData && { planData: diagnosticPlanHook.planData }),
        ...(disabledTestIds.size > 0 && { disabledTestIds: Array.from(disabledTestIds) }),
        // Convert Map to plain object for Firestore (doesn't support nested arrays)
        ...(testResults.size > 0 && { testResults: Object.fromEntries(testResults) }),
      } : undefined,
      
      // Confirmed diagnosis state (only if has data)
      confirmDiagnosis: (confirmDiagnosisHook.confirmedData || (selectedConfirmedDiagnoses && selectedConfirmedDiagnoses.length > 0)) ? {
          ...(confirmDiagnosisHook.confirmedData && { confirmedData: confirmDiagnosisHook.confirmedData }),
          // Store only condition names, not full objects (reduces duplication)
          ...(selectedConfirmedDiagnoses && selectedConfirmedDiagnoses.length > 0 && { 
            selectedConfirmedDiagnosisNames: selectedConfirmedDiagnoses.map(d => d.condition || d.name)
          }),
        } : undefined,
      
      // Treatment state (only if has data)
      treatment: (treatmentPlanHook.planData || disabledTreatmentIds.size > 0 || selectedTreatments.size > 0) ? {
        ...(treatmentPlanHook.planData && { planData: treatmentPlanHook.planData }),
        ...(disabledTreatmentIds.size > 0 && { disabledTreatmentIds: Array.from(disabledTreatmentIds) }),
        ...(selectedTreatments.size > 0 && { selectedTreatments: Array.from(selectedTreatments) }),
      } : undefined,
      
      // Discharge state (only if has instructions or patientName - date only included if other data exists)
      discharge: (() => {
        const hasInstructions = dischargeHook.instructions && dischargeHook.instructions.length > 0;
        const hasPatientName = dischargeHook.patientName && dischargeHook.patientName.trim();
        
        // Only create discharge object if there are instructions or patientName
        if (!hasInstructions && !hasPatientName) {
          return undefined;
        }
        
        // Build discharge object with only non-empty fields
        const discharge = {};
        if (hasInstructions) {
          discharge.instructions = dischargeHook.instructions;
          discharge.includedInstructionIds = Array.from(dischargeHook.includedInstructionIds);
        }
        if (hasPatientName) {
          discharge.patientName = dischargeHook.patientName;
        }
        // Only include date if there are instructions or patientName (not just default date alone)
        if ((hasInstructions || hasPatientName) && dischargeHook.date) {
          discharge.date = dischargeHook.date;
        }
        if (dischargeHook.hasBeenGenerated) {
          discharge.hasBeenGenerated = dischargeHook.hasBeenGenerated;
        }
        
        return Object.keys(discharge).length > 0 ? discharge : undefined;
      })(),
      
      // Chart state (persist note sections and user feedback together)
      chart:
        (chartHook.noteSections &&
          Object.keys(chartHook.noteSections).length > 0) ||
        chartHook.feedback
          ? {
              ...(chartHook.noteSections && {
                noteSections: chartHook.noteSections,
              }),
              ...(chartHook.feedback && {
                feedback: chartHook.feedback,
              }),
            }
          : undefined,
    };

    // Remove all undefined/empty values recursively
    return removeEmptyValues(raw);
  }, [
    currentStep,
    recordingHook.transcript,
    diagnosisHook.ddxData,
    selectedDiagnoses,
    customDiagnoses,
    disabledDiagnosisIds,
    diagnosticPlanHook.planData,
    disabledTestIds,
    testResults,
    confirmDiagnosisHook.confirmedData,
    selectedConfirmedDiagnoses,
    treatmentPlanHook.planData,
    disabledTreatmentIds,
    selectedTreatments,
    dischargeHook.instructions,
    dischargeHook.includedInstructionIds,
    dischargeHook.patientName,
    dischargeHook.date,
    dischargeHook.hasBeenGenerated,
    chartHook.noteSections,
    chartHook.feedback,
  ]);

  // ============================================================================
  // AUTO-SAVE LOGIC
  // ============================================================================

  /**
   * Check if session data has changed since last save
   * Uses JSON.stringify for deep comparison (safe because data is JSON-serializable)
   */
  const hasDataChanged = useCallback((currentData) => {
    if (!lastSavedSnapshotRef.current) return true;
    
    const currentJson = JSON.stringify(currentData);
    const lastSavedJson = JSON.stringify(lastSavedSnapshotRef.current);
    
    return currentJson !== lastSavedJson;
  }, []);

  /**
   * Auto-save session to Firestore (only if data changed)
   * This is called from three places:
   * 1. Immediately after AI workflow completes
   * 2. After 3s debounce when user edits data
   * 3. When navigating between steps
   * 
   * Guards against concurrent saves to prevent race conditions
   * 
   * @param {string} source - Debug label for where this save was triggered from
   */
  const autoSaveSession = useCallback(async (source = 'unknown') => {
    if (!user?.uid) return;
    
    // CRITICAL: Prevent auto-save during hydration (blocks all paths: AI callbacks + debounced edits)
    if (isHydratingRef.current) return;
    
    // CRITICAL: Prevent concurrent saves (race condition guard)
    if (isSavingRef.current) return;
    
    // CRITICAL: Don't save blank encounters - require at least a transcript
    if (!recordingHook.transcript || recordingHook.transcript.trim().length === 0) return;
    
    const currentData = serializeSession();
    
    // Skip if no meaningful data yet (empty object)
    if (!currentData || Object.keys(currentData).length === 0) return;
    
    // Skip if data unchanged
    if (!hasDataChanged(currentData)) return;
    
    try {
      // Set lock BEFORE any async operations
      isSavingRef.current = true;
      setSaving(true);
      
      // Create session ID if this is first save
      const isFirstSave = !sessionId;
      const id =
        sessionId ||
        (await sessionService.createNewSession(user.uid, reportingMetadata));
      
      // Generate title on first save (background - non-blocking)
      if (isFirstSave && recordingHook.transcript) {
        sessionService.generateSessionTitle(id, recordingHook.transcript)
          .catch(err => console.warn('[AutoSave] Title generation failed:', err.message));
      }
      
      // Save to Firestore
      await sessionService.saveSession(
        id,
        currentData,
        user.uid,
        reportingMetadata,
      );
      
      // Set as active session if new
      if (isFirstSave) {
        setSessionId(id);
        await sessionService.setActiveSessionId(user.uid, id);
      }
      
      // Update snapshot and clear unsaved flag
      lastSavedSnapshotRef.current = currentData;
      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());
      
      return id;
    } catch (error) {
      console.error('[AutoSave] Save failed:', error);
      setSessionError(error.message);
    } finally {
      // Release lock AFTER everything completes
      isSavingRef.current = false;
      setSaving(false);
    }
  }, [
    user?.uid,
    sessionId,
    serializeSession,
    hasDataChanged,
    recordingHook.transcript,
    reportingMetadata,
  ]);

  // Create debounced version for navigation saves (3s delay to catch accidental clicks)
  const debouncedAutoSaveNavigation = useDebouncedCallback(
    (source) => autoSaveSession(source),
    3000,
    { leading: false, trailing: true }
  );

  // Wire up the refs to autoSaveSession after it's defined
  useEffect(() => {
    onDataChangedRef.current = () => autoSaveSession('ai-callback');
    autoSaveSessionRef.current = (source) => debouncedAutoSaveNavigation(source || 'ref');
  }, [autoSaveSession, debouncedAutoSaveNavigation]);

  // Keep serializeSessionRef current so loadSession's setTimeout can call the latest version
  useEffect(() => {
    serializeSessionRef.current = serializeSession;
  }, [serializeSession]);

  /**
   * Create a snapshot of current session for debounced save detection
   * This tracks all user-editable state
   */
  const currentSessionSnapshot = useMemo(() => 
    JSON.stringify(serializeSession())
  , [
    serializeSession,
    // Navigation state
    currentStep,
    // Recording state
    recordingHook.transcript,
    // Diagnosis state
    diagnosisHook.ddxData,
    selectedDiagnoses,
    customDiagnoses,
    // Diagnostic plan state
    diagnosticPlanHook.planData,
    disabledTestIds,
    testResults,
    // Confirmed diagnosis state
    confirmDiagnosisHook.confirmedData,
    selectedConfirmedDiagnoses,
    // Treatment state
    treatmentPlanHook.planData,
    disabledTreatmentIds,
    selectedTreatments,
    // Discharge state
    dischargeHook.instructions,
    dischargeHook.includedInstructionIds,
    dischargeHook.patientName,
    dischargeHook.date,
    dischargeHook.hasBeenGenerated,
    // Chart state
    chartHook.noteSections,
    chartHook.feedback,
  ]);

  // Debounce the snapshot for 3s (returns [value, { cancel }]) — only delays Firestore writes, not the dirty flag
  const [debouncedSnapshot, debouncedSnapshotControl] = useDebounce(currentSessionSnapshot, 3000);

  /**
   * Dirty flag: immediate (no debounce). Compare current serialized state to last successful save.
   */
  useEffect(() => {
    if (isHydratingRef.current) return;
    if (!recordingHook.transcript || recordingHook.transcript.trim().length === 0) {
      setHasUnsavedChanges(false);
      return;
    }
    const last = lastSavedSnapshotRef.current;
    const lastJson = last ? JSON.stringify(last) : null;
    if (!lastJson) {
      const data = serializeSession();
      const hasData = data && Object.keys(data).length > 0;
      setHasUnsavedChanges(!!hasData);
      return;
    }
    setHasUnsavedChanges(currentSessionSnapshot !== lastJson);
  }, [currentSessionSnapshot, recordingHook.transcript, serializeSession]);

  /**
   * Trigger auto-save when debounced snapshot changes (user edit detection)
   */
  useEffect(() => {
    if (!debouncedSnapshot) return;
    if (isHydratingRef.current) return; // Skip during hydration
    
    const lastSavedJson = lastSavedSnapshotRef.current 
      ? JSON.stringify(lastSavedSnapshotRef.current) 
      : null;
    
    if (debouncedSnapshot !== lastSavedJson) {
      autoSaveSessionRef.current?.('debounced-edit');
    }
  }, [debouncedSnapshot]);

  /**
   * Hydrate session state from serialized data
   * Restores state into all hooks and local state
   * Navigation is restored to the saved step (if valid), otherwise starts from the last step with data
   */
  const hydrateSession = useCallback((data) => {
    if (!data) return;

    try {
      // Restore navigation state if available
      const savedStep = data.navigation?.currentStep;
      
      // Determine which steps should be marked as visited based on saved data
      const stepsToVisit = new Set([STEPS.RECORD]); // Always start with RECORD
      
      // Mark steps as visited based on what data exists
      if (data.diagnosis?.ddxData || data.diagnosis?.selectedDiagnosisNames) {
        stepsToVisit.add(STEPS.DIAGNOSIS);
      }
      if (data.diagnosticPlan?.planData) {
        stepsToVisit.add(STEPS.DIAGNOSTIC_PLAN);
      }
      if (data.confirmDiagnosis?.confirmedData || data.confirmDiagnosis?.selectedConfirmedDiagnosisNames) {
        stepsToVisit.add(STEPS.CONFIRM_DIAGNOSIS);
      }
      if (data.treatment?.planData) {
        stepsToVisit.add(STEPS.TREATMENT);
      }
      if (data.discharge?.instructions || data.discharge?.patientName) {
        stepsToVisit.add(STEPS.DISCHARGE);
      }
      if (data.chart?.noteSections) {
        stepsToVisit.add(STEPS.CHART);
      }
      
      // Determine which step to start on
      let startingStep;
      if (savedStep && stepsToVisit.has(savedStep)) {
        // If we have a saved step and it's valid (has data), use it
        startingStep = savedStep;
      } else {
        // Otherwise, determine the furthest step with data (last accessible step)
        const stepOrder = [STEPS.RECORD, STEPS.DIAGNOSIS, STEPS.DIAGNOSTIC_PLAN, STEPS.CONFIRM_DIAGNOSIS, STEPS.TREATMENT, STEPS.DISCHARGE, STEPS.CHART];
        startingStep = STEPS.RECORD;
        
        for (const step of stepOrder) {
          if (stepsToVisit.has(step)) {
            startingStep = step;
          }
        }
      }
      
      // Start from the determined step
      setCurrentStep(startingStep);
      setVisitedSteps(stepsToVisit);

      // Restore recording (transcript only - can't restore MediaRecorder state)
      if (data.recording?.transcript) {
        recordingHook.updateTranscript(data.recording.transcript);
      }

      // Restore diagnosis
      if (data.diagnosis) {
        // Restore ddxData into diagnosis hook
        if (data.diagnosis.ddxData) {
          diagnosisHook.setDdxData(data.diagnosis.ddxData);
        }

        const customDx = data.diagnosis.customDiagnoses || [];
        setCustomDiagnoses(customDx);
        
        // Reconstruct selectedDiagnoses from names (include user-added diagnoses in lookup)
        if (data.diagnosis.selectedDiagnosisNames) {
          const allDiagnoses = [
            ...(data.diagnosis.ddxData?.primary_diagnoses || []),
            ...(data.diagnosis.ddxData?.alternative_diagnoses || []),
            ...customDx,
          ];
          const reconstructed = data.diagnosis.selectedDiagnosisNames
            .map(name => allDiagnoses.find(d => (d.condition || d.name) === name))
            .filter(Boolean); // Remove any that weren't found
          setSelectedDiagnoses(reconstructed);
        }
        // Fallback for old format (full objects stored)
        else if (data.diagnosis.selectedDiagnoses) {
          setSelectedDiagnoses(data.diagnosis.selectedDiagnoses);
        }
        
        // Restore disabled diagnosis IDs
        if (data.diagnosis.disabledDiagnosisIds) {
          setDisabledDiagnosisIds(new Set(data.diagnosis.disabledDiagnosisIds));
        }
      }

      // Restore diagnostic plan
      if (data.diagnosticPlan) {
        // Restore plan data into hook
        if (data.diagnosticPlan.planData) {
          diagnosticPlanHook.setPlanData(data.diagnosticPlan.planData);
        }
        
        // Restore UI state
        if (data.diagnosticPlan.disabledTestIds) {
          setDisabledTestIds(new Set(data.diagnosticPlan.disabledTestIds));
        }
        if (data.diagnosticPlan.testResults) {
          // Handle both old format (array of entries) and new format (object)
          const testResultsData = Array.isArray(data.diagnosticPlan.testResults)
            ? data.diagnosticPlan.testResults // Old format: [[key, value], ...]
            : Object.entries(data.diagnosticPlan.testResults); // New format: {key: value, ...}
          setTestResults(new Map(testResultsData));
        }
      }

      // Restore confirmed diagnosis
      if (data.confirmDiagnosis) {
        // Restore confirmedData into confirm diagnosis hook
        if (data.confirmDiagnosis.confirmedData) {
          confirmDiagnosisHook.setConfirmedData(data.confirmDiagnosis.confirmedData);
        }
        
        // Reconstruct selectedConfirmedDiagnoses from names by looking up in confirmedData
        // Include `diagnoses` — new schema from useConfirmDiagnosis (not only legacy primary/alternative arrays)
        if (data.confirmDiagnosis.selectedConfirmedDiagnosisNames && data.confirmDiagnosis.confirmedData) {
          const cd = data.confirmDiagnosis.confirmedData;
          const allConfirmedDiagnoses = [
            ...(cd.confirmed_diagnoses || []),
            ...(cd.alternative_diagnoses || []),
            ...(cd.diagnoses || []),
          ];
          const names = data.confirmDiagnosis.selectedConfirmedDiagnosisNames;
          let reconstructed = names
            .map(name => allConfirmedDiagnoses.find(d => (d.condition || d.name) === name))
            .filter(Boolean);
          // If nothing matched (name drift / schema quirks) but names were saved, keep gating state consistent
          if (reconstructed.length === 0 && names.length > 0) {
            reconstructed = names.map((name) => ({
              condition: name,
              likelihood: 'Likely',
              rationale: '',
            }));
          }
          setSelectedConfirmedDiagnoses(reconstructed);
        }
        // Fallback for old format (full objects stored)
        else if (data.confirmDiagnosis.selectedConfirmedDiagnoses) {
          setSelectedConfirmedDiagnoses(data.confirmDiagnosis.selectedConfirmedDiagnoses);
        }
      }

      // Restore treatment
      if (data.treatment) {
        // Restore plan data into hook
        if (data.treatment.planData) {
          treatmentPlanHook.setPlanData(data.treatment.planData);
        }
        
        // Restore UI state
        if (data.treatment.disabledTreatmentIds) {
          setDisabledTreatmentIds(new Set(data.treatment.disabledTreatmentIds));
        }
        if (data.treatment.selectedTreatments) {
          setSelectedTreatments(new Set(data.treatment.selectedTreatments));
        }
      }

      // Restore discharge
      if (data.discharge) {
        dischargeHook.hydrateDischargeData(data.discharge);
      }

      // Restore chart
      chartHook.setNoteSections(data.chart?.noteSections || null);
      chartHook.setFeedback(data.chart?.feedback || null);
    } catch (err) {
      console.error('[useChartMindSession] Error hydrating session:', err);
      throw new Error('Failed to restore session data');
    }
  }, [
    recordingHook.updateTranscript,
    diagnosisHook.setDdxData,
    diagnosticPlanHook.setPlanData,
    confirmDiagnosisHook.setConfirmedData,
    treatmentPlanHook.setPlanData,
    dischargeHook.hydrateDischargeData,
    chartHook.setNoteSections,
    chartHook.setFeedback,
    setCurrentStep,
    setVisitedSteps,
    setSelectedDiagnoses,
    setDisabledTestIds,
    setTestResults,
    setSelectedConfirmedDiagnoses,
    setDisabledTreatmentIds,
    setSelectedTreatments,
  ]);

  // ============================================================================
  // SESSION PERSISTENCE (Phase 3+4)
  // ============================================================================

  /**
   * Save current session to Firestore
   */
  const saveSession = useCallback(async () => {
    if (!user?.uid) {
      setSessionError('Must be logged in to save session');
      throw new Error('User not authenticated');
    }

    setSaving(true);
    setSessionError(null);

    try {
      const data = serializeSession();
      const id =
        sessionId ||
        (await sessionService.createNewSession(user.uid, reportingMetadata));
      
      await sessionService.saveSession(id, data, user.uid, reportingMetadata);
      await sessionService.setActiveSessionId(user.uid, id);
      
      setSessionId(id);
      return id;
    } catch (error) {
      console.error('[useChartMindSession] Error saving session:', error);
      setSessionError(error.message);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [user?.uid, sessionId, serializeSession, reportingMetadata]);

  /**
   * Load session from Firestore
   */
  const loadSession = useCallback(async (id) => {
    if (!id) {
      throw new Error('Session ID is required');
    }

    setLoading(true);
    setSessionError(null);

    try {
      const session = await sessionService.loadSession(id);
      
      if (!session) {
        throw new Error('Session not found');
      }

      // Note: isHydratingRef and cancel() are already set in the auto-load effect
      // This is a backup for manual loadSession() calls
      if (!isHydratingRef.current) {
        isHydratingRef.current = true;
        debouncedSnapshotControl.cancel();
      }
      
      hydrateSession(session.data);
      setSessionId(id);
      
      // Wait one render cycle for React to flush all batched state updates from hydrateSession,
      // then capture the hydrated state as the baseline. Use serializeSessionRef (not the closure
      // value of serializeSession) so we get the post-hydration snapshot, not the pre-hydration one.
      setTimeout(() => {
        const currentState = serializeSessionRef.current?.() ?? serializeSession();
        lastSavedSnapshotRef.current = currentState;
        setHasUnsavedChanges(false);
        isHydratingRef.current = false;
        // Catch up on any edits the user made while hydration was blocking saves
        autoSaveSessionRef.current?.('post-hydration');
      }, 300);
      
      return session;
    } catch (error) {
      console.error('[useChartMindSession] Error loading session:', error);
      setSessionError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [hydrateSession, serializeSession, debouncedSnapshotControl]);

  /**
   * Clear current session state (for starting fresh)
   */
  const clearSession = useCallback(() => {
    
    // Reset session metadata
    setSessionId(null);
    setHasLoadedSession(false);
    setSessionError(null);
    setHasUnsavedChanges(false);
    
    // Reset navigation
    setCurrentStep(STEPS.RECORD);
    setVisitedSteps(new Set([STEPS.RECORD]));
    
    // Reset all hook state
    recordingHook.updateTranscript('');
    diagnosisHook.clearDDX();
    diagnosticPlanHook.clearPlan();
    confirmDiagnosisHook.clearConfirmedDiagnoses();
    treatmentPlanHook.clearPlan();
    dischargeHook.reset();
    chartHook.clearNote();
    
    // Reset local state
    setSelectedDiagnoses([]);
    setCustomDiagnoses([]);
    setDisabledDiagnosisIds(new Set());
    setDisabledTestIds(new Set());
    setTestResults(new Map());
    setSelectedConfirmedDiagnoses([]);
    setDisabledTreatmentIds(new Set());
    setSelectedTreatments(new Set());
    
    // Reset refs
    userNavigatedRef.current = false;
    analysisTriggeredRef.current = false;
    generatedForRef.current = null;
    lastSavedSnapshotRef.current = null;
  }, [
    recordingHook,
    diagnosisHook,
    diagnosticPlanHook,
    confirmDiagnosisHook,
    treatmentPlanHook,
    dischargeHook,
    chartHook,
  ]);

  /**
   * Create a new session (clears current state)
   */
  const createNewSessionHandler = useCallback(async () => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      clearSession(); // Clear all state first
      
      const id = await sessionService.createNewSession(
        user.uid,
        reportingMetadata,
      );
      await sessionService.setActiveSessionId(user.uid, id);
      setSessionId(id);
      
      return id;
    } catch (error) {
      console.error('[useChartMindSession] Error creating session:', error);
      setSessionError(error.message);
      throw error;
    }
  }, [user?.uid, clearSession, reportingMetadata]);

  // Auto-load session on mount if initialSessionId provided
  useEffect(() => {
    async function loadInitialSession() {
      if (!user?.uid) {
        return;
      }
      
      // If initialSessionId provided and we haven't loaded it yet, load that session
      if (initialSessionId && !hasLoadedSession) {
        // Note: isHydratingRef already starts as true (initialized in useState above)
        debouncedSnapshotControl.cancel();
        
        setHasLoadedSession(true); // Set flag immediately to prevent duplicate loads
        try {
          await loadSession(initialSessionId);
        } catch (error) {
          console.error('[useChartMindSession] Failed to auto-load session:', error);
          setHasLoadedSession(false); // Reset on error so they can retry
          isHydratingRef.current = false; // Re-enable saves on error
        }
      }
    }

    loadInitialSession();
  }, [initialSessionId, user?.uid, loadSession, hasLoadedSession, debouncedSnapshotControl]);

  // ============================================================================
  // RETURN GROUPED STATE
  // ============================================================================

  return {
    // Navigation
    navigation: {
      currentStep,
      visitedSteps,
      setCurrentStep: handleStepChange,
      handleContinueToDiagnosis,
      handleContinueToPlan,
      handleContinueToConfirm,
      handleContinueToTreatment,
      handleContinueToDischarge,
      handleContinueToChart,
      handleBack,
    },

    // Recording
    recording: {
      ...recordingHook,
      debouncedTranscript,
      onMicClick: handleMicClick,
      language: recordingLanguage,
      setLanguage: setRecordingLanguage,
    },

    // Diagnosis
    diagnosis: {
      ...diagnosisHook,
      selectedDiagnoses,
      customDiagnoses,
      onAddCustomDiagnosis: handleAddCustomDiagnosis,
      disabledDiagnosisIds,
      onSelectionChange: handleSelectionChange,
      onToggleDiagnosisDisabled: handleToggleDiagnosisDisabled,
      onPrefetch: handlePrefetch,
    },

    // Diagnostic Plan
    diagnosticPlan: {
      ...diagnosticPlanHook,
      disabledTestIds,
      testResults,
      onToggleTestDisabled: handleToggleTestDisabled,
      onUpdateTestResult: handleUpdateTestResult,
    },

    // Confirmed Diagnosis
    confirmDiagnosis: {
      ...confirmDiagnosisHook,
      selectedConfirmedDiagnoses,
      onSelectionChange: handleConfirmedSelectionChange,
      originalDdxData: diagnosisHook.ddxData, // Pass original DDX as seed
      retry: (transcript, testResults, originalDdxData) => {
        confirmDiagnosisHook.retry(transcript, testResults, originalDdxData, disabledDiagnosisIds);
      },
    },

    // Treatment Plan
    treatment: {
      ...treatmentPlanHook,
      disabledTreatmentIds,
      selectedTreatments,
      onToggleTreatmentDisabled: handleToggleTreatmentDisabled,
      onToggleTreatmentSelected: handleToggleTreatmentSelected,
    },

    // Discharge
    discharge: {
      ...dischargeHook,
    },

    // Chart
    chart: {
      ...chartHook,
      onCopyToClipboard: handleCopyToClipboard,
      onRegenerate: handleRegenerate,
    },

    // Session management
    session: {
      sessionId,
      saving,
      loading,
      error: sessionError,
      hasUnsavedChanges,
      lastSavedAt,
      saveSession,
      loadSession,
      createNewSession: createNewSessionHandler,
      clearSession,
      serializeSession,
      hydrateSession,
      autoSaveSession,
    },
  };
}

export default useChartMindSession;
