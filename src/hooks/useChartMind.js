/**
 * useChartMind - Hook for ChartMind differential diagnosis generation
 *
 * Calls the AI service workflow endpoint to generate differential diagnoses
 * from a patient encounter transcript. Prompt is managed on the backend.
 */

import { useState, useCallback, useRef } from "react";
import { invokeLLMPrompt } from "services/llmService";
import { retrieveClinicalReferences } from "services/clinicalReferencesService";
import { useAuth } from "hooks/useAuth";

// Workflow name for DDX generation (matches Firestore doc ID)
const DDX_WORKFLOW_NAME = "chartmind-diagnosis";

/**
 * Parse LLM response to extract JSON
 */
function parseResponse(content) {
  if (!content) {
    return null;
  }

  const trimmed = content.trim();

  // Check for non-JSON responses
  if (
    trimmed.startsWith("I'm sorry") ||
    trimmed.startsWith("I cannot") ||
    trimmed.startsWith("I don't") ||
    !trimmed.includes("{")
  ) {
    console.log("[useChartMind] LLM returned non-JSON response");
    return {
      primary_diagnoses: [],
      alternative_diagnoses: [],
      clarifications: ["Please provide more information about the symptoms"],
      red_flags: [],
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
    console.error("[useChartMind] Failed to parse JSON:", error);
    console.error("[useChartMind] Content:", jsonStr.substring(0, 500));
    return null;
  }
}

/**
 * useChartMindDDX Hook
 *
 * @param {Object} options - Hook options
 * @param {Function} options.onDataChanged - Callback fired after successful AI response (for auto-save)
 * @returns {Object} DDX state and actions
 */
function useChartMind({ onDataChanged } = {}) {
  const { organizationId } = useAuth();
  const [ddxData, setDdxData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawResponse, setRawResponse] = useState(null); // Debug: store raw response
  const [clinicalReferences, setClinicalReferences] = useState([]);

  // Track last analyzed transcript to prevent duplicate calls
  const lastTranscriptRef = useRef("");
  const isAnalyzingRef = useRef(false);

  /**
   * Analyze transcript and generate differential diagnosis
   */
  const analyzeDDX = useCallback(
    async (transcript) => {
      // Require minimum transcript length
      if (!transcript || transcript.trim().length < 50) {
        console.log(
          "[useChartMind] Transcript too short:",
          transcript?.length || 0
        );
        return;
      }

      // Prevent duplicate/concurrent calls
      if (isAnalyzingRef.current) {
        console.log("[useChartMind] Already analyzing, skipping");
        return;
      }

      // Skip if transcript unchanged
      if (transcript.trim() === lastTranscriptRef.current) {
        console.log("[useChartMind] Transcript unchanged, skipping");
        return;
      }

      isAnalyzingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        console.log("[useChartMind] Calling workflow...", {
          workflowName: DDX_WORKFLOW_NAME,
          organizationId: organizationId || null,
          transcriptLength: transcript.length,
        });

        const [result, refs] = await Promise.all([
          invokeLLMPrompt({
            promptId: DDX_WORKFLOW_NAME,
            userMessage: `PATIENT ENCOUNTER TRANSCRIPT:\n\n${transcript}`,
            organizationId,
          }),
          retrieveClinicalReferences(transcript, {
            promptId: DDX_WORKFLOW_NAME,
          }).catch((err) => {
            console.warn("[useChartMind] Clinical references retrieval failed:", err);
            return [];
          }),
        ]);

        setClinicalReferences(refs);

        console.log("[useChartMind] Workflow response received!", {
          hasResult: !!result,
          hasData: !!result?.data,
          success: result?.data?.success,
          responseLength: result?.output?.length || 0,
          hasMetadata: !!result?.meta,
        });

        // Store raw response for debugging
        const responseText = result.output;
        console.log(
          "[useChartMind] Response text:",
          responseText?.substring(0, 200)
        );
        setRawResponse(responseText);

        // Parse response
        const parsed = parseResponse(responseText);
        console.log("[useChartMind] Parsed result:", !!parsed);

        if (parsed) {
          setDdxData(parsed);
          lastTranscriptRef.current = transcript.trim();
          console.log("[useChartMind] DDX generated:", {
            primaryCount: parsed.primary_diagnoses?.length || 0,
            alternativeCount: parsed.alternative_diagnoses?.length || 0,
            clarificationsCount: parsed.clarifications?.length || 0,
          });
          
          // Trigger auto-save after successful AI response
          if (onDataChanged) {
            console.log("[useChartMind] Triggering auto-save callback");
            onDataChanged();
          }
        } else {
          setError("Failed to parse diagnosis response. Raw response saved.");
        }
      } catch (err) {
        console.error("[useChartMind] Error:", err);
        setError(err.message || "Failed to generate diagnosis");
      } finally {
        isAnalyzingRef.current = false;
        setLoading(false);
      }
    },
    [onDataChanged, organizationId]
  );

  /**
   * Clear all DDX data
   */
  const clearDDX = useCallback(() => {
    setDdxData(null);
    setError(null);
    setClinicalReferences([]);
    lastTranscriptRef.current = "";
  }, []);

  /**
   * Retry analysis with the same or new transcript
   */
  const retry = useCallback(
    (transcript) => {
      lastTranscriptRef.current = ""; // Force re-analysis
      setError(null);
      if (transcript) {
        analyzeDDX(transcript);
      }
    },
    [analyzeDDX]
  );

  /**
   * Directly set ddxData (for hydrating from saved session)
   */
  const setDdxDataDirectly = useCallback((data) => {
    console.log('[useChartMind] setDdxDataDirectly called with:', data);
    setDdxData(data);
  }, []);

  return {
    // State
    ddxData,
    loading,
    error,
    rawResponse, // Debug: raw LLM response
    clinicalReferences,

    // Computed
    hasDiagnoses:
      (ddxData?.primary_diagnoses?.length || 0) +
        (ddxData?.alternative_diagnoses?.length || 0) >
      0,

    // Actions
    analyzeDDX,
    clearDDX,
    retry,
    setDdxData: setDdxDataDirectly, // For session hydration
  };
}

export default useChartMind;
