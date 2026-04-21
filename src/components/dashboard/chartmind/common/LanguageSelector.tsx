/**
 * LanguageSelector - Simple language selection for Speech-to-Text
 * 
 * A minimal dropdown to select the language for STT transcription.
 */

import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  SelectChangeEvent,
} from '@mui/material';

// Types
interface Language {
  code: string;
  label: string;
  flag: string;
}

// Supported languages
const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
  { code: 'sw', label: 'Swahili (Kenya)', flag: '🇰🇪' },
  { code: 'fr-FR', label: 'French', flag: '🇫🇷' },
  { code: 'es-ES', label: 'Spanish', flag: '🇪🇸' },
  { code: 'pt-BR', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'ar-SA', label: 'Arabic', flag: '🇸🇦' },
  { code: 'hi-IN', label: 'Hindi', flag: '🇮🇳' },
];

// Props
interface LanguageSelectorProps {
  value: string;
  onChange: (language: string) => void;
  disabled?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const handleChange = (e: SelectChangeEvent) => {
    onChange(e.target.value);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 200 }} disabled={disabled}>
      <InputLabel id="language-selector-label">Language</InputLabel>
      <Select
        labelId="language-selector-label"
        value={value}
        label="Language"
        onChange={handleChange}
      >
        {SUPPORTED_LANGUAGES.map((lang: Language) => (
          <MenuItem key={lang.code} value={lang.code}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <span>{lang.flag}</span>
              <span style={{ fontSize: '0.85rem' }}>{lang.label}</span>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default LanguageSelector;
export { SUPPORTED_LANGUAGES };
export type { Language };
