// Format, safe zones and palette for the English theme (black marble / rose gold).
export const W = 1080;
export const H = 1920;

// TikTok's UI covers the edges: no important text here.
export const SAFE = {
  top: 260,
  bottom: 480,
  right: 150,
  left: 70, // no UI on the left, but some air so the text is centred in the free area
};

// Sampled from assets/cover.jpg: title lettering, marble veins and background.
export const COLORS = {
  roseLight: '#F8D9D8', // cover title
  rose: '#E3AAA8', // main accent (veins, highlighted boxes)
  roseDark: '#B67D80', // darker veins
  roseDeep: '#8B5256', // deepest vein tone
  roseInk: '#A3545A', // rose text on white (readable contrast)
  plum: '#0D050D', // cover background
  plumBox: '#150A14', // dark text boxes
  ink: '#0b0b0c',
  paper: '#ffffff',
};
