/**
 * useConfirmDiagnosis - Hook for confirming final diagnoses after diagnostic testing
 *
 * Calls the AI service workflow endpoint (chartmind-final) to generate confirmed
 * diagnoses based on test results and preliminary differential diagnoses.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { invokeLLMPrompt } from "services/llmService";
import { useAuth } from "hooks/useAuth";

// Workflow name for confirmed diagnosis generation
const CONFIRM_DIAGNOSIS_WORKFLOW_NAME = "chartmind-final";

/**
 * Parse LLM response to extract JSON
 * NEW SCHEMA: Single "diagnoses" array with reasoning, supporting_factors
 */
function parseResponse(content) {
  if (!content) return null;

  const trimmed = content.trim();

  // Check for non-JSON responses
  if (
    trimmed.startsWith("I'm sorry") ||
    trimmed.startsWith("I cannot") ||
    !trimmed.includes("{")
  ) {
    console.log("[useConfirmDiagnosis] LLM returned non-JSON response");
    return {
      diagnoses: [],
      red_flags: [],
      clarifications: [],
      next_steps: [],
    };
  }

  // Extract JSON from markdown code blocks if present
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  try {
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error("[useConfirmDiagnosis] Failed to parse JSON:", error);
    return null;
  }
}

/**
 * Process diagnoses to ensure consistent structure with new schema
 * New fields: reasoning, supporting_factors
 */
function processDiagnoses(diagnoses) {
  if (!Array.isArray(diagnoses)) return [];

  return diagnoses.map((dx) => ({
    condition: dx.condition || dx.name || "Unknown",
    likelihood: dx.likelihood || "Likely",
    rationale: dx.rationale || "",
    reasoning: dx.reasoning || dx.rationale || "",
    supporting_factors: Array.isArray(dx.supporting_factors) 
      ? dx.supporting_factors 
      : [],
    urgent: typeof dx.urgent === 'boolean' ? dx.urgent : false,
  }));
}

/**
 * Format test results for the prompt
 */
function formatTestResults(testResults) {
  if (!testResults || testResults.size === 0) {
    return "No test results available.";
  }

  const results = [];
  testResults.forEach((result, testId) => {
    if (typeof result === 'string') {
      results.push(`- ${testId}: ${result}`);
    } else if (result.prose) {
      results.push(`- ${testId}: ${result.prose}`);
    } else if (result.status) {
      results.push(`- ${testId}: ${result.status}${result.description ? ` - ${result.description}` : ''}`);
    } else {
      results.push(`- ${testId}: Result entered`);
    }
  });

  return results.join("\n");
}

/**
 * Format existing DDX for the prompt
 * Handles both old schema (primary_diagnoses/alternative_diagnoses) and new schema (diagnoses array)
 * NOTE: This includes ALL diagnoses, even disabled ones (per requirements)
 */
function formatExistingDDX(ddxData) {
  if (!ddxData) return "";

  // New schema: single diagnoses array
  let diagnoses = ddxData.diagnoses || [];
  
  // Old schema fallback: primary_diagnoses + alternative_diagnoses
  if (diagnoses.length === 0) {
    diagnoses = [
      ...(ddxData.primary_diagnoses || []),
      ...(ddxData.alternative_diagnoses || []),
    ];
  }

  if (diagnoses.length === 0) return "";

  return diagnoses
    .map((dx) => `- ${dx.condition} (${dx.likelihood || "Unknown"})${dx.rationale ? `: ${dx.rationale}` : ""}`)
    .join("\n");
}

/**
 * Format disabled diagnoses for the prompt
 * Creates a special section to tell LLM which diagnoses were disabled by the clinician
 */
function formatDisabledDiagnoses(ddxData, disabledDiagnosisIds) {
  if (!disabledDiagnosisIds || disabledDiagnosisIds.size === 0) {
    return "";
  }

  // Get all diagnoses
  let diagnoses = ddxData.diagnoses || [];
  if (diagnoses.length === 0) {
    diagnoses = [
      ...(ddxData.primary_diagnoses || []),
      ...(ddxData.alternative_diagnoses || []),
    ];
  }

  // Filter to only disabled ones
  const disabledDx = diagnoses.filter(dx => disabledDiagnosisIds.has(dx.condition));
  
  if (disabledDx.length === 0) return "";

  const formatted = disabledDx
    .map(dx => `- ${dx.condition}`)
    .join("\n");

  return `\n\nPREVIOUSLY REMOVED DIAGNOSES:\nThe clinician has removed the following from their active differential. Keep them excluded unless test results strongly support re-adding:\n${formatted}`;
}

/**
 * Merge LLM response with original DDX to prevent diagnosis loss
 * CRITICAL: The LLM may omit diagnoses despite instructions not to.
 * We MUST ensure all original diagnoses are preserved.
 * 
 * NEW SCHEMA: Works with single "diagnoses" array, handles both old and new schemas
 * 
 * @param {Object} llmResult - The LLM's response
 * @param {Object} originalDdxData - Original DDX data
 * @param {Set} disabledDiagnosisIds - Set of disabled diagnosis IDs (will be filtered out from fallback)
 */
function mergeWithOriginalDDX(llmResult, originalDdxData, disabledDiagnosisIds = new Set()) {
  if (!originalDdxData) {
    return llmResult;
  }

  // Get all diagnoses from LLM result (new schema: single diagnoses array)
  const llmDiagnoses = llmResult.diagnoses || [];

  // Get all original diagnoses (handle both schemas)
  let originalDiagnoses = originalDdxData.diagnoses || [];
  
  // Old schema fallback
  if (originalDiagnoses.length === 0) {
    originalDiagnoses = [
      ...(originalDdxData.primary_diagnoses || []),
      ...(originalDdxData.alternative_diagnoses || []),
    ];
  }

  console.log("[mergeWithOriginalDDX] 🔄 Starting merge:");
  console.log("  LLM Diagnoses:", llmDiagnoses);
  console.log("  Original Diagnoses:", originalDiagnoses);
  console.log("  Disabled Diagnosis IDs:", Array.from(disabledDiagnosisIds));
  console.log("  Counts:", {
    llmDiagnosesCount: llmDiagnoses.length,
    originalDiagnosesCount: originalDiagnoses.length,
    disabledCount: disabledDiagnosisIds.size,
  });

  // Create a Set of condition names that the LLM returned
  const llmConditionNames = new Set(
    llmDiagnoses.map((d) => d.condition.toLowerCase())
  );

  // Find original diagnoses that the LLM didn't include
  // IMPORTANT: Filter out disabled diagnoses from the fallback (per requirements)
  const preservedDiagnoses = originalDiagnoses
    .filter((d) => !llmConditionNames.has(d.condition.toLowerCase()))
    .filter((d) => !disabledDiagnosisIds.has(d.condition)) // Exclude disabled diagnoses
    .map((d) => ({
      condition: d.condition,
      likelihood: d.likelihood || "Likely",
      rationale: d.rationale || "",
      reasoning: d.reasoning || d.rationale || "Preserved from original differential diagnosis",
      supporting_factors: d.supporting_factors || [],
      urgent: typeof d.urgent === 'boolean' ? d.urgent : false,
      _preservedFromOriginal: true,
      test_impact: "unchanged",
    }));

  console.log(
    `[mergeWithOriginalDDX] ✅ Merge complete: LLM returned ${llmDiagnoses.length} diagnoses, preserved ${preservedDiagnoses.length} from original DDX`
  );
  console.log("[mergeWithOriginalDDX] 📋 Preserved diagnoses:", preservedDiagnoses);

  // Merge: LLM diagnoses + preserved original diagnoses
  const merged = {
    diagnoses: [
      ...llmDiagnoses,
      ...preservedDiagnoses,
    ],
    red_flags: llmResult.red_flags || [],
    clarifications: llmResult.clarifications || [],
    next_steps: llmResult.next_steps || [],
  };
  
  console.log("[mergeWithOriginalDDX] 🎯 FINAL MERGED RESULT:");
  console.log(merged);
  
  return merged;
}

/**
 * useConfirmDiagnosis Hook
 * 
 * @param {Object} options - Hook options
 * @param {Function} options.onDataChanged - Callback fired after successful AI response (for auto-save)
 */
function useConfirmDiagnosis({ onDataChanged } = {}) {
  const { organizationId } = useAuth();
  const [confirmedData, setConfirmedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);

  // Debug: Log confirmedData changes
  useEffect(() => {
    console.log("[useConfirmDiagnosis] 🔄 State changed:", {
      hasConfirmedData: !!confirmedData,
      diagnosesCount: confirmedData?.diagnoses?.length || 0,
      loading,
      error,
    });
  }, [confirmedData, loading, error]);

  // Track to prevent duplicate calls
  const lastRequestRef = useRef("");
  const isGeneratingRef = useRef(false);

  /**
   * Generate confirmed diagnoses based on test results and original DDX data
   * 
   * @param {string} transcript - Patient encounter transcript
   * @param {Map} testResults - Test results from diagnostic plan
   * @param {Object} originalDdxData - Original DDX data from DiagnosisStep (the seed)
   * @param {Set} disabledDiagnosisIds - Set of diagnosis IDs (condition names) that were disabled by clinician
   */
  const generateConfirmedDiagnoses = useCallback(
    async (transcript, testResults, originalDdxData, disabledDiagnosisIds = new Set()) => {
      // Validate inputs
      if (!transcript || transcript.trim().length < 50) {
        console.log("[useConfirmDiagnosis] Transcript too short");
        return;
      }

      if (!originalDdxData) {
        console.log("[useConfirmDiagnosis] No original DDX data provided");
        return;
      }

      // Create request key to detect duplicates
      const existingDdxText = formatExistingDDX(originalDdxData);
      const testResultsStr = formatTestResults(testResults);
      const disabledStr = Array.from(disabledDiagnosisIds).join(',');
      const requestKey = `${transcript.slice(0, 100)}|${existingDdxText.slice(0, 200)}|${testResultsStr.slice(0, 200)}|${disabledStr}`;

      // Prevent duplicate calls
      if (isGeneratingRef.current) {
        console.log("[useConfirmDiagnosis] Already generating, skipping");
        return;
      }

      if (requestKey === lastRequestRef.current && confirmedData) {
        console.log("[useConfirmDiagnosis] Same request, using cached result");
        return;
      }

      isGeneratingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        // Format existing DDX for the prompt (this is the seed - includes ALL diagnoses)
        const existingDdxFormatted = formatExistingDDX(originalDdxData);

        // Format test results
        const testResultsText = formatTestResults(testResults);

        // Format disabled diagnoses section
        const disabledDiagnosesText = formatDisabledDiagnoses(originalDdxData, disabledDiagnosisIds);

        const allDiagnoses = [
          ...(originalDdxData.primary_diagnoses || []),
          ...(originalDdxData.alternative_diagnoses || []),
        ];

        console.log("[useConfirmDiagnosis] Calling workflow...", {
          workflowName: CONFIRM_DIAGNOSIS_WORKFLOW_NAME,
          originalDiagnosesCount: allDiagnoses.length,
          testResultsCount: testResults?.size || 0,
          disabledDiagnosesCount: disabledDiagnosisIds.size,
        });

        const result = await invokeLLMPrompt({
          promptId: CONFIRM_DIAGNOSIS_WORKFLOW_NAME,
          userMessage: `PATIENT ENCOUNTER TRANSCRIPT:\n\n${transcript}\n\nEXISTING DIFFERENTIAL DIAGNOSIS:\n${existingDdxFormatted}\n\nTEST RESULTS:\n${testResultsText}${disabledDiagnosesText}\n\nPlease UPDATE the existing differential diagnosis based on the test results. You may:\n- Change likelihood ratings based on test results\n- Add new diagnoses suggested by test results\n- Mark diagnoses as more or less likely\n- DO NOT REMOVE any diagnoses from the existing differential - preserve all of them`,
          organizationId,
        });

        console.log("[useConfirmDiagnosis] Workflow response received");

        const responseText = result.output;
        setRawResponse(responseText);

        console.log("[useConfirmDiagnosis] 🔥 RAW LLM RESPONSE (first 2000 chars):");
        console.log(responseText?.substring(0, 2000));
        console.log("[useConfirmDiagnosis] 🔥 RAW LLM RESPONSE (full):");
        console.log(responseText);

        const parsed = parseResponse(responseText);

        console.log("[useConfirmDiagnosis] 🔍 Parsed response:", {
          hasParsed: !!parsed,
          diagnosesCount: parsed?.diagnoses?.length || 0,
          fullParsed: parsed,
        });

        if (parsed) {
          // Handle both schemas: new (diagnoses array) and old (primary/alternative)
          let allDiagnoses = parsed.diagnoses || [];
          
          // Old schema fallback: combine primary + alternative
          if (allDiagnoses.length === 0) {
            allDiagnoses = [
              ...(parsed.primary_diagnoses || []),
              ...(parsed.alternative_diagnoses || []),
            ];
          }

          const processedData = {
            diagnoses: processDiagnoses(allDiagnoses),
            red_flags: parsed.red_flags || [],
            clarifications: parsed.clarifications || [],
            next_steps: parsed.next_steps || [],
          };

          console.log("[useConfirmDiagnosis] 📊 Processed data:", {
            diagnosesCount: processedData.diagnoses.length,
            diagnoses: processedData.diagnoses.map(d => d.condition),
          });

          console.log("[useConfirmDiagnosis] 📋 Original DDX data:", {
            hasDiagnoses: !!(originalDdxData?.diagnoses),
            diagnosesCount: originalDdxData?.diagnoses?.length || 0,
            hasPrimary: !!(originalDdxData?.primary_diagnoses),
            primaryCount: originalDdxData?.primary_diagnoses?.length || 0,
            hasAlternative: !!(originalDdxData?.alternative_diagnoses),
            alternativeCount: originalDdxData?.alternative_diagnoses?.length || 0,
          });

          // CRITICAL: Merge with original DDX to prevent diagnosis loss
          // Filter out disabled diagnoses from the fallback (per requirements)
          const mergedData = mergeWithOriginalDDX(processedData, originalDdxData, disabledDiagnosisIds);

          console.log("[useConfirmDiagnosis] ✅ Merged data:", {
            diagnosesCount: mergedData.diagnoses.length,
            diagnoses: mergedData.diagnoses.map(d => ({
              condition: d.condition,
              preserved: d._preservedFromOriginal,
            })),
          });

          console.log("[useConfirmDiagnosis] 🚀 About to call setConfirmedData with:", {
            diagnosesCount: mergedData.diagnoses.length,
            diagnoses: mergedData.diagnoses.map(d => d.condition),
          });
          
          setConfirmedData(mergedData);
          lastRequestRef.current = requestKey;

          console.log("[useConfirmDiagnosis] ✅ setConfirmedData called - Confirmed diagnoses generated:", {
            llmDiagnosesCount: processedData.diagnoses.length,
            mergedDiagnosesCount: mergedData.diagnoses.length,
            preservedCount: mergedData.diagnoses.filter(d => d._preservedFromOriginal).length,
          });

          // Trigger auto-save after successful AI response
          if (onDataChanged) {
            console.log("[useConfirmDiagnosis] Triggering auto-save callback");
            onDataChanged();
          }
        } else {
          setError("Failed to parse confirmed diagnosis response");
        }
      } catch (err) {
        console.error("[useConfirmDiagnosis] Error:", err);
        setError(err.message || "Failed to generate confirmed diagnoses");
      } finally {
        isGeneratingRef.current = false;
        setLoading(false);
      }
    },
    [confirmedData, onDataChanged, organizationId]
  );

  /**
   * Clear all confirmed diagnosis data
   */
  const clearConfirmedDiagnoses = useCallback(() => {
    setConfirmedData(null);
    setError(null);
    lastRequestRef.current = "";
  }, []);

  /**
   * Retry generation
   */
  const retry = useCallback(
    (transcript, testResults, originalDdxData, disabledDiagnosisIds) => {
      lastRequestRef.current = "";
      setError(null);
      if (transcript && originalDdxData) {
        generateConfirmedDiagnoses(transcript, testResults, originalDdxData, disabledDiagnosisIds);
      }
    },
    [generateConfirmedDiagnoses]
  );

  /**
   * Directly set confirmedData (for hydrating from saved session)
   */
  const setConfirmedDataDirectly = useCallback((data) => {
    console.log('[useConfirmDiagnosis] setConfirmedDataDirectly called with:', data);
    setConfirmedData(data);
  }, []);

  return {
    // State
    confirmedData,
    loading,
    error,
    rawResponse,

    // Computed - FIXED: Use new schema (diagnoses array)
    hasConfirmedDiagnoses: (confirmedData?.diagnoses?.length || 0) > 0,

    // Actions
    generateConfirmedDiagnoses,
    clearConfirmedDiagnoses,
    retry,
    setConfirmedData: setConfirmedDataDirectly, // For session hydration
  };
}

export default useConfirmDiagnosis;
