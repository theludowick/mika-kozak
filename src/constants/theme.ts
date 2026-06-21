export const C = {
  // ── Backgrounds
  bg:            '#0B0D14',
  surface:       '#13151F',
  surfaceHigh:   '#1C1F2E',
  border:        '#252836',
  borderBright:  '#353849',

  // ── Primary — electric violet
  primary:       '#7B78FF',
  primaryDark:   '#5A57E0',
  primaryMuted:  'rgba(123,120,255,0.14)',

  // ── Accent — teal/mint (correct, success)
  accent:        '#2DD4BF',
  accentMuted:   'rgba(45,212,191,0.12)',

  // ── States
  gold:          '#FFB830',
  goldMuted:     'rgba(255,184,48,0.13)',
  error:         '#FF5C5C',
  errorMuted:    'rgba(255,92,92,0.12)',

  // ── Text
  text:          '#EAEAF5',
  textSub:       '#8B8FA8',
  textMuted:     '#484C63',
} as const;

export const FONT = {
  regular:    'Inter_400Regular',
  medium:     'Inter_500Medium',
  semiBold:   'Inter_600SemiBold',
  bold:       'Inter_700Bold',
  extraBold:  'Inter_800ExtraBold',
} as const;
