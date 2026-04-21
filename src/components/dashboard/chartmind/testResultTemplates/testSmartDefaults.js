/**
 * Test-Specific Smart Defaults
 * 
 * Provides clinically appropriate result options for each type of diagnostic test.
 * These are used as fallbacks when AI-generated choices are unavailable.
 * 
 * Each entry maps a test pattern (regex) to an array of appropriate result options.
 * The options should reflect actual clinical result categories, not generic "Low/Normal/High".
 */

/**
 * Test-specific result defaults organized by category
 * Pattern matching is case-insensitive
 */
const TEST_SMART_DEFAULTS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /urine\s*culture|u\/c|uc\b/i,
    choices: [
      'No growth',
      'Mixed flora / Contaminated',
      'Positive - E. coli',
      'Positive - Other organism',
    ],
    category: 'Culture',
  },
  {
    pattern: /blood\s*culture|bc\b|bld\s*cx/i,
    choices: [
      'No growth (negative)',
      'Positive - Gram positive cocci',
      'Positive - Gram negative rods',
      'Positive - Other organism',
    ],
    category: 'Culture',
  },
  {
    pattern: /throat\s*culture|rapid\s*strep|strep\s*test/i,
    choices: [
      'Negative',
      'Positive - Group A Strep',
      'Positive - Other',
    ],
    category: 'Culture',
  },
  {
    pattern: /wound\s*culture|abscess\s*culture/i,
    choices: [
      'No growth',
      'Normal skin flora',
      'Positive - Staph aureus',
      'Positive - MRSA',
      'Positive - Other organism',
    ],
    category: 'Culture',
  },
  {
    pattern: /sputum\s*culture|resp.*culture/i,
    choices: [
      'Normal respiratory flora',
      'Positive - Streptococcus pneumoniae',
      'Positive - Other organism',
      'No growth',
    ],
    category: 'Culture',
  },
  {
    pattern: /stool\s*culture|fecal\s*culture/i,
    choices: [
      'Negative / No pathogens',
      'Positive - Salmonella',
      'Positive - Campylobacter',
      'Positive - Other pathogen',
    ],
    category: 'Culture',
  },
  {
    pattern: /csf\s*culture|spinal\s*fluid\s*culture|cerebrospinal/i,
    choices: [
      'No growth (negative)',
      'Positive - Bacterial meningitis',
      'Positive - Other organism',
    ],
    category: 'Culture',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CARDIAC MARKERS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /troponin|trop\s*i|trop\s*t|hs-?troponin/i,
    choices: [
      'Negative / Normal',
      'Mildly elevated',
      'Significantly elevated (concerning for MI)',
    ],
    category: 'Cardiac',
  },
  {
    pattern: /bnp|nt-?pro\s*bnp|brain\s*natriuretic/i,
    choices: [
      'Normal',
      'Mildly elevated',
      'Moderately elevated',
      'Markedly elevated (heart failure range)',
    ],
    category: 'Cardiac',
  },
  {
    pattern: /d-?dimer/i,
    choices: [
      'Negative / Normal',
      'Elevated (non-specific)',
      'Significantly elevated',
    ],
    category: 'Cardiac',
  },
  {
    pattern: /ck-?mb|creatine\s*kinase.*mb/i,
    choices: [
      'Normal',
      'Elevated',
    ],
    category: 'Cardiac',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THYROID
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /\btsh\b|thyroid\s*stimulating/i,
    choices: [
      'Low (suggests hyperthyroidism)',
      'Normal (euthyroid)',
      'High (suggests hypothyroidism)',
    ],
    category: 'Thyroid',
  },
  {
    pattern: /free\s*t4|ft4|thyroxine/i,
    choices: [
      'Low',
      'Normal',
      'High',
    ],
    category: 'Thyroid',
  },
  {
    pattern: /free\s*t3|ft3|triiodothyronine/i,
    choices: [
      'Low',
      'Normal',
      'High',
    ],
    category: 'Thyroid',
  },
  {
    pattern: /thyroid\s*panel|thyroid\s*function/i,
    choices: [
      'Normal (euthyroid)',
      'Hypothyroid pattern',
      'Hyperthyroid pattern',
      'Subclinical abnormality',
    ],
    category: 'Thyroid',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DIABETES / METABOLIC
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /hba1c|a1c|glycated\s*hemoglobin|hemoglobin\s*a1c/i,
    choices: [
      'Non-diabetic (<5.7%)',
      'Prediabetes (5.7-6.4%)',
      'At goal (<7%)',
      'Above goal (7-8%)',
      'Poorly controlled (>8%)',
    ],
    category: 'Diabetes',
  },
  {
    pattern: /fasting\s*glucose|fbg|fbs/i,
    choices: [
      'Normal (<100 mg/dL)',
      'Prediabetes / Impaired (100-125)',
      'Diabetic range (≥126)',
    ],
    category: 'Diabetes',
  },
  {
    pattern: /glucose\s*tolerance|ogtt|gtt/i,
    choices: [
      'Normal',
      'Impaired glucose tolerance',
      'Diabetic',
    ],
    category: 'Diabetes',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LIPIDS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /lipid\s*panel|cholesterol\s*panel|lipid\s*profile/i,
    choices: [
      'Optimal',
      'Borderline / Mildly elevated',
      'High',
      'Mixed dyslipidemia',
    ],
    category: 'Lipids',
  },
  {
    pattern: /\bldl\b|ldl.*cholesterol/i,
    choices: [
      'Optimal (<100)',
      'Near optimal (100-129)',
      'Borderline high (130-159)',
      'High (160-189)',
      'Very high (≥190)',
    ],
    category: 'Lipids',
  },
  {
    pattern: /\bhdl\b|hdl.*cholesterol/i,
    choices: [
      'Low (concerning)',
      'Normal',
      'High (protective)',
    ],
    category: 'Lipids',
  },
  {
    pattern: /triglyceride|tg\b|trigs/i,
    choices: [
      'Normal (<150)',
      'Borderline high (150-199)',
      'High (200-499)',
      'Very high (≥500)',
    ],
    category: 'Lipids',
  },
  {
    pattern: /total\s*cholesterol|tc\b/i,
    choices: [
      'Desirable (<200)',
      'Borderline high (200-239)',
      'High (≥240)',
    ],
    category: 'Lipids',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INFLAMMATORY MARKERS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /\bcrp\b|c-reactive\s*protein|hs-?crp/i,
    choices: [
      'Normal',
      'Mildly elevated',
      'Moderately elevated',
      'Markedly elevated',
    ],
    category: 'Inflammatory',
  },
  {
    pattern: /\besr\b|sed\s*rate|erythrocyte\s*sedimentation/i,
    choices: [
      'Normal',
      'Mildly elevated',
      'Moderately elevated',
      'Markedly elevated',
    ],
    category: 'Inflammatory',
  },
  {
    pattern: /procalcitonin|pct\b/i,
    choices: [
      'Low (bacterial infection unlikely)',
      'Intermediate (possible bacterial)',
      'High (likely bacterial infection/sepsis)',
    ],
    category: 'Inflammatory',
  },
  {
    pattern: /ferritin/i,
    choices: [
      'Low (iron deficiency)',
      'Normal',
      'Elevated (inflammation/overload)',
    ],
    category: 'Inflammatory',
  },
  {
    pattern: /lactate|lactic\s*acid/i,
    choices: [
      'Normal',
      'Mildly elevated',
      'Significantly elevated (concerning)',
      'Critical',
    ],
    category: 'Inflammatory',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LIVER FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /liver\s*function|lft|hepatic\s*panel|liver\s*panel/i,
    choices: [
      'Normal',
      'Mildly elevated (<3x ULN)',
      'Moderately elevated (3-10x ULN)',
      'Severely elevated (>10x ULN)',
    ],
    category: 'Liver',
  },
  {
    pattern: /\bast\b|aspartate\s*aminotransferase|sgot/i,
    choices: [
      'Normal',
      'Mildly elevated (<3x ULN)',
      'Moderately elevated (3-10x ULN)',
      'Severely elevated (>10x ULN)',
    ],
    category: 'Liver',
  },
  {
    pattern: /\balt\b|alanine\s*aminotransferase|sgpt/i,
    choices: [
      'Normal',
      'Mildly elevated (<3x ULN)',
      'Moderately elevated (3-10x ULN)',
      'Severely elevated (>10x ULN)',
    ],
    category: 'Liver',
  },
  {
    pattern: /bilirubin|bili\b/i,
    choices: [
      'Normal',
      'Mildly elevated',
      'Moderately elevated',
      'Severely elevated (jaundice)',
    ],
    category: 'Liver',
  },
  {
    pattern: /alkaline\s*phosphatase|alk\s*phos|\balp\b/i,
    choices: [
      'Normal',
      'Mildly elevated',
      'Moderately elevated',
      'Severely elevated',
    ],
    category: 'Liver',
  },
  {
    pattern: /\bggt\b|gamma.*glutamyl/i,
    choices: [
      'Normal',
      'Elevated',
    ],
    category: 'Liver',
  },
  {
    pattern: /albumin/i,
    choices: [
      'Normal',
      'Low (hypoalbuminemia)',
    ],
    category: 'Liver',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // KIDNEY FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /\bbun\b|blood\s*urea\s*nitrogen/i,
    choices: [
      'Normal',
      'Mildly elevated',
      'Moderately elevated',
      'Severely elevated',
    ],
    category: 'Kidney',
  },
  {
    pattern: /creatinine|cr\b|serum\s*cr/i,
    choices: [
      'Normal',
      'Mildly elevated (AKI stage 1)',
      'Moderately elevated (AKI stage 2)',
      'Severely elevated (AKI stage 3)',
    ],
    category: 'Kidney',
  },
  {
    pattern: /\bgfr\b|egfr|glomerular\s*filtration/i,
    choices: [
      'Normal (≥90)',
      'Mildly reduced (60-89)',
      'Moderately reduced (30-59)',
      'Severely reduced (15-29)',
      'Kidney failure (<15)',
    ],
    category: 'Kidney',
  },
  {
    pattern: /renal\s*function|kidney\s*function/i,
    choices: [
      'Normal',
      'Mildly impaired',
      'Moderately impaired',
      'Severely impaired / Renal failure',
    ],
    category: 'Kidney',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COAGULATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /\binr\b|prothrombin\s*time|\bpt\b/i,
    choices: [
      'Normal',
      'Subtherapeutic',
      'Therapeutic (if on anticoagulation)',
      'Supratherapeutic / Elevated',
    ],
    category: 'Coagulation',
  },
  {
    pattern: /\bptt\b|aptt|partial\s*thromboplastin/i,
    choices: [
      'Normal',
      'Prolonged',
      'Therapeutic (if on heparin)',
    ],
    category: 'Coagulation',
  },
  {
    pattern: /fibrinogen/i,
    choices: [
      'Normal',
      'Low',
      'Elevated (acute phase)',
    ],
    category: 'Coagulation',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEMATOLOGY (Individual components)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /\bwbc\b|white\s*blood\s*cell|leukocyte\s*count/i,
    choices: [
      'Low (leukopenia)',
      'Normal',
      'High (leukocytosis)',
    ],
    category: 'Hematology',
  },
  {
    pattern: /hemoglobin|hgb|hb\b/i,
    choices: [
      'Low (anemia)',
      'Normal',
      'High (polycythemia)',
    ],
    category: 'Hematology',
  },
  {
    pattern: /hematocrit|hct\b/i,
    choices: [
      'Low',
      'Normal',
      'High',
    ],
    category: 'Hematology',
  },
  {
    pattern: /platelet|plt\b|thrombocyte/i,
    choices: [
      'Low (thrombocytopenia)',
      'Normal',
      'High (thrombocytosis)',
    ],
    category: 'Hematology',
  },
  {
    pattern: /\brbc\b|red\s*blood\s*cell|erythrocyte\s*count/i,
    choices: [
      'Low',
      'Normal',
      'High',
    ],
    category: 'Hematology',
  },
  {
    pattern: /reticulocyte|retic\s*count/i,
    choices: [
      'Low (inadequate marrow response)',
      'Normal',
      'High (appropriate marrow response)',
    ],
    category: 'Hematology',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ELECTROLYTES (Individual)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /\bsodium\b|\bna\+?\b(?!tive)/i,
    choices: [
      'Low (hyponatremia)',
      'Normal',
      'High (hypernatremia)',
    ],
    category: 'Electrolyte',
  },
  {
    pattern: /\bpotassium\b|\bk\+?\b/i,
    choices: [
      'Low (hypokalemia)',
      'Normal',
      'High (hyperkalemia)',
    ],
    category: 'Electrolyte',
  },
  {
    pattern: /\bmagnesium\b|\bmg\b/i,
    choices: [
      'Low (hypomagnesemia)',
      'Normal',
      'High (hypermagnesemia)',
    ],
    category: 'Electrolyte',
  },
  {
    pattern: /\bcalcium\b|\bca\b/i,
    choices: [
      'Low (hypocalcemia)',
      'Normal',
      'High (hypercalcemia)',
    ],
    category: 'Electrolyte',
  },
  {
    pattern: /phosphorus|phosphate|phos\b/i,
    choices: [
      'Low (hypophosphatemia)',
      'Normal',
      'High (hyperphosphatemia)',
    ],
    category: 'Electrolyte',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CANCER MARKERS / TUMOR MARKERS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /\bpsa\b|prostate\s*specific\s*antigen/i,
    choices: [
      'Normal (<4.0)',
      'Mildly elevated (4-10)',
      'Significantly elevated (>10)',
    ],
    category: 'Tumor Marker',
  },
  {
    pattern: /ca-?125|cancer\s*antigen\s*125/i,
    choices: [
      'Normal',
      'Elevated',
    ],
    category: 'Tumor Marker',
  },
  {
    pattern: /\bcea\b|carcinoembryonic/i,
    choices: [
      'Normal',
      'Elevated',
    ],
    category: 'Tumor Marker',
  },
  {
    pattern: /ca\s*19-?9/i,
    choices: [
      'Normal',
      'Elevated',
    ],
    category: 'Tumor Marker',
  },
  {
    pattern: /afp|alpha-?fetoprotein/i,
    choices: [
      'Normal',
      'Elevated',
    ],
    category: 'Tumor Marker',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOOD GAS / RESPIRATORY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /abg|arterial\s*blood\s*gas|blood\s*gas/i,
    choices: [
      'Normal',
      'Respiratory acidosis',
      'Respiratory alkalosis',
      'Metabolic acidosis',
      'Metabolic alkalosis',
      'Mixed disorder',
    ],
    category: 'Respiratory',
  },
  {
    pattern: /vbg|venous\s*blood\s*gas/i,
    choices: [
      'Normal',
      'Acidosis',
      'Alkalosis',
    ],
    category: 'Respiratory',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PREGNANCY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /pregnancy\s*test|hcg|beta-?hcg|bhcg|urine\s*preg|serum\s*preg/i,
    choices: [
      'Negative',
      'Positive',
    ],
    category: 'Pregnancy',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STI / INFECTIOUS DISEASE PANELS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /\bhiv\b|human\s*immunodeficiency/i,
    choices: [
      'Negative / Non-reactive',
      'Positive / Reactive',
      'Indeterminate',
    ],
    category: 'Infectious',
  },
  {
    pattern: /hepatitis|hep\s*[abc]|hbsag|anti-?hbs|hcv/i,
    choices: [
      'Negative / Non-reactive',
      'Positive / Reactive',
      'Immune (vaccinated or prior infection)',
    ],
    category: 'Infectious',
  },
  {
    pattern: /rpr|vdrl|syphilis|treponema/i,
    choices: [
      'Non-reactive (negative)',
      'Reactive (positive)',
    ],
    category: 'Infectious',
  },
  {
    pattern: /chlamydia|gc|gonorrhea|naat|gc\s*chlamydia|chlamydia\s*gc/i,
    choices: [
      'Negative',
      'Positive for Chlamydia',
      'Positive for Gonorrhea',
      'Positive for both',
    ],
    category: 'Infectious',
  },
  {
    pattern: /mono\s*spot|monospot|heterophile|ebv|epstein/i,
    choices: [
      'Negative',
      'Positive',
    ],
    category: 'Infectious',
  },
  {
    pattern: /influenza|flu\s*test/i,
    choices: [
      'Negative',
      'Positive - Influenza A',
      'Positive - Influenza B',
    ],
    category: 'Infectious',
  },
  {
    pattern: /covid|sars-?cov|coronavirus/i,
    choices: [
      'Negative',
      'Positive',
    ],
    category: 'Infectious',
  },
  {
    pattern: /rsv|respiratory\s*syncytial/i,
    choices: [
      'Negative',
      'Positive',
    ],
    category: 'Infectious',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DRUG / TOXICOLOGY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /drug\s*screen|urine\s*drug|tox\s*screen|toxicology/i,
    choices: [
      'Negative',
      'Positive (specify substances)',
    ],
    category: 'Toxicology',
  },
  {
    pattern: /alcohol\s*level|etoh|ethanol|blood\s*alcohol/i,
    choices: [
      'Negative / Undetectable',
      'Positive / Detected',
    ],
    category: 'Toxicology',
  },
  {
    pattern: /acetaminophen|tylenol\s*level|apap/i,
    choices: [
      'Undetectable / Negative',
      'Therapeutic',
      'Potentially toxic',
      'Toxic',
    ],
    category: 'Toxicology',
  },
  {
    pattern: /salicylate|aspirin\s*level/i,
    choices: [
      'Undetectable / Negative',
      'Therapeutic',
      'Elevated',
      'Toxic',
    ],
    category: 'Toxicology',
  },
  {
    pattern: /digoxin\s*level|dig\s*level/i,
    choices: [
      'Subtherapeutic',
      'Therapeutic',
      'Supratherapeutic / Toxic',
    ],
    category: 'Toxicology',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // URINE TESTS (Non-culture)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /urine\s*protein|proteinuria|microalbumin|albumin.*creatinine\s*ratio/i,
    choices: [
      'Normal / Negative',
      'Trace',
      'Positive',
    ],
    category: 'Urine',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STOOL TESTS (Non-culture)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /c\.\s*diff|clostridium|clostridioides|cdiff/i,
    choices: [
      'Negative',
      'Positive',
    ],
    category: 'Stool',
  },
  {
    pattern: /\bfit\b|fobt|fecal\s*occult|guaiac|hemoccult|stool\s*occult|fecal\s*immunochemical/i,
    choices: [
      'Negative',
      'Positive',
    ],
    category: 'Stool',
  },
  {
    pattern: /stool\s*ova|o&p|ova\s*and\s*parasites?/i,
    choices: [
      'Negative',
      'Positive (parasites identified)',
    ],
    category: 'Stool',
  },
  {
    pattern: /h\.\s*pylori|helicobacter|urea\s*breath|stool\s*antigen.*pylori/i,
    choices: [
      'Negative',
      'Positive',
    ],
    category: 'Stool',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTOIMMUNE / RHEUMATOLOGY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /\bana\b|antinuclear\s*antibody/i,
    choices: [
      'Negative',
      'Positive - Low titer',
      'Positive - High titer',
    ],
    category: 'Autoimmune',
  },
  {
    pattern: /rheumatoid\s*factor|\brf\b|anti-?ccp/i,
    choices: [
      'Negative',
      'Positive',
    ],
    category: 'Autoimmune',
  },
  {
    pattern: /uric\s*acid|urate/i,
    choices: [
      'Normal',
      'Elevated (hyperuricemia)',
    ],
    category: 'Autoimmune',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VITAMINS / NUTRITIONAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /vitamin\s*d|25-?oh|25-?hydroxy/i,
    choices: [
      'Deficient (<20)',
      'Insufficient (20-29)',
      'Normal (≥30)',
    ],
    category: 'Nutritional',
  },
  {
    pattern: /vitamin\s*b12|b-?12|cobalamin/i,
    choices: [
      'Low (deficiency)',
      'Normal',
      'High',
    ],
    category: 'Nutritional',
  },
  {
    pattern: /folate|folic\s*acid/i,
    choices: [
      'Low (deficiency)',
      'Normal',
    ],
    category: 'Nutritional',
  },
  {
    pattern: /\biron\b|serum\s*iron|iron\s*studies/i,
    choices: [
      'Low (iron deficiency)',
      'Normal',
      'Elevated (iron overload)',
    ],
    category: 'Nutritional',
  },
  {
    pattern: /tibc|total\s*iron\s*binding/i,
    choices: [
      'Low',
      'Normal',
      'High (iron deficiency)',
    ],
    category: 'Nutritional',
  },
  {
    pattern: /transferrin\s*saturation|tsat/i,
    choices: [
      'Low (iron deficiency)',
      'Normal',
      'High (iron overload)',
    ],
    category: 'Nutritional',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CARDIAC / VASCULAR IMAGING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /echocardiogram|echo(?!.*sonogram)|cardiac\s*echo|tte|tee/i,
    choices: [
      'Normal structure and function',
      'Reduced ejection fraction',
      'Preserved EF with diastolic dysfunction',
      'Valvular abnormality',
      'Wall motion abnormality',
    ],
    category: 'Cardiac Imaging',
  },
  {
    pattern: /stress\s*test|exercise\s*test|nuclear\s*stress|dobutamine/i,
    choices: [
      'Negative for ischemia',
      'Positive for ischemia',
      'Inconclusive / Non-diagnostic',
    ],
    category: 'Cardiac Imaging',
  },
  {
    pattern: /carotid\s*(ultrasound|doppler|duplex)/i,
    choices: [
      'Normal / No significant stenosis',
      'Mild stenosis (<50%)',
      'Moderate stenosis (50-69%)',
      'Severe stenosis (≥70%)',
    ],
    category: 'Vascular',
  },
  {
    pattern: /lower\s*extremity.*doppler|leg\s*doppler|dvt\s*(study|scan)|venous\s*duplex/i,
    choices: [
      'Negative for DVT',
      'Positive for DVT',
    ],
    category: 'Vascular',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEUROLOGICAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /\beeg\b|electroencephalogram/i,
    choices: [
      'Normal',
      'Abnormal - Epileptiform activity',
      'Abnormal - Focal slowing',
      'Abnormal - Diffuse slowing',
    ],
    category: 'Neurological',
  },
  {
    pattern: /\bemg\b|electromyography|nerve\s*conduction/i,
    choices: [
      'Normal',
      'Abnormal - Neuropathy',
      'Abnormal - Myopathy',
      'Abnormal - Radiculopathy',
    ],
    category: 'Neurological',
  },
  {
    pattern: /lumbar\s*puncture|\blp\b|csf\s*analysis|spinal\s*tap/i,
    choices: [
      'Normal',
      'Abnormal - Elevated WBC (pleocytosis)',
      'Abnormal - Elevated protein',
      'Abnormal - Concerning for meningitis',
    ],
    category: 'Neurological',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GI PROCEDURES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /colonoscopy/i,
    choices: [
      'Normal',
      'Polyps found (removed)',
      'Diverticulosis',
      'Mass / Concerning finding',
      'Inflammatory changes',
    ],
    category: 'GI Procedure',
  },
  {
    pattern: /egd|upper\s*endoscopy|esophagogastroduodenoscopy/i,
    choices: [
      'Normal',
      'Gastritis / Esophagitis',
      'Ulcer(s)',
      'Mass / Concerning finding',
      "Barrett's esophagus",
    ],
    category: 'GI Procedure',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PULMONARY FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /pft|pulmonary\s*function|spirometry/i,
    choices: [
      'Normal',
      'Obstructive pattern',
      'Restrictive pattern',
      'Mixed pattern',
    ],
    category: 'Pulmonary',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MISCELLANEOUS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /ammonia/i,
    choices: [
      'Normal',
      'Elevated',
    ],
    category: 'Miscellaneous',
  },
  {
    pattern: /lipase|amylase/i,
    choices: [
      'Normal',
      'Mildly elevated',
      'Significantly elevated (pancreatitis range)',
    ],
    category: 'Miscellaneous',
  },
  {
    pattern: /cortisol/i,
    choices: [
      'Low',
      'Normal',
      'Elevated',
    ],
    category: 'Miscellaneous',
  },
  {
    pattern: /parathyroid|\bpth\b/i,
    choices: [
      'Low',
      'Normal',
      'Elevated',
    ],
    category: 'Miscellaneous',
  },
];

/**
 * Get smart defaults for a given test name
 * 
 * @param {string} testName - The name of the test
 * @returns {Object} { choices: string[], category: string, matched: boolean }
 */
export function getSmartDefaultsForTest(testName) {
  if (!testName || typeof testName !== 'string') {
    return {
      choices: ['Normal', 'Abnormal'],
      category: 'Other',
      matched: false,
    };
  }

  const normalizedName = testName.trim();
  
  for (const entry of TEST_SMART_DEFAULTS) {
    if (entry.pattern.test(normalizedName)) {
      return {
        choices: entry.choices,
        category: entry.category,
        matched: true,
      };
    }
  }

  // No match found - return generic defaults
  // These are intentionally vague to signal that the test wasn't matched
  return {
    choices: ['Normal', 'Abnormal'],
    category: 'Other',
    matched: false,
  };
}

/**
 * Check if a test has specific smart defaults defined
 * 
 * @param {string} testName - The name of the test
 * @returns {boolean} True if specific defaults exist
 */
export function hasSmartDefaults(testName) {
  if (!testName || typeof testName !== 'string') return false;
  
  const normalizedName = testName.trim();
  return TEST_SMART_DEFAULTS.some(entry => entry.pattern.test(normalizedName));
}

export default TEST_SMART_DEFAULTS;
