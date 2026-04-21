/**
 * useTreatmentPlan - Hook for generating treatment recommendations
 *
 * Calls the AI service workflow endpoint to generate recommended treatments
 * based on selected diagnoses, diagnostic plan, and patient encounter transcript.
 */

import { useState, useCallback, useRef } from "react";
import { invokeLLMPrompt } from "services/llmService";
import { useAuth } from "hooks/useAuth";

// Workflow name for treatment plan generation
const TREATMENT_PLAN_WORKFLOW_NAME = "chartmind-treatment";

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
    console.log("[useTreatmentPlan] LLM returned non-JSON response");
    return {
      treatments: [],
      treatmentStrategy: "",
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
    console.error("[useTreatmentPlan] Failed to parse JSON:", error);
    return null;
  }
}

/**
 * Normalize treatment category
 */
function normalizeCategory(category) {
  if (!category) return "other";
  const lower = category.toLowerCase();
  if (lower.includes("medic")) return "medication";
  if (lower.includes("proc")) return "procedure";
  if (lower.includes("therap")) return "therapy";
  if (lower.includes("life")) return "lifestyle";
  if (lower.includes("refer")) return "referral";
  return "other";
}

/**
 * Process treatments to ensure consistent structure
 */
function processTreatments(treatments) {
  if (!Array.isArray(treatments)) return [];

  return treatments.map((treatment, index) => ({
    id: treatment.id || `treatment-${index}-${Date.now()}`,
    name: treatment.name || "Unknown Treatment",
    category: normalizeCategory(treatment.category),
    priority: treatment.priority || "first-line",
    urgency: treatment.urgency || null,
    rationale: treatment.rationale || "",
    linkedDiagnoses: treatment.linkedDiagnoses || treatment.linked_diagnoses || [],
    route: treatment.route || null,
    contraindications: treatment.contraindications || [],
    mutuallyRedundantGroup: treatment.mutuallyRedundantGroup || treatment.mutually_redundant_group || null,
    pickCount: treatment.pickCount || treatment.pick_count || null,
  }));
}

/**
 * useTreatmentPlan Hook
 * 
 * @param {Object} options - Hook options
 * @param {Function} options.onDataChanged - Callback fired after successful AI response (for auto-save)
 */
function useTreatmentPlan({ onDataChanged } = {}) {
  const { organizationId } = useAuth();
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);

  // Track to prevent duplicate calls
  const lastRequestRef = useRef("");
  const isGeneratingRef = useRef(false);

  /**
   * Generate treatment plan based on diagnoses, diagnostic plan, and transcript
   */
  const generatePlan = useCallback(async (transcript, selectedDiagnoses, diagnosticPlanData = null) => {
    // Validate inputs
    if (!transcript || transcript.trim().length < 50) {
      console.log("[useTreatmentPlan] Transcript too short");
      return;
    }

    if (!selectedDiagnoses || selectedDiagnoses.length === 0) {
      console.log("[useTreatmentPlan] No diagnoses selected");
      return;
    }

    // Create request key to detect duplicates
    const diagnosisNames = selectedDiagnoses
      .map((d) => d.condition || d.name)
      .join(",");
    const requestKey = `${transcript.slice(0, 100)}|${diagnosisNames}`;

    // Prevent duplicate calls
    if (isGeneratingRef.current) {
      console.log("[useTreatmentPlan] Already generating, skipping");
      return;
    }

    if (requestKey === lastRequestRef.current && planData) {
      console.log("[useTreatmentPlan] Same request, using cached result");
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

      // Format diagnostic plan tests if available
      let testsText = "";
      if (diagnosticPlanData?.tests && diagnosticPlanData.tests.length > 0) {
        testsText = diagnosticPlanData.tests
          .map((t) => `- ${t.name} (${t.category})`)
          .join("\n");
      }

      const queryParts = [
        "PATIENT ENCOUNTER TRANSCRIPT:",
        transcript,
        "\nCONFIRMED DIAGNOSES:",
        diagnosisText,
      ];

      if (testsText) {
        queryParts.push("\nDIAGNOSTIC PLAN:", testsText);
      }

      console.log("[useTreatmentPlan] Calling workflow...", {
        workflowName: TREATMENT_PLAN_WORKFLOW_NAME,
        diagnosesCount: selectedDiagnoses.length,
        hasTests: !!testsText,
      });

      const result = await invokeLLMPrompt({
        promptId: TREATMENT_PLAN_WORKFLOW_NAME,
        userMessage: queryParts.join("\n\n"),
        organizationId,
      });

      console.log("[useTreatmentPlan] Workflow response received");

      const responseText = result.output;
      setRawResponse(responseText);

      const parsed = parseResponse(responseText);

      if (parsed) {
        const processedData = {
          treatments: processTreatments(parsed.treatments),
          treatmentStrategy: parsed.treatmentStrategy || parsed.treatment_strategy || "",
          considerations: parsed.considerations || [],
        };

        setPlanData(processedData);
        lastRequestRef.current = requestKey;

        console.log("[useTreatmentPlan] Plan generated:", {
          treatmentCount: processedData.treatments.length,
        });
        
        // Trigger auto-save after successful AI response
        if (onDataChanged) {
          console.log("[useTreatmentPlan] Triggering auto-save callback");
          onDataChanged();
        }
      } else {
        setError("Failed to parse treatment plan response");
      }
    } catch (err) {
      console.error("[useTreatmentPlan] Error:", err);
      setError(err.message || "Failed to generate treatment plan");
    } finally {
      isGeneratingRef.current = false;
      setLoading(false);
    }
  }, [planData, onDataChanged, organizationId]);

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
    (transcript, selectedDiagnoses, diagnosticPlanData) => {
      lastRequestRef.current = "";
      setError(null);
      if (transcript && selectedDiagnoses) {
        generatePlan(transcript, selectedDiagnoses, diagnosticPlanData);
      }
    },
    [generatePlan]
  );

  /**
   * Directly set planData (for hydrating from saved session)
   */
  const setPlanDataDirectly = useCallback((data) => {
    console.log('[useTreatmentPlan] setPlanDataDirectly called with:', data);
    setPlanData(data);
  }, []);

  return {
    // State
    planData,
    loading,
    error,
    rawResponse,

    // Computed
    hasTreatments: (planData?.treatments?.length || 0) > 0,

    // Actions
    generatePlan,
    clearPlan,
    retry,
    setPlanData: setPlanDataDirectly, // For session hydration
  };
}

export default useTreatmentPlan;
