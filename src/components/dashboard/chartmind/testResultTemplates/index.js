/**
 * Test Result Templates Registry
 * 
 * Maps test names to specialized UI templates for structured result entry.
 * Falls back to generic template for unknown tests.
 */

import CBCTemplate from './CBCTemplate';
import BMPTemplate from './BMPTemplate';
import UrinalysisTemplate from './UrinalysisTemplate';
import ChestXRayTemplate from './ChestXRayTemplate';
import EKGTemplate from './EKGTemplate';
import ImagingTemplate from './ImagingTemplate';
import GenericTemplate from './GenericTemplate';

/**
 * Template registry - maps pattern matches to template components
 * Order matters: first match wins
 */
const TEMPLATE_PATTERNS = [
  // Blood tests - most specific first
  { 
    match: /cbc|complete blood count|blood count|hemogram/i, 
    template: 'CBC',
    component: CBCTemplate,
    category: 'Laboratory',
  },
  { 
    match: /bmp|basic metabolic|chem.*7|chem.*8|metabolic panel/i, 
    template: 'BMP',
    component: BMPTemplate,
    category: 'Laboratory',
  },
  { 
    match: /cmp|comprehensive metabolic/i, 
    template: 'CMP', // Uses BMP template with extra fields
    component: BMPTemplate,
    category: 'Laboratory',
  },
  { 
    match: /urinalysis|ua\b|urine.*analysis/i, 
    template: 'Urinalysis',
    component: UrinalysisTemplate,
    category: 'Laboratory',
  },
  
  // Imaging - specific studies
  { 
    match: /chest.*x-?ray|cxr/i, 
    template: 'ChestXRay',
    component: ChestXRayTemplate,
    category: 'Imaging',
  },
  { 
    match: /ct|computed tomography|cat scan/i, 
    template: 'CTScan',
    component: ImagingTemplate,
    category: 'Imaging',
  },
  { 
    match: /mri|magnetic resonance/i, 
    template: 'MRI',
    component: ImagingTemplate,
    category: 'Imaging',
  },
  { 
    match: /ultrasound|sonogram|echo/i, 
    template: 'Ultrasound',
    component: ImagingTemplate,
    category: 'Imaging',
  },
  { 
    match: /x-?ray/i, 
    template: 'XRay',
    component: ImagingTemplate,
    category: 'Imaging',
  },
  
  // Procedures
  { 
    match: /ekg|ecg|electrocardiogram/i, 
    template: 'EKG',
    component: EKGTemplate,
    category: 'Procedure',
  },
];

/**
 * Get the appropriate template component for a test
 * 
 * @param {Object} test - Test object with name and category
 * @returns {Object} Template info: { template, component, category }
 */
export function getTemplateForTest(test) {
  if (!test?.name) {
    return {
      template: 'Generic',
      component: GenericTemplate,
      category: test?.category || 'Other',
    };
  }

  const testName = test.name.toLowerCase();
  
  // Try to find a matching template
  for (const pattern of TEMPLATE_PATTERNS) {
    if (pattern.match.test(testName)) {
      return {
        template: pattern.template,
        component: pattern.component,
        category: pattern.category,
      };
    }
  }

  // Check category for generic imaging fallback
  const category = test.category || 'Other';
  if (category === 'Imaging') {
    return {
      template: 'Imaging',
      component: ImagingTemplate,
      category: 'Imaging',
    };
  }

  // Default to generic template
  return {
    template: 'Generic',
    component: GenericTemplate,
    category: category,
  };
}

/**
 * Check if a test has a specialized template
 * 
 * @param {Object} test - Test object
 * @returns {boolean} True if test has a specialized (non-generic) template
 */
export function hasSpecializedTemplate(test) {
  const { template } = getTemplateForTest(test);
  return template !== 'Generic' && template !== 'Imaging';
}

/**
 * Get template display name
 * 
 * @param {string} templateType - Template type string
 * @returns {string} Human-readable template name
 */
export function getTemplateDisplayName(templateType) {
  const names = {
    CBC: 'Complete Blood Count',
    BMP: 'Basic Metabolic Panel',
    CMP: 'Comprehensive Metabolic Panel',
    Urinalysis: 'Urinalysis',
    ChestXRay: 'Chest X-Ray',
    CTScan: 'CT Scan',
    MRI: 'MRI',
    Ultrasound: 'Ultrasound',
    XRay: 'X-Ray',
    EKG: 'EKG/ECG',
    Imaging: 'Imaging Study',
    Generic: 'Test Result',
  };
  return names[templateType] || 'Test Result';
}

export {
  CBCTemplate,
  BMPTemplate,
  UrinalysisTemplate,
  ChestXRayTemplate,
  EKGTemplate,
  ImagingTemplate,
  GenericTemplate,
};
