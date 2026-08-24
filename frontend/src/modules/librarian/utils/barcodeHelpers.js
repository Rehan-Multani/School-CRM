/**
 * Generates a mock barcode sequence (array of boolean values representing black/white bars)
 * based on a seed string (e.g. ISBN or Book Code).
 * This ensures the same code always generates the exact same barcode visual.
 */
export const generateBarcodePattern = (seed) => {
  if (!seed) return [];
  
  // A simple hash function to generate a reliable pattern
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const pattern = [];
  
  // Guard zones (start)
  pattern.push(true, false, true);
  
  // Generate pseudo-random bars based on hash state
  let state = Math.abs(hash);
  for (let i = 0; i < 45; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    // Alternate or generate bars of random widths (1, 2, or 3 units)
    const isBlack = (state % 2) === 0;
    const width = (state % 3) + 1;
    for (let w = 0; w < width; w++) {
      pattern.push(isBlack);
    }
  }
  
  // Guard zones (end)
  pattern.push(true, false, true);
  
  return pattern;
};

export const validateISBN = (isbn) => {
  if (!isbn) return false;
  // Strip hyphens and spaces
  const clean = isbn.replace(/[- ]/g, '');
  return clean.length === 10 || clean.length === 13;
};
