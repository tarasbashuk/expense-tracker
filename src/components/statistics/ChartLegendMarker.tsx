import { Box } from '@mui/material';
import { getLuminance } from '@mui/material/styles';

export default function ChartLegendMarker({ color }: { color: string }) {
  const lightColor = getLuminance(color) > 0.8;

  return (
    <Box
      component="span"
      aria-hidden="true"
      sx={{
        display: 'inline-block',
        width: 12,
        height: 12,
        borderRadius: '3px',
        flexShrink: 0,
        boxSizing: 'border-box',
        bgcolor: color,
        border: lightColor ? '1px solid rgba(24, 32, 47, 0.18)' : undefined,
      }}
    />
  );
}
