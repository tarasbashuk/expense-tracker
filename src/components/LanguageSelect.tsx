'use client';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import { Language } from '@prisma/client';

const LANGUAGE_OPTIONS = [
  { value: Language.ENG, label: 'English' },
  { value: Language.UKR, label: 'Українська' },
];

interface LanguageSelectProps {
  value: Language;
  label: string;
  fullWidth?: boolean;
  /* eslint-disable-next-line no-unused-vars*/
  onChange: (event: SelectChangeEvent) => void;
}

const LanguageSelect = ({ value, label, onChange }: LanguageSelectProps) => {
  return (
    <FormControl variant="standard" fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select value={value} onChange={onChange}>
        {LANGUAGE_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default LanguageSelect;
