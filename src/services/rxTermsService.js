// RxTerms API service for medication lookup
// Using the NIH RxTerms API for autocomplete: https://clinicaltables.nlm.nih.gov/apidoc/rxterms/v3/doc.html
// RxTerms is derived from RxNorm and optimized for prescription writing and autocomplete

const BASE_URL = "https://rxnav.nlm.nih.gov/REST";
const RXTERMS_URL = "https://clinicaltables.nlm.nih.gov/api/rxterms/v3";

export const rxTermsService = {
  /**
   * Search for medications by name using RxTerms API (optimized for autocomplete)
   * @param {string} searchTerm - The medication name to search for
   * @param {number} maxEntries - Maximum number of results to return (default: 20)
   * @returns {Promise<Array>} Array of medication objects
   */
  async searchMedications(searchTerm, maxEntries = 20) {
    if (!searchTerm || searchTerm.length < 1) {
      return [];
    }

    try {
      // Use RxTerms API for better autocomplete - designed for prescription writing
      const response = await fetch(
        `${RXTERMS_URL}/search?terms=${encodeURIComponent(
          searchTerm
        )}&maxList=${maxEntries}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // RxTerms API returns [count, [names], null, [details]]
      // data[1] contains the medication names
      const medicationNames = data?.[1] || [];

      // Debug: Uncomment to see raw RxTerms API response
      // console.log(`RxTerms search for "${searchTerm}":`, {
      //   totalResults: data[0],
      //   medications: medicationNames.slice(0, 5)
      // });

      if (!Array.isArray(medicationNames)) {
        return [];
      }

      // Convert RxTerms results to our medication format
      const medications = await Promise.allSettled(
        medicationNames
          .slice(0, maxEntries)
          .map((name, index) => this.convertRxTermsToMedication(name, index))
      );

      // Filter out failed conversions and return successful ones
      const validMedications = medications
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value)
        .filter((medication) => medication !== null);

      // Debug: Uncomment to see final results
      // console.log(`Final results for "${searchTerm}":`, {
      //   count: validMedications.length,
      //   medications: validMedications.slice(0, 3).map((m) => ({
      //     name: m.name,
      //     displayName: m.displayName,
      //     rxcui: m.rxcui
      //   }))
      // });

      return validMedications;
    } catch (error) {
      console.error("Error searching medications in RxTerms:", error);
      throw new Error("Failed to search medications. Please try again.");
    }
  },

  /**
   * Convert RxTerms medication name to our medication object format
   * @param {string} rxTermsName - The medication name from RxTerms (e.g., "metFORMIN (Oral Pill)")
   * @param {number} index - Index for generating unique IDs
   * @returns {Promise<Object|null>} Medication object or null if conversion fails
   */
  async convertRxTermsToMedication(rxTermsName, index = 0) {
    if (!rxTermsName) return null;

    try {
      // Parse the RxTerms format: "MEDICATION_NAME (Route Form)"
      const match = rxTermsName.match(/^(.+?)\s*\(([^)]+)\)$/);
      const medicationName = match ? match[1].trim() : rxTermsName;
      const routeForm = match ? match[2].trim() : "Oral";

      // Clean up the medication name (RxTerms uses weird capitalization)
      const cleanName = this.cleanRxTermsName(medicationName);

      // Try to get RxCUI for this medication (include route/form for uniqueness)
      const rxcui = await this.findRxcuiByString(cleanName);

      // Create unique ID that includes route/form to distinguish variants
      const uniqueId = rxcui
        ? `${rxcui}-${routeForm.toLowerCase().replace(/\s+/g, "-")}`
        : `rxterms-${cleanName.toLowerCase().replace(/\s+/g, "-")}-${routeForm
            .toLowerCase()
            .replace(/\s+/g, "-")}`;

      // Create medication object
      const medication = {
        rxcui: uniqueId,
        name: cleanName,
        displayName: cleanName,
        type: this.formatRouteForm(routeForm),
        strength: null,
        synonym: null,
        // Additional properties
        termType: rxcui ? "SCD" : "MANUAL", // Assume Specific Clinical Drug if we have RxCUI
        language: "ENG",
        suppress: "N",
        // RxTerms specific
        originalRxTermsName: rxTermsName,
        routeForm: routeForm,
      };

      return medication;
    } catch (error) {
      console.error(
        `Error converting RxTerms medication "${rxTermsName}":`,
        error
      );
      return null;
    }
  },

  /**
   * Clean up RxTerms medication names (they use weird capitalization)
   * @param {string} name - The medication name from RxTerms
   * @returns {string} Cleaned medication name
   */
  cleanRxTermsName(name) {
    if (!name) return "";

    // RxTerms uses patterns like "metFORMIN" - convert to proper case
    return name
      .toLowerCase()
      .split(/[\s/-]+/) // Split on spaces, slashes, hyphens
      .map((word) => {
        // Handle common abbreviations
        const abbreviations = {
          mg: "mg",
          ml: "mL",
          mcg: "mcg",
          iu: "IU",
          er: "ER",
          xl: "XL",
          sr: "SR",
          cr: "CR",
          hcl: "HCl",
          hct: "HCT",
        };

        const lowerWord = word.toLowerCase();
        if (abbreviations[lowerWord]) {
          return abbreviations[lowerWord];
        }

        // Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  },

  /**
   * Format route/form information from RxTerms
   * @param {string} routeForm - Route and form (e.g., "Oral Pill")
   * @returns {string} Formatted description
   */
  formatRouteForm(routeForm) {
    if (!routeForm) return "Medication";

    // Convert to title case and add "Medication" if needed
    const formatted = routeForm
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return `${formatted} Medication`;
  },

  /**
   * Get detailed information for a specific RxCUI (legacy method for compatibility)
   * @param {string} rxcui - The RxNorm Concept Unique Identifier
   * @param {string} originalTerm - The original search term for fallback display
   * @returns {Promise<Object|null>} Medication object or null if not found
   */
  async getMedicationDetails(rxcui, originalTerm = "") {
    try {
      const response = await fetch(
        `${BASE_URL}/rxcui/${rxcui}/properties.json`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const properties = data?.properties;

      if (!properties) {
        return null;
      }

      // Create a standardized medication object
      const medication = {
        rxcui: rxcui,
        name: properties.name || originalTerm,
        displayName: this.formatDisplayName(properties.name) || originalTerm,
        type: this.formatTermType(properties.termType),
        strength: properties.strength || null,
        synonym: properties.synonym || null,
        // Additional useful properties
        termType: properties.termType,
        language: properties.language,
        suppress: properties.suppress,
      };

      // Only return if we have valid data
      if (medication.name && medication.rxcui) {
        return medication;
      }

      return null;
    } catch (error) {
      console.error(`Error getting details for RxCUI ${rxcui}:`, error);
      return null;
    }
  },

  /**
   * Find exact RxCUI for a medication name
   * @param {string} medicationName - Exact medication name
   * @returns {Promise<string|null>} RxCUI or null if not found
   */
  async findRxcuiByString(medicationName) {
    if (!medicationName) {
      return null;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/rxcui.json?name=${encodeURIComponent(medicationName)}`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const rxcui = data?.idGroup?.rxnormId?.[0];

      return rxcui || null;
    } catch (error) {
      console.error("Error finding RxCUI by string:", error);
      return null;
    }
  },

  /**
   * Format display name for better readability
   * @param {string} name - Original medication name
   * @returns {string} Formatted display name
   */
  formatDisplayName(name) {
    if (!name) return "";

    // Capitalize first letter of each word and handle common abbreviations
    return name
      .toLowerCase()
      .split(" ")
      .map((word) => {
        // Handle common medical abbreviations
        const abbreviations = {
          mg: "mg",
          ml: "mL",
          mcg: "mcg",
          iu: "IU",
          er: "ER",
          xl: "XL",
          sr: "SR",
          cr: "CR",
          hcl: "HCl",
          hct: "HCT",
        };

        const lowerWord = word.toLowerCase();
        if (abbreviations[lowerWord]) {
          return abbreviations[lowerWord];
        }

        // Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  },

  /**
   * Format term type for better readability
   * @param {string} termType - RxNorm term type
   * @returns {string} Formatted term type
   */
  formatTermType(termType) {
    if (!termType) return "Medication";

    const typeMap = {
      SCD: "Specific Clinical Drug",
      SBD: "Specific Brand Drug",
      GPCK: "Generic Pack",
      BPCK: "Brand Pack",
      IN: "Ingredient",
      PIN: "Precise Ingredient",
      MIN: "Multiple Ingredients",
      SCDC: "Specific Clinical Drug Component",
      SBDC: "Specific Brand Drug Component",
      SCDF: "Specific Clinical Drug Form",
      SBDF: "Specific Brand Drug Form",
      SCDG: "Specific Clinical Drug Group",
      SBDG: "Specific Brand Drug Group",
    };

    return typeMap[termType] || termType;
  },
};
