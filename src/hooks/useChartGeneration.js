/**
 * useChartGeneration - Hook for generating clinical notes from transcripts
 *
 * Takes a transcript, selected diagnoses, and template to generate
 * a structured clinical note using the AI backend via proxyRunWorkflow.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { getDefaultTemplate, parseNoteResponse } from "config/noteTemplates";
import { invokeLLMPrompt } from "services/llmService";
import { useAuth } from "hooks/useAuth";

const NOTES_WORKFLOW_NAME = "chartmind-notes";

/**
 * Format selected diagnoses for inclusion in the LLM prompt
 */
const formatDiagnosesForPrompt = (diagnoses) => {
  if (!diagnoses || diagnoses.length === 0) return "";

  const formatted = diagnoses
    .map((dx, i) => {
      let line = `${i + 1}. ${dx.condition}`;
      if (dx.likelihood) line += ` (${dx.likelihood})`;
      if (dx.urgent) line += " [URGENT]";
      if (dx.rationale) line += `\n   Rationale: ${dx.rationale}`;
      return line;
    })
    .join("\n");

  return `\n\nSELECTED DIAGNOSES (confirmed by provider):\n${formatted}`;
};

/**
 * useChartGeneration Hook
 *
 * @param {Object} options
 * @param {Object} options.template - Note template (defaults to SOAP)
 * @param {Object} options.userSettings - Provider settings { specialty, displayName, credentials }
 * @param {Function} options.onDataChanged - Callback fired after successful AI response (for auto-save)
 */
function useChartGeneration({ template, userSettings, onDataChanged } = {}) {
  const { organizationId } = useAuth();
  const [noteSections, setNoteSections] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);

  // Use provided template or default SOAP
  const activeTemplate = template || getDefaultTemplate();

  // Track whether the last noteSections change came from a user edit (updateSection)
  // vs. AI generation (generateNote already calls onDataChanged synchronously).
  const pendingUserEditRef = useRef(false);

  // After updateSection's setNoteSections flushes, fire onDataChanged with fresh state.
  useEffect(() => {
    if (pendingUserEditRef.current && noteSections && onDataChanged) {
      pendingUserEditRef.current = false;
      onDataChanged();
    }
  }, [noteSections, onDataChanged]);

  const upsertFeedback = useCallback((updates) => {
    setFeedback((prev) => {
      const next = {
        ...(prev || {}),
        ...updates,
      };

      const hasRating =
        typeof next.rating === "number" && Number.isFinite(next.rating) && next.rating > 0;
      const hasRemarks =
        typeof next.remarks === "string" && next.remarks.trim().length > 0;

      if (!hasRating && !hasRemarks) {
        return null;
      }

      return {
        ...(hasRating ? { rating: next.rating } : {}),
        ...(hasRemarks ? { remarks: next.remarks } : {}),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Generate clinical note from transcript and diagnoses
   *
   * @param {string} transcript - The encounter transcript
   * @param {Array} selectedDiagnoses - Array of selected diagnosis objects
   */
  const generateNote = useCallback(
    async (transcript, selectedDiagnoses = []) => {
      if (!transcript || transcript.trim().length < 50) {
        setError("Transcript is too short. Need at least 50 characters.");
        return null;
      }

      setLoading(true);
      setError(null);
      setRawResponse(null);

      try {
        // Build the query with all context for the backend workflow
        const diagnosisInfo = formatDiagnosesForPrompt(selectedDiagnoses);
        const templateInfo = `NOTE TEMPLATE: ${
          activeTemplate.name
        }\nSECTIONS: ${activeTemplate.sections.map((s) => s.key).join(", ")}`;
        const query = `${templateInfo}\n\nPATIENT ENCOUNTER TRANSCRIPT:\n\n${transcript}${diagnosisInfo}`;

        console.log("[useChartGeneration] 📝 GENERATING NOTE VIA WORKFLOW...", {
          workflowName: NOTES_WORKFLOW_NAME,
          templateName: activeTemplate.name,
          sectionsCount: activeTemplate.sections.length,
          transcriptLength: transcript.length,
          diagnosesCount: selectedDiagnoses.length,
          timestamp: new Date().toISOString(),
        });

        // Call workflow API
        const result = await invokeLLMPrompt({
          promptId: NOTES_WORKFLOW_NAME,
          userMessage: query,
          organizationId,
        });

        const responseText = result.output;
        setRawResponse(responseText);

        console.log("[useChartGeneration] Response received", {
          responseLength: responseText?.length || 0,
          preview: responseText?.substring(0, 200),
        });

        // Parse the response
        const parsed = parseNoteResponse(responseText, activeTemplate.sections);

        if (parsed) {
          setNoteSections(parsed);
          setFeedback(null);
          console.log("[useChartGeneration] Note generated successfully", {
            sections: Object.keys(parsed),
          });

          // Trigger auto-save after successful AI response
          if (onDataChanged) {
            console.log("[useChartGeneration] Triggering auto-save callback");
            onDataChanged();
          }

          return parsed;
        } else {
          setError(
            "Failed to parse note response. See raw response for details.",
          );
          return null;
        }
      } catch (err) {
        console.error("[useChartGeneration] Error:", err);
        setError(err.message || "Failed to generate clinical note");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [activeTemplate, userSettings, onDataChanged, organizationId],
  );

  /**
   * Update a specific section of the note
   */
  const updateSection = useCallback((sectionKey, value) => {
    pendingUserEditRef.current = true;
    setNoteSections((prev) => ({
      ...prev,
      [sectionKey]: value,
    }));
  }, []);

  /**
   * Store chart feedback for the current note draft
   */
  const updateFeedbackRating = useCallback((rating) => {
    upsertFeedback({
      rating:
        typeof rating === "number" && Number.isFinite(rating) && rating > 0
          ? rating
          : null,
    });
  }, [upsertFeedback]);

  /**
   * Store free-text remarks for the current note draft
   */
  const updateFeedbackRemarks = useCallback((remarks) => {
    upsertFeedback({
      remarks: typeof remarks === "string" ? remarks : "",
    });
  }, [upsertFeedback]);

  /**
   * Clear all note data
   */
  const clearNote = useCallback(() => {
    setNoteSections(null);
    setFeedback(null);
    setError(null);
    setRawResponse(null);
  }, []);

  /**
   * Format note for clipboard (plain text)
   */
  const formatForClipboard = useCallback(() => {
    if (!noteSections) return "";

    let text = `${activeTemplate.name.toUpperCase()}\n${"=".repeat(
      activeTemplate.name.length + 5,
    )}\n\n`;

    activeTemplate.sections.forEach((section) => {
      const content = noteSections[section.key] || "Not documented";
      text += `${section.title.toUpperCase()}:\n${content}\n\n`;
    });

    text += `---\nGenerated by ChartMind\n${new Date().toLocaleString()}`;
    return text;
  }, [noteSections, activeTemplate]);

  /**
   * Directly set noteSections (for hydrating from saved session)
   */
  const setNoteSectionsDirectly = useCallback((sections) => {
    console.log(
      "[useChartGeneration] setNoteSectionsDirectly called with:",
      sections,
    );
    setNoteSections(sections);
  }, []);

  /**
   * Directly set feedback (for hydrating from saved session)
   */
  const setFeedbackDirectly = useCallback((nextFeedback) => {
    setFeedback(nextFeedback || null);
  }, []);

  return {
    // State
    noteSections,
    feedback,
    loading,
    error,
    rawResponse,
    template: activeTemplate,

    // Computed
    hasNote: !!noteSections,

    // Actions
    generateNote,
    updateSection,
    updateFeedbackRating,
    updateFeedbackRemarks,
    clearNote,
    formatForClipboard,
    setNoteSections: setNoteSectionsDirectly, // For session hydration
    setFeedback: setFeedbackDirectly, // For session hydration
  };
}

export default useChartGeneration;
