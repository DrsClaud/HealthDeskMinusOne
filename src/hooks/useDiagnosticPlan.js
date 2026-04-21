/**
 * useDiagnosticPlan - Hook for generating diagnostic test recommendations
 *
 * Calls the AI service workflow endpoint to generate recommended diagnostic tests
 * based on selected diagnoses and patient encounter transcript.
 */

import { useState, useCallback, useRef } from "react";
import { invokeLLMPrompt } from "services/llmService";
import { useAuth } from "hooks/useAuth";

// Workflow name for diagnostic plan generation
const DIAGNOSTIC_PLAN_WORKFLOW_NAME = "chartmind-plan";

/**
 * Parse LLM response to extract JSON
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
    console.log("[useDiagnosticPlan] LLM returned non-JSON response");
    return {
      tests: [],
      testingStrategy: "",
      considerations: [],
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
    console.error("[useDiagnosticPlan] Failed to parse JSON:", error);
    return null;
  }
}

/**
 * Normalize test category
 */
function normalizeCategory(category) {
  if (!category) return "other";
  const lower = category.toLowerCase();
  if (lower.includes("lab")) return "lab";
  if (lower.includes("imag")) return "imaging";
  if (lower.includes("proc")) return "procedure";
  return "other";
}

/**
 * Process tests to ensure consistent structure
 */
function processTests(tests) {
  if (!Array.isArray(tests)) return [];

  return tests.map((test, index) => ({
    id: test.id || `test-${index}-${Date.now()}`,
    name: test.name || "Unknown Test",
    category: normalizeCategory(test.category),
    rationale: test.rationale || "",
    linkedDiagnoses: test.linkedDiagnoses || test.linked_diagnoses || [],
    priority: test.priority || test.urgency || "routine",
    turnaroundTime: test.turnaroundTime || test.turnaround_time || null,
    estimatedCost: test.estimatedCost || test.estimated_cost || null,
  }));
}

/**
 * useDiagnosticPlan Hook
 * 
 * @param {Object} options - Hook options
 * @param {Function} options.onDataChanged - Callback fired after successful AI response (for auto-save)
 */
function useDiagnosticPlan({ onDataChanged } = {}) {
  const { organizationId } = useAuth();
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);

  // Track to prevent duplicate calls
  const lastRequestRef = useRef("");
  const isGeneratingRef = useRef(false);

  /**
   * Generate diagnostic plan based on diagnoses and transcript
   */
  const generatePlan = useCallback(async (transcript, selectedDiagnoses) => {
    // Validate inputs
    if (!transcript || transcript.trim().length < 50) {
      console.log("[useDiagnosticPlan] Transcript too short");
      return;
    }

    if (!selectedDiagnoses || selectedDiagnoses.length === 0) {
      console.log("[useDiagnosticPlan] No diagnoses selected");
      return;
    }

    // Create request key to detect duplicates
    const diagnosisNames = selectedDiagnoses
      .map((d) => d.condition || d.name)
      .join(",");
    const requestKey = `${transcript.slice(0, 100)}|${diagnosisNames}`;

    // Prevent duplicate calls
    if (isGeneratingRef.current) {
      console.log("[useDiagnosticPlan] Already generating, skipping");
      return;
    }

    if (requestKey === lastRequestRef.current && planData) {
      console.log("[useDiagnosticPlan] Same request, using cached result");
      return;
    }

    isGeneratingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Format diagnoses for the prompt
      const diagnosisText = selectedDiagnoses
        .map((d) => `- ${d.condition || d.name} (${d.likelihood || "Likely"})`)
        .join("\n");

      console.log("[useDiagnosticPlan] Calling workflow...", {
        workflowName: DIAGNOSTIC_PLAN_WORKFLOW_NAME,
        diagnosesCount: selectedDiagnoses.length,
      });

      const result = await invokeLLMPrompt({
        promptId: DIAGNOSTIC_PLAN_WORKFLOW_NAME,
        userMessage: `PATIENT ENCOUNTER TRANSCRIPT:\n\n${transcript}\n\nSELECTED DIAGNOSES:\n${diagnosisText}`,
        organizationId,
      });

      console.log("[useDiagnosticPlan] Workflow response received");

      const responseText = result.output;
      setRawResponse(responseText);

      const parsed = parseResponse(responseText);

      if (parsed) {
        const processedData = {
          tests: processTests(parsed.tests),
          testingStrategy: parsed.testingStrategy || parsed.testing_strategy || "",
          considerations: parsed.considerations || [],
        };

        setPlanData(processedData);
        lastRequestRef.current = requestKey;

        console.log("[useDiagnosticPlan] Plan generated:", {
          testCount: processedData.tests.length,
        });
        
        // Trigger auto-save after successful AI response
        if (onDataChanged) {
          console.log("[useDiagnosticPlan] Triggering auto-save callback");
          onDataChanged();
        }
      } else {
        setError("Failed to parse diagnostic plan response");
      }
    } catch (err) {
      console.error("[useDiagnosticPlan] Error:", err);
      setError(err.message || "Failed to generate diagnostic plan");
    } finally {
      isGeneratingRef.current = false;
      setLoading(false);
    }
  }, [planData, onDataChanged, organizationId]);

  /**
   * Add a custom test to the plan
   */
  const addTest = useCallback((test) => {
    setPlanData((prev) => {
      const newTest = {
        id: `custom-${Date.now()}`,
        name: test.name,
        category: normalizeCategory(test.category),
        rationale: test.rationale || "Added manually",
        linkedDiagnoses: [],
        priority: test.priority || "routine",
        isCustom: true,
      };

      if (!prev) {
        return {
          tests: [newTest],
          testingStrategy: "",
          considerations: [],
        };
      }

      return {
        ...prev,
        tests: [...prev.tests, newTest],
      };
    });
  }, []);

  /**
   * Clear all plan data
   */
  const clearPlan = useCallback(() => {
    setPlanData(null);
    setError(null);
    lastRequestRef.current = "";
  }, []);

  /**
   * Retry generation
   */
  const retry = useCallback(
    (transcript, selectedDiagnoses) => {
      lastRequestRef.current = "";
      setError(null);
      if (transcript && selectedDiagnoses) {
        generatePlan(transcript, selectedDiagnoses);
      }
    },
    [generatePlan]
  );

  /**
   * Directly set planData (for hydrating from saved session)
   */
  const setPlanDataDirectly = useCallback((data) => {
    console.log('[useDiagnosticPlan] setPlanDataDirectly called with:', data);
    setPlanData(data);
  }, []);

  return {
    // State
    planData,
    loading,
    error,
    rawResponse,

    // Computed
    hasTests: (planData?.tests?.length || 0) > 0,

    // Actions
    generatePlan,
    addTest,
    clearPlan,
    retry,
    setPlanData: setPlanDataDirectly, // For session hydration
  };
}

export default useDiagnosticPlan;
