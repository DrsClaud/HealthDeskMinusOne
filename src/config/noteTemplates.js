/**
 * Note Templates Configuration
 * 
 * Contains system default templates and the prompt generator for clinical note generation.
 * Templates define the structure of clinical notes (SOAP, HPI, Progress, etc.)
 */

/**
 * System default note templates
 * These are always available and cannot be modified by users.
 */
export const SYSTEM_DEFAULT_TEMPLATES = [
  {
    id: "system_soap",
    name: "SOAP Note",
    description: "Standard clinical documentation format",
    sections: [
      {
        key: "subjective",
        title: "Subjective",
        placeholder: "Chief complaint, HPI, ROS, PMH/PSH/FH/SH...",
        required: true,
      },
      {
        key: "objective",
        title: "Objective",
        placeholder: "Vital signs, physical examination findings, test results...",
        required: true,
      },
      {
        key: "assessment",
        title: "Assessment",
        placeholder: "Clinical summary, differential diagnosis, working diagnosis...",
        required: true,
      },
      {
        key: "plan",
        title: "Plan",
        placeholder: "Treatment plan, medications, follow-up, patient education...",
        required: true,
      },
    ],
  },
  {
    id: "system_hpi",
    name: "HPI Note",
    description: "History of Present Illness focused",
    sections: [
      {
        key: "chiefComplaint",
        title: "Chief Complaint",
        placeholder: "Primary reason for visit...",
        required: true,
      },
      {
        key: "hpi",
        title: "History of Present Illness",
        placeholder: "Onset, location, duration, character, aggravating/relieving factors...",
        required: true,
      },
      {
        key: "ros",
        title: "Review of Systems",
        placeholder: "Constitutional, cardiovascular, respiratory, GI, GU...",
        required: false,
      },
      {
        key: "assessment",
        title: "Assessment",
        placeholder: "Clinical impression based on the history...",
        required: true,
      },
    ],
  },
  {
    id: "system_progress",
    name: "Progress Note",
    description: "Follow-up visit documentation",
    sections: [
      {
        key: "intervalHistory",
        title: "Interval History",
        placeholder: "Changes since last visit, response to treatment...",
        required: true,
      },
      {
        key: "currentStatus",
        title: "Current Status",
        placeholder: "Current symptoms, functional status, medication adherence...",
        required: true,
      },
      {
        key: "assessment",
        title: "Assessment",
        placeholder: "Progress toward goals, updated diagnosis...",
        required: true,
      },
      {
        key: "plan",
        title: "Plan",
        placeholder: "Adjustments to treatment, next steps...",
        required: true,
      },
    ],
  },
  {
    id: "system_emergency_department",
    name: "Emergency Department Note",
    description: "Comprehensive ED documentation with MDM",
    sections: [
      {
        key: "chiefComplaint",
        title: "Chief Complaint",
        placeholder: "Primary reason for visit",
        required: true,
      },
      {
        key: "hpi",
        title: "History of Present Illness",
        placeholder: "Detailed history using OLDCARTS format...",
        required: true,
      },
      {
        key: "ros",
        title: "Review of Systems",
        placeholder: "System-by-system review...",
        required: true,
      },
      {
        key: "pastHistory",
        title: "Past Medical/Surgical/Social/Family History",
        placeholder: "PMH, PSH, Medications, Allergies, Social, Family History...",
        required: true,
      },
      {
        key: "physicalExam",
        title: "Physical Examination",
        placeholder: "General appearance, vital signs, system-by-system exam...",
        required: true,
      },
      {
        key: "diagnosticResults",
        title: "Diagnostic Results",
        placeholder: "Laboratory results, imaging findings, procedures...",
        required: false,
      },
      {
        key: "mdm",
        title: "Medical Decision Making",
        placeholder: "Problems addressed, differential diagnosis, risk assessment...",
        required: true,
      },
      {
        key: "diagnosisImpression",
        title: "Diagnosis/Impression",
        placeholder: "Primary and secondary diagnoses...",
        required: true,
      },
      {
        key: "treatmentPlan",
        title: "Treatment/Plan",
        placeholder: "Interventions, medications, procedures...",
        required: true,
      },
      {
        key: "disposition",
        title: "Disposition",
        placeholder: "Discharge, admit, transfer, follow-up...",
        required: true,
      },
      {
        key: "dischargeInstructions",
        title: "Patient Education/Discharge Instructions",
        placeholder: "Return precautions, medications, activity, follow-up...",
        required: false,
      },
      {
        key: "attestation",
        title: "Attestation",
        placeholder: "Provider attestation statement...",
        required: true,
      },
    ],
  },
];

/**
 * Get the default template (Emergency Department)
 */
export const getDefaultTemplate = () => {
  return SYSTEM_DEFAULT_TEMPLATES.find(t => t.id === "system_emergency_department") || SYSTEM_DEFAULT_TEMPLATES[0];
};

/**
 * Generate LLM system prompt from template sections
 * 
 * @param {string} templateName - Name of the note template
 * @param {Array} sections - Array of section definitions
 * @param {Object} options - Optional provider context
 * @returns {string} System prompt for LLM
 */
export const generateSystemPrompt = (templateName, sections, options = {}) => {
  if (!sections || sections.length === 0) {
    return "";
  }

  const { specialty, providerName, credentials } = options;

  // Build JSON schema from sections
  const schemaFields = sections
    .map((s) => `  "${s.key}": "${s.placeholder || s.title}"`)
    .join(",\n");

  // Build required sections note
  const requiredSections = sections.filter((s) => s.required);
  const requiredNote = requiredSections.length > 0
    ? `\n\nRequired sections that MUST be completed: ${requiredSections.map((s) => s.title).join(", ")}`
    : "";

  // Build specialty context if provided
  const specialtyContext = specialty
    ? `\n\nProvider Context: This note is being generated for a ${specialty} provider${
        credentials ? ` (${credentials})` : ""
      }. Use terminology appropriate for this specialty.`
    : "";

  return `You are a medical documentation assistant. Generate a structured ${templateName} from the patient encounter transcript.

Return ONLY valid JSON in this exact format:
{
${schemaFields}
}
${specialtyContext}

CRITICAL REQUIREMENTS:
1. ABSOLUTE PROHIBITION: You must NEVER include any fictional, fabricated, or assumed information. Only document what is explicitly stated in the transcript.
2. If information for a section is not present in the transcript, write "Not documented during this encounter" - do NOT make up details.
3. Do NOT add symptoms, findings, diagnoses, or any clinical information that was not explicitly mentioned.
4. Use professional medical terminology appropriate for clinical documentation.
5. Be concise but thorough - include all relevant details FROM THE TRANSCRIPT ONLY.
6. Format each section with clear organization.${requiredNote}`;
};

/**
 * Parse LLM response to extract JSON note sections
 * 
 * @param {string} content - Raw LLM response
 * @param {Array} sections - Expected sections from template
 * @returns {Object|null} Parsed sections or null on failure
 */
export const parseNoteResponse = (content, sections) => {
  if (!content) return null;

  const trimmed = content.trim();

  // Check for non-JSON responses
  if (
    trimmed.startsWith("I'm sorry") ||
    trimmed.startsWith("I cannot") ||
    trimmed.startsWith("I don't") ||
    !trimmed.includes("{")
  ) {
    console.log("[parseNoteResponse] LLM returned non-JSON response");
    // Return empty structure
    const empty = {};
    sections.forEach(s => { empty[s.key] = "Not documented"; });
    return empty;
  }

  // Extract JSON from markdown code blocks if present
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonStr.trim());
    
    // Ensure all expected sections exist
    const result = {};
    sections.forEach(s => {
      result[s.key] = parsed[s.key] || "Not documented";
    });
    
    return result;
  } catch (error) {
    console.error("[parseNoteResponse] Failed to parse JSON:", error);
    console.error("[parseNoteResponse] Content:", jsonStr.substring(0, 500));
    return null;
  }
};
