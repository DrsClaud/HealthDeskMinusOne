/**
 * Reflex Testing Configuration
 * 
 * Defines clinical reflex testing rules: when an abnormal result is selected,
 * suggests follow-up tests that should be ordered.
 * 
 * Format:
 * {
 *   testPattern: /regex pattern to match test name/i,
 *   rules: [
 *     {
 *       resultPattern: /regex pattern to match result/i,
 *       recommendations: [
 *         { name: 'Test Name', category: 'Laboratory|Imaging|Procedure|Other', rationale: 'Why this test' }
 *       ],
 *       explanation: 'Why these tests are needed'
 *     }
 *   ]
 * }
 */

const REFLEX_TESTING_RULES = [
  // ═══════════════════════════════════════════════════════════════════════════
  // THYROID FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    testPattern: /\btsh\b|thyroid\s*stimulating/i,
    rules: [
      {
        resultPattern: /low|hyperthyroid/i,
        recommendations: [
          {
            name: 'Free T4',
            category: 'Laboratory',
            rationale: 'Evaluate thyroid hormone levels in hyperthyroidism',
          },
          {
            name: 'Free T3',
            category: 'Laboratory',
            rationale: 'Assess T3 levels in hyperthyroidism',
          },
        ],
        explanation: 'Abnormal TSH requires thyroid hormone levels (T4 and T3) for complete evaluation of thyroid function.',
      },
      {
        resultPattern: /high|hypothyroid/i,
        recommendations: [
          {
            name: 'Free T4',
            category: 'Laboratory',
            rationale: 'Evaluate thyroid hormone levels in hypothyroidism',
          },
        ],
        explanation: 'Abnormal TSH requires Free T4 level to confirm and characterize hypothyroidism.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COAGULATION / THROMBOSIS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    testPattern: /d-?dimer/i,
    rules: [
      {
        resultPattern: /positive|elevated|significantly/i,
        recommendations: [
          {
            name: 'CT PE (Pulmonary Embolism)',
            category: 'Imaging',
            rationale: 'Evaluate for pulmonary embolism when D-dimer is elevated',
          },
          {
            name: 'Lower Extremity Duplex',
            category: 'Imaging',
            rationale: 'Evaluate for deep vein thrombosis when D-dimer is elevated',
          },
        ],
        explanation: 'Elevated D-dimer suggests possible thrombosis. Consider CT PE study to evaluate for pulmonary embolism or lower extremity duplex to assess for DVT.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // URINALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    testPattern: /urinalysis|ua\b|urine.*analysis/i,
    rules: [
      {
        resultPattern: /positive|bacteria|leukocyte|nitrite|infection/i,
        recommendations: [
          {
            name: 'Urine Culture',
            category: 'Laboratory',
            rationale: 'Identify organism and guide antibiotic therapy',
          },
        ],
        explanation: 'Positive urinalysis findings suggestive of infection should be followed by urine culture to identify the organism and guide treatment.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE BLOOD COUNT (CBC)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    testPattern: /cbc|complete\s*blood\s*count|hemogram/i,
    rules: [
      {
        resultPattern: /anemia|low.*hemoglobin|low.*hgb|low.*hematocrit/i,
        recommendations: [
          {
            name: 'Reticulocyte Count',
            category: 'Laboratory',
            rationale: 'Assess bone marrow response in anemia',
          },
          {
            name: 'Iron Studies',
            category: 'Laboratory',
            rationale: 'Evaluate for iron deficiency anemia',
          },
          {
            name: 'Vitamin B12',
            category: 'Laboratory',
            rationale: 'Evaluate for B12 deficiency',
          },
          {
            name: 'Folate',
            category: 'Laboratory',
            rationale: 'Evaluate for folate deficiency',
          },
        ],
        explanation: 'Anemia requires evaluation of bone marrow response (reticulocyte count) and assessment for nutritional deficiencies (iron, B12, folate).',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LIVER FUNCTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    testPattern: /liver\s*function|lft|hepatic\s*panel|ast|alt|significantly\s*elevated/i,
    rules: [
      {
        resultPattern: /significantly|severely|>10x|markedly/i,
        recommendations: [
          {
            name: 'Hepatitis Panel',
            category: 'Laboratory',
            rationale: 'Evaluate for viral hepatitis when LFTs are significantly elevated',
          },
          {
            name: 'Right Upper Quadrant Ultrasound',
            category: 'Imaging',
            rationale: 'Assess liver structure and biliary system',
          },
        ],
        explanation: 'Significantly elevated liver function tests warrant evaluation for viral hepatitis and imaging to assess liver structure.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CARDIAC MARKERS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    testPattern: /troponin|trop\s*i|trop\s*t|hs-?troponin/i,
    rules: [
      {
        resultPattern: /elevated|positive|concerning/i,
        recommendations: [
          {
            name: 'Serial Troponins',
            category: 'Laboratory',
            rationale: 'Monitor troponin trend to assess for myocardial infarction',
          },
          {
            name: 'EKG',
            category: 'Procedure',
            rationale: 'Evaluate for acute coronary syndrome',
          },
          {
            name: 'Echocardiogram',
            category: 'Imaging',
            rationale: 'Assess cardiac function and wall motion',
          },
        ],
        explanation: 'Elevated troponin suggests possible myocardial injury. Serial troponins, EKG, and echocardiogram help evaluate for acute coronary syndrome.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DIABETES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    testPattern: /hba1c|a1c|glycated\s*hemoglobin/i,
    rules: [
      {
        resultPattern: /diabetic|>6\.4|poorly\s*controlled|above\s*goal/i,
        recommendations: [
          {
            name: 'Fasting Glucose',
            category: 'Laboratory',
            rationale: 'Confirm diabetes diagnosis and assess glucose control',
          },
          {
            name: 'Lipid Panel',
            category: 'Laboratory',
            rationale: 'Assess cardiovascular risk in diabetes',
          },
        ],
        explanation: 'New diabetes diagnosis or poor control requires confirmation with fasting glucose and cardiovascular risk assessment with lipid panel.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PREGNANCY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    testPattern: /pregnancy\s*test|hcg|beta-?hcg|bhcg/i,
    rules: [
      {
        resultPattern: /positive/i,
        recommendations: [
          {
            name: 'Dating Ultrasound',
            category: 'Imaging',
            rationale: 'Establish gestational age and confirm intrauterine pregnancy',
          },
        ],
        explanation: 'Positive pregnancy test should be followed by dating ultrasound to establish gestational age and confirm intrauterine pregnancy.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROSTATE SPECIFIC ANTIGEN
  // ═══════════════════════════════════════════════════════════════════════════
  {
    testPattern: /\bpsa\b|prostate\s*specific\s*antigen/i,
    rules: [
      {
        resultPattern: /elevated|>4|significantly/i,
        recommendations: [
          {
            name: 'Urology Referral',
            category: 'Other',
            rationale: 'Evaluate elevated PSA for possible prostate cancer',
          },
          {
            name: 'Prostate MRI',
            category: 'Imaging',
            rationale: 'Further evaluation of elevated PSA',
          },
        ],
        explanation: 'Elevated PSA warrants urology evaluation and may require prostate MRI for further assessment.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STREP TEST
  // ═══════════════════════════════════════════════════════════════════════════
  {
    testPattern: /rapid\s*strep|strep\s*test|throat\s*culture/i,
    rules: [
      {
        resultPattern: /positive/i,
        recommendations: [
          {
            name: 'Antibiotic Treatment',
            category: 'Other',
            rationale: 'Treat Group A Strep pharyngitis',
          },
        ],
        explanation: 'Positive strep test requires antibiotic treatment to prevent complications.',
      },
    ],
  },
];

/**
 * Get reflex testing recommendations for a test and result
 * 
 * @param {string} testName - Name of the test
 * @param {string|Object} result - The result (string or object with status/description)
 * @returns {Object|null} { recommendations: Array, explanation: string } or null if no match
 */
export function getReflexRecommendations(testName, result) {
  if (!testName || !result) return null;

  // Convert result to string for pattern matching
  let resultString = '';
  if (typeof result === 'string') {
    resultString = result;
  } else if (result.status) {
    resultString = result.status;
    if (result.description) {
      resultString += ' ' + result.description;
    }
  } else if (result.prose) {
    resultString = result.prose;
  }

  // Find matching test pattern
  for (const ruleSet of REFLEX_TESTING_RULES) {
    if (ruleSet.testPattern.test(testName)) {
      // Find matching result pattern
      for (const rule of ruleSet.rules) {
        if (rule.resultPattern.test(resultString)) {
          return {
            recommendations: rule.recommendations,
            explanation: rule.explanation,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Check if a test has reflex testing rules defined
 * 
 * @param {string} testName - Name of the test
 * @returns {boolean} True if reflex rules exist for this test
 */
export function hasReflexRules(testName) {
  if (!testName) return false;
  return REFLEX_TESTING_RULES.some(ruleSet => ruleSet.testPattern.test(testName));
}

export default REFLEX_TESTING_RULES;
