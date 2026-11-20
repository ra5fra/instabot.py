// Format, marginaler och färger för Velora på Instagram (karusell i 4:5).
export const W = 1080;
export const H = 1350;

// Instagram lägger inget UI över karusellbilder, men profilrutnätet beskär till 3:4
// (ca 34 px per sida) och telefoner rundar hörnen. Texten hålls därför innanför de här kanterna.
export const SAFE = {
  top: 110,
  bottom: 120,
  left: 100,
  right: 100,
};

export const COLORS = {
  cream: '#F7F1EA',
  paper: '#FFFCF8',
  ink: '#2E2433', // mörk plommon, brödtext och rubriker
  muted: '#7D6F80',
  terracotta: '#B5583A', // accent i rubriker
  peach: '#F4A28C',
  violet: '#8C7BC4',
  deepViolet: '#3F3456', // bakgrund på sista sliden
  bubbleGray: '#E9E3EC',
};

// Kontonamnet i sidfoten. Kan ändras per karusell med "handle" i JSON:en.
export const HANDLE = '@velora.affirmations';
