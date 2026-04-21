/**
 * useChartMindDischarge - Hook for AI-assisted discharge plan generation
 * 
 * Generates a structured discharge plan with editable sections:
 * - Diagnosis (patient-friendly explanation)
 * - Medications (with dosing instructions)
 * - Follow-up (timing and provider)
 * - Warning signs (when to return immediately)
 * - Activity restrictions/recommendations
 * 
 * This hook is manually triggered (not continuous refresh).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { invokeLLMPrompt } from 'services/llmService';
import { useAuth } from "hooks/useAuth";

// Workflow name for discharge instructions generation
const DISCHARGE_INSTRUCTIONS_WORKFLOW_NAME = "chartmind-discharge";

// Comprehensive Discharge Instructions Prompt (backend will use this via workflow)
const CHARTMIND_DISCHARGE_INSTRUCTIONS_PROMPT = `You are a clinical decision support assistant generating patient-friendly discharge instructions. Your instructions must be clear, comprehensive, and written at a 5th grade reading level.

**CRITICAL REQUIREMENTS:**

1. **PATIENT-FACING LANGUAGE**: All instructions must be written in simple, clear language that patients can understand. Avoid medical jargon. Use everyday terms.

2. **INSTRUCTION CATEGORIES**: Generate instructions for the following categories based on the provided context:
   - **Medication Instructions (General)**: General medication safety and administration guidelines
   - **Specific Medication Instructions**: One instruction per selected medication (e.g., "Antibiotic Instructions" for antibiotics, "Pain Medication Instructions" for analgesics)
   - **Activity Restrictions**: What activities to avoid or limit
   - **Diet Instructions**: Dietary recommendations or restrictions
   - **Follow-up Instructions**: When and with whom to follow up
   - **Warning Signs/When to Return**: Red flags that require immediate medical attention
   - **Wound Care**: Instructions for wound care if applicable
   - **Other**: Any other relevant instructions based on diagnosis/treatments

3. **CONTEXT-AWARE GENERATION**: 
   - Only generate instructions that are relevant to the selected diagnoses and treatments
   - For example, "Antibiotic Instructions" should ONLY appear if an antibiotic medication was selected
   - "Wound Care" should ONLY appear if there's a wound-related diagnosis or procedure
   - Customize instructions based on patient demographics (age, comorbidities) when provided

4. **PERSONALIZATION**: Customize each instruction based on:
   - Selected diagnoses (what condition the patient has)
   - Selected treatments (what medications/procedures were ordered)
   - Patient demographics (age, comorbidities) if provided
   - Use specific medication names when available

5. **DEFAULT INCLUSIONS**: 
   - Medication Instructions (General) should be included by default if any medications are selected
   - Follow-up Instructions should be included by default
   - All other instructions should only be included if relevant to the specific case

6. **INSTRUCTION STRUCTURE**: Each instruction should have:
   - **title**: Clear category name (e.g., "Antibiotic Instructions", "Activity Restrictions")
   - **prose**: Pre-populated, editable text written at 5th grade reading level
   - **category**: One of: "medication_general", "medication_specific", "activity", "diet", "followup", "warning_signs", "wound_care", "other"
   - **dependsOn**: Array of treatment types/categories this instruction depends on (e.g., ["antibiotic"] for "Antibiotic Instructions")
   - **includedByDefault**: Boolean indicating if this should be included by default

7. **NO TEMPLATE VARIABLES**: Do NOT use template variables like [MEDICATION_NAME]. Instead, use the actual medication names from the selected treatments.

8. **COMPREHENSIVE COVERAGE**: Ensure all relevant aspects of patient care are covered:
   - Medication administration, timing, side effects
   - Activity limitations and recommendations
   - Dietary considerations
   - When to seek immediate care
   - Follow-up requirements

**OUTPUT FORMAT (JSON only):**

{
  "instructions": [
    {
      "id": "unique_id",
      "title": "Instruction Title",
      "category": "medication_general" | "medication_specific" | "activity" | "diet" | "followup" | "warning_signs" | "wound_care" | "other",
      "prose": "Full patient-friendly instruction text at 5th grade reading level. Be specific and clear.",
      "dependsOn": ["treatment_type_or_category"], // Empty array if no dependencies
      "includedByDefault": true | false,
      "medicationName": "Specific medication name" // Only for medication_specific category
    }
  ]
}

**EXAMPLES:**

For selected treatment "Amoxicillin 500mg PO":
{
  "id": "antibiotic_amoxicillin",
  "title": "Antibiotic Instructions - Amoxicillin",
  "category": "medication_specific",
  "prose": "Take your Amoxicillin exactly as prescribed. Take it with food to avoid stomach upset. Finish all the medicine even if you start feeling better. Do not skip doses. If you miss a dose, take it as soon as you remember, but do not take two doses at once.",
  "dependsOn": ["antibiotic"],
  "includedByDefault": true,
  "medicationName": "Amoxicillin"
}

For "Activity Restrictions" with diagnosis "Fractured Ankle":
{
  "id": "activity_fracture",
  "title": "Activity Restrictions",
  "category": "activity",
  "prose": "Keep weight off your injured ankle. Use crutches as instructed. Do not put weight on your foot until your doctor says it's okay. Elevate your foot when sitting or lying down to reduce swelling.",
  "dependsOn": [],
  "includedByDefault": false
}

Return ONLY valid JSON - no markdown, no extra text.`;

/**
 * Custom hook for managing discharge plan generation and editing
 * 
 * @param {Object} options
 * @param {Function} [options.onDischargePlanUpdate] - Optional callback when plan is updated
 * @param {string} [options.customPrompt] - Optional custom prompt from note type
 * @param {Object} [options.initialData] - Initial discharge plan data to hydrate state
 * @param {Function} [options.onDataChanged] - Callback fired after successful AI response (for auto-save)
 */
function useChartMindDischarge({ onDischargePlanUpdate = undefined, customPrompt = null, initialData = null, onDataChanged } = {}) {
  const { organizationId } = useAuth();
  const [instructions, setInstructions] = useState(initialData?.instructions || []);
  const [includedInstructionIds, setIncludedInstructionIds] = useState(() => {
    // Initialize with default included instructions
    if (initialData?.includedInstructionIds) {
      return new Set(initialData.includedInstructionIds);
    }
    return new Set();
  });
  const [patientName, setPatientName] = useState(initialData?.patientName || '');
  const [date, setDate] = useState(initialData?.date || new Date().toLocaleDateString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasBeenGenerated, setHasBeenGenerated] = useState(!!initialData);
  
  const loadingRef = useRef(false);

  // Hydrate from initialData if it changes
  useEffect(() => {
    if (initialData) {
      setInstructions(initialData.instructions || []);
      setIncludedInstructionIds(new Set(initialData.includedInstructionIds || []));
      setPatientName(initialData.patientName || '');
      setDate(initialData.date || new Date().toLocaleDateString());
      setHasBeenGenerated(true);
    }
  }, [initialData]);

  /**
   * Generate discharge instructions from AI
   * 
   * @param {string} transcript - The encounter transcript
   * @param {Object|Array|string} confirmedDiagnosis - The final confirmed diagnosis(es)
   * @param {Array} selectedTreatments - Selected treatments from treatment step
   * @param {Object} patientDemographics - Optional patient demographics (age, comorbidities)
   */
  const generateDischargeInstructions = useCallback(async (transcript, confirmedDiagnosis, selectedTreatments = [], patientDemographics = {}) => {
    if (!transcript || !confirmedDiagnosis) {
      console.log('[useChartMindDischarge] Missing required input');
      return;
    }

    // Prevent duplicate calls
    if (loadingRef.current) {
      console.log('[useChartMindDischarge] Already generating, skipping...');
      return;
    }

    loadingRef.current = true;
    setIsGenerating(true);
    setLoading(true);
    setError(null);

    try {
      console.log('[useChartMindDischarge] Generating discharge instructions...');
      
      // Format diagnoses
      let diagnosesArray = [];
      if (Array.isArray(confirmedDiagnosis)) {
        diagnosesArray = confirmedDiagnosis;
      } else if (confirmedDiagnosis.diagnoses && Array.isArray(confirmedDiagnosis.diagnoses)) {
        diagnosesArray = confirmedDiagnosis.diagnoses;
      } else {
        diagnosesArray = [confirmedDiagnosis];
      }
      
      const diagnosisNames = diagnosesArray.map(dx => 
        typeof dx === 'string' ? dx : (dx.condition || dx.name || String(dx))
      );
      
      // Format treatments for prompt
      const treatmentsText = selectedTreatments.map(t => {
        const name = t.name || '';
        const category = t.category || t.type || '';
        const route = t.route || '';
        return `${name}${route ? ` (${route})` : ''}${category ? ` [${category}]` : ''}`;
      }).join(', ');
      
      // Build query
      const query = `PATIENT ENCOUNTER TRANSCRIPT:\n\n${transcript}\n\n` +
        `CONFIRMED DIAGNOSIS(ES):\n${diagnosisNames.map((name, idx) => `${idx + 1}. ${name}`).join('\n')}\n\n` +
        `SELECTED TREATMENTS:\n${treatmentsText || 'None'}\n\n` +
        (patientDemographics.age ? `PATIENT AGE: ${patientDemographics.age}\n` : '') +
        (patientDemographics.comorbidities ? `COMORBIDITIES: ${patientDemographics.comorbidities.join(', ')}\n` : '');
      
      console.log('[useChartMindDischarge] Calling workflow...', {
        workflowName: DISCHARGE_INSTRUCTIONS_WORKFLOW_NAME,
        diagnosesCount: diagnosesArray.length,
        treatmentsCount: selectedTreatments.length,
      });

      const response = await invokeLLMPrompt({
        promptId: DISCHARGE_INSTRUCTIONS_WORKFLOW_NAME,
        userMessage: query,
        organizationId,
      });
      
      console.log('[useChartMindDischarge] Workflow response received');
      
      // Parse JSON response
      const content = response.output || '';
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      const parsed = JSON.parse(jsonStr.trim());
      
      // Log the full LLM response for debugging
      console.log('[useChartMindDischarge] Full LLM response:', JSON.stringify(parsed, null, 2));
      console.log('[useChartMindDischarge] Raw response content:', content);
      
      // Process instructions
      const generatedInstructions = (parsed.instructions || []).map((inst, idx) => ({
        ...inst,
        id: inst.id || `instruction_${Date.now()}_${idx}`,
        prose: inst.prose || '',
        included: inst.includedByDefault || false,
        editedProse: null,
      }));
      
      // Set included instructions based on defaults
      const newIncludedIds = new Set();
      generatedInstructions.forEach(inst => {
        if (inst.includedByDefault) {
          newIncludedIds.add(inst.id);
        }
      });
      
      setInstructions(generatedInstructions);
      setIncludedInstructionIds(newIncludedIds);
      setHasBeenGenerated(true);
      
      // Notify parent
      const dischargeData = {
        instructions: generatedInstructions,
        includedInstructionIds: Array.from(newIncludedIds),
        patientName: patientName,
        date: date,
      };
      onDischargePlanUpdate?.(dischargeData);
      
      console.log('[useChartMindDischarge] Generated', generatedInstructions.length, 'discharge instructions');
      
      // Trigger auto-save after successful AI response
      if (onDataChanged) {
        console.log("[useChartMindDischarge] Triggering auto-save callback");
        onDataChanged();
      }
      
      return dischargeData;
      
    } catch (err) {
      console.error('[useChartMindDischarge] Error:', err);
      console.error('[useChartMindDischarge] Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
      });
      setError(err.message || 'Failed to generate discharge instructions');
      return null;
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setIsGenerating(false);
    }
  }, [customPrompt, onDischargePlanUpdate, patientName, date, onDataChanged, organizationId]);

  /**
   * Regenerate discharge instructions (clears existing and regenerates)
   */
  const regenerateDischargeInstructions = useCallback(async (transcript, confirmedDiagnosis, selectedTreatments = [], patientDemographics = {}) => {
    setInstructions([]);
    setIncludedInstructionIds(new Set());
    setHasBeenGenerated(false);
    return await generateDischargeInstructions(transcript, confirmedDiagnosis, selectedTreatments, patientDemographics);
  }, [generateDischargeInstructions]);

  /**
   * Toggle included state of an instruction
   * 
   * @param {string} instructionId - ID of instruction to toggle
   */
  const toggleInstructionIncluded = useCallback((instructionId) => {
    setIncludedInstructionIds(prev => {
      const next = new Set(prev);
      if (next.has(instructionId)) {
        next.delete(instructionId);
      } else {
        next.add(instructionId);
      }
      
      // Notify parent
      const dischargeData = {
        instructions: instructions,
        includedInstructionIds: Array.from(next),
        patientName: patientName,
        date: date,
      };
      onDischargePlanUpdate?.(dischargeData);
      
      return next;
    });
  }, [instructions, patientName, date, onDischargePlanUpdate]);

  /**
   * Update instruction prose (when edited in modal)
   * 
   * @param {string} instructionId - ID of instruction to update
   * @param {string} newProse - New prose text
   */
  const updateInstructionProse = useCallback((instructionId, newProse) => {
    setInstructions(prev => {
      const updated = prev.map(inst => 
        inst.id === instructionId 
          ? { ...inst, editedProse: newProse, prose: newProse }
          : inst
      );
      
      // Notify parent
      const dischargeData = {
        instructions: updated,
        includedInstructionIds: Array.from(includedInstructionIds),
        patientName: patientName,
        date: date,
      };
      onDischargePlanUpdate?.(dischargeData);
      
      return updated;
    });
  }, [includedInstructionIds, patientName, date, onDischargePlanUpdate]);

  /**
   * Reset state to empty
   */
  const reset = useCallback(() => {
    setInstructions([]);
    setIncludedInstructionIds(new Set());
    setError(null);
    setHasBeenGenerated(false);
  }, []);

  /**
   * Generate final formatted document from included instructions
   */
  const generateFinalDocument = useCallback(() => {
    const includedInstructions = instructions.filter(inst => includedInstructionIds.has(inst.id));
    
    // Category order for final document
    const categoryOrder = [
      'medication_general',
      'medication_specific',
      'activity',
      'diet',
      'followup',
      'warning_signs',
      'wound_care',
      'other',
    ];
    
    // Group by category and sort
    const grouped = {};
    includedInstructions.forEach(inst => {
      const category = inst.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(inst);
    });
    
    // Build document
    let document = '';
    
    // Header
    if (patientName) {
      document += `Patient: ${patientName}\n`;
    }
    document += `Date: ${date}\n\n`;
    document += `DISCHARGE INSTRUCTIONS\n`;
    document += `${'='.repeat(50)}\n\n`;
    
    // Output in category order
    categoryOrder.forEach(category => {
      if (grouped[category] && grouped[category].length > 0) {
        grouped[category].forEach(inst => {
          document += `${inst.title}\n`;
          document += `${'-'.repeat(inst.title.length)}\n`;
          document += `${inst.prose}\n\n`;
        });
      }
    });
    
    return document;
  }, [instructions, includedInstructionIds, patientName, date]);

  /**
   * Get discharge instructions as JSON for saving to CMR
   */
  const getForCMR = useCallback(() => {
    return {
      instructions: instructions,
      includedInstructionIds: Array.from(includedInstructionIds),
      patientName: patientName,
      date: date,
      generatedAt: new Date().toISOString(),
      version: '2.0',
    };
  }, [instructions, includedInstructionIds, patientName, date]);

  /**
   * Check if instructions are complete (has at least one included instruction)
   */
  const isComplete = useCallback(() => {
    return includedInstructionIds.size > 0;
  }, [includedInstructionIds]);

  /**
   * Directly restore discharge state (for session hydration)
   */
  const hydrateDischargeData = useCallback((data) => {
    console.log('[useChartMindDischarge] hydrateDischargeData called with:', data);
    if (!data) return;
    
    if (data.instructions) setInstructions(data.instructions);
    if (data.includedInstructionIds) setIncludedInstructionIds(new Set(data.includedInstructionIds));
    if (data.patientName) setPatientName(data.patientName);
    if (data.date) setDate(data.date);
    if (data.hasBeenGenerated !== undefined) setHasBeenGenerated(data.hasBeenGenerated);
  }, []);

  return {
    // State
    instructions,
    includedInstructionIds,
    patientName,
    date,
    loading,
    error,
    isGenerating,
    hasBeenGenerated,
    
    // Generation
    generateDischargeInstructions,
    regenerateDischargeInstructions,
    
    // Instruction management
    toggleInstructionIncluded,
    updateInstructionProse,
    
    // Patient info
    setPatientName,
    setDate,
    
    // Utilities
    reset,
    generateFinalDocument,
    getForCMR,
    isComplete,
    hydrateDischargeData, // For session hydration
  };
}

export default useChartMindDischarge;
