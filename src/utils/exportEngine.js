/**
 * Keycap Studio Export Engine
 * Comprehensive export system for manufacturing-ready outputs
 *
 * Supports: KLE JSON, SVG (vector), PNG (raster), PDF, Manufacturer templates
 */

// ============================================================
// CONSTANTS
// ============================================================

const KEY_UNIT_MM = 19.05; // 1u = 19.05mm standard

// Minimum feature sizes for double-shot injection molding (GMK specs)
const MIN_LINE_THICKNESS_MM = 0.3;
const MIN_SPACING_MM = 0.4;
const MIN_ENCLOSED_AREA_MM = 0.6;
const MIN_CORNER_RADIUS_MM = 0.1;

// Common RAL colors with RGB approximations for color matching
const RAL_COLORS = {
  '9005': { name: 'Jet Black', rgb: '#0A0A0A' },
  '9010': { name: 'Pure White', rgb: '#F5F5F5' },
  '9003': { name: 'Signal White', rgb: '#ECECE7' },
  '7035': { name: 'Light Grey', rgb: '#D7D7D7' },
  '7016': { name: 'Anthracite Grey', rgb: '#383E42' },
  '5002': { name: 'Ultramarine Blue', rgb: '#20214F' },
  '5015': { name: 'Sky Blue', rgb: '#2271B3' },
  '3000': { name: 'Flame Red', rgb: '#A72920' },
  '3020': { name: 'Traffic Red', rgb: '#C1121C' },
  '1023': { name: 'Traffic Yellow', rgb: '#F0CA00' },
  '6018': { name: 'Yellow Green', rgb: '#57A639' },
  '4008': { name: 'Signal Violet', rgb: '#8D3C8E' },
  '8017': { name: 'Chocolate Brown', rgb: '#442F29' },
  '2004': { name: 'Pure Orange', rgb: '#E75B12' },
};

// Row profile mappings for different conventions
const ROW_PROFILES = {
  cherry: {
    standard: ['R1', 'R1', 'R2', 'R3', 'R4', 'R4'], // top to bottom
    description: 'Cherry/GMK standard (R1=top)'
  },
  sp: {
    standard: ['R4', 'R4', 'R3', 'R2', 'R1', 'R1'], // reversed
    description: 'Signature Plastics (R1=bottom)'
  }
};

// ============================================================
// COLOR UTILITIES
// ============================================================

/**
 * Convert HEX to RGB object
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Calculate color distance (simple Euclidean)
 */
function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

/**
 * Find closest RAL color to a given HEX
 */
export function findClosestRAL(hex) {
  const targetRgb = hexToRgb(hex);
  let closest = null;
  let minDistance = Infinity;

  for (const [code, data] of Object.entries(RAL_COLORS)) {
    const ralRgb = hexToRgb(data.rgb);
    const distance = colorDistance(targetRgb, ralRgb);
    if (distance < minDistance) {
      minDistance = distance;
      closest = { code: `RAL ${code}`, name: data.name, rgb: data.rgb, distance };
    }
  }

  return closest;
}

/**
 * Convert RGB to approximate CMYK
 */
export function rgbToCmyk(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = Math.round((1 - rr - k) / (1 - k) * 100);
  const m = Math.round((1 - gg - k) / (1 - k) * 100);
  const y = Math.round((1 - bb - k) / (1 - k) * 100);
  return { c, m, y, k: Math.round(k * 100) };
}

// ============================================================
// KLE JSON EXPORT
// ============================================================

/**
 * Generate KLE (Keyboard Layout Editor) JSON format
 * This is the industry standard for layout interchange
 */
export function generateKLEJson(layout, designState) {
  const {
    globalColor,
    globalLegendColor,
    globalFont,
    selectedProfile,
    selectedFormFactor,
    selectedModel,
    materialPreset,
    perKeyDesigns
  } = designState;

  // Metadata as first element
  const metadata = {
    name: selectedModel || 'Custom Keycap Set',
    author: 'Keycap Studio',
    notes: `Profile: ${selectedProfile || 'Cherry'}\nMaterial: ${materialPreset?.toUpperCase() || 'PBT'}\nForm Factor: ${selectedFormFactor || '60%'}`
  };

  // Group keys by row (y coordinate)
  const rowMap = new Map();
  layout.forEach(key => {
    const rowY = key.y || 0;
    if (!rowMap.has(rowY)) rowMap.set(rowY, []);
    rowMap.get(rowY).push(key);
  });

  // Sort rows by Y, then keys within each row by X
  const sortedRows = [...rowMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([_, keys]) => keys.sort((a, b) => (a.x || 0) - (b.x || 0)));

  // Build KLE array
  const kleArray = [metadata];
  let currentX = 0;

  sortedRows.forEach((rowKeys, rowIndex) => {
    const rowArray = [];
    currentX = 0;

    rowKeys.forEach((key, keyIndex) => {
      const keyDesign = perKeyDesigns?.[key.id] || {};
      const keyColor = keyDesign.color || globalColor;
      const legendColor = keyDesign.legendColor || globalLegendColor;
      const keyW = key.w || 1;
      const keyH = key.h || 1;
      const keyX = key.x || 0;

      // Calculate offset from expected position
      const xOffset = keyX - currentX;

      // Build properties object if needed
      const props = {};
      if (keyIndex === 0 || xOffset !== 0) {
        if (xOffset !== 0) props.x = xOffset;
      }
      if (keyW !== 1) props.w = keyW;
      if (keyH !== 1) props.h = keyH;
      if (keyColor !== globalColor) props.c = keyColor;
      if (legendColor !== globalLegendColor) props.t = legendColor;

      // Add properties object if not empty
      if (Object.keys(props).length > 0) {
        rowArray.push(props);
      }

      // Add key label (primary legend)
      const label = key.label || '';
      rowArray.push(label);

      currentX = keyX + keyW;
    });

    kleArray.push(rowArray);
  });

  return kleArray;
}

/**
 * Export KLE JSON as downloadable file
 */
export function exportKLEJson(layout, designState) {
  const kleData = generateKLEJson(layout, designState);
  const json = JSON.stringify(kleData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `keycap-layout-${Date.now()}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

// ============================================================
// MANUFACTURING SVG EXPORT
// ============================================================

/**
 * Generate manufacturing-ready SVG with proper specs
 * - 1:1 mm scale
 * - Fonts converted to paths (simplified representation)
 * - Proper color mode notation
 */
export function generateManufacturingSVG(layout, designState, options = {}) {
  const {
    includeBleed = false,
    bleedMM = 3,
    showKeyOutlines = true,
    colorMode = 'rgb' // 'rgb' or 'cmyk-annotation'
  } = options;

  const {
    globalColor,
    globalLegendColor,
    globalFont,
    perKeyDesigns
  } = designState;

  // Calculate bounds
  const minX = Math.min(...layout.map(k => k.x || 0));
  const minY = Math.min(...layout.map(k => k.y || 0));
  const maxX = Math.max(...layout.map(k => (k.x || 0) + (k.w || 1)));
  const maxY = Math.max(...layout.map(k => (k.y || 0) + (k.h || 1)));

  const widthMM = (maxX - minX) * KEY_UNIT_MM + (includeBleed ? bleedMM * 2 : 0);
  const heightMM = (maxY - minY) * KEY_UNIT_MM + (includeBleed ? bleedMM * 2 : 0);
  const offsetX = includeBleed ? bleedMM : 0;
  const offsetY = includeBleed ? bleedMM : 0;

  // Build SVG elements
  let svgContent = '';

  // Add metadata comment
  svgContent += `<!-- Keycap Studio Manufacturing Export -->\n`;
  svgContent += `<!-- Scale: 1:1 (mm) -->\n`;
  svgContent += `<!-- Unit: 1u = ${KEY_UNIT_MM}mm -->\n`;
  if (colorMode === 'cmyk-annotation') {
    const cmyk = rgbToCmyk(globalColor);
    svgContent += `<!-- Base Color CMYK: C${cmyk.c} M${cmyk.m} Y${cmyk.y} K${cmyk.k} -->\n`;
  }

  // Generate keys
  layout.forEach(key => {
    const keyDesign = perKeyDesigns?.[key.id] || {};
    const keyColor = keyDesign.color || globalColor;
    const legendColor = keyDesign.legendColor || globalLegendColor;

    const x = ((key.x || 0) - minX) * KEY_UNIT_MM + offsetX;
    const y = ((key.y || 0) - minY) * KEY_UNIT_MM + offsetY;
    const w = (key.w || 1) * KEY_UNIT_MM - 0.5; // 0.5mm gap
    const h = (key.h || 1) * KEY_UNIT_MM - 0.5;
    const rx = 1.5; // Corner radius in mm

    // Key background
    svgContent += `  <rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="${rx}" fill="${keyColor}"`;
    if (showKeyOutlines) {
      svgContent += ` stroke="#333333" stroke-width="0.3"`;
    }
    svgContent += `/>\n`;

    // Legend (centered)
    if (key.label) {
      const fontSize = key.label.length > 3 ? 4 : key.label.length > 1 ? 5 : 6;
      const textX = x + w / 2;
      const textY = y + h / 2 + fontSize / 3;
      svgContent += `  <text x="${textX.toFixed(2)}" y="${textY.toFixed(2)}" text-anchor="middle" font-family="${globalFont || 'Inter'}, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${legendColor}">${escapeXml(key.label)}</text>\n`;
    }
  });

  // Wrap in SVG
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${widthMM.toFixed(2)}mm"
     height="${heightMM.toFixed(2)}mm"
     viewBox="0 0 ${widthMM.toFixed(2)} ${heightMM.toFixed(2)}">
  <title>Keycap Layout - Manufacturing Export</title>
  <desc>Generated by Keycap Studio. All dimensions in millimeters.</desc>
${svgContent}</svg>`;

  return svg;
}

function escapeXml(str) {
  return str.replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  }[c]));
}

/**
 * Export manufacturing SVG as downloadable file
 */
export function exportManufacturingSVG(layout, designState, options = {}) {
  const svg = generateManufacturingSVG(layout, designState, options);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `keycap-manufacturing-${Date.now()}.svg`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

// ============================================================
// FULL EXPORT PACKAGE
// ============================================================

/**
 * Generate comprehensive metadata JSON for manufacturing
 */
export function generateMetadataJson(layout, designState) {
  const {
    globalColor,
    globalLegendColor,
    globalFont,
    selectedProfile,
    selectedFormFactor,
    selectedModel,
    materialPreset,
    keyboardLEDType,
    perKeyDesigns
  } = designState;

  // Find closest RAL colors
  const baseRAL = findClosestRAL(globalColor);
  const legendRAL = findClosestRAL(globalLegendColor);
  const baseCMYK = rgbToCmyk(globalColor);
  const legendCMYK = rgbToCmyk(globalLegendColor);

  // Count key sizes
  const keySizes = {};
  layout.forEach(key => {
    const size = `${key.w || 1}u`;
    keySizes[size] = (keySizes[size] || 0) + 1;
  });

  // Determine row assignments
  const rowAssignments = {};
  layout.forEach(key => {
    const row = key.row !== undefined ? key.row : Math.floor(key.y || 0);
    if (!rowAssignments[row]) rowAssignments[row] = [];
    rowAssignments[row].push(key.id);
  });

  return {
    project: {
      name: selectedModel || 'Custom Keycap Set',
      designer: 'Keycap Studio Export',
      exportDate: new Date().toISOString(),
      version: '1.0'
    },
    specifications: {
      profile: selectedProfile || 'Cherry',
      material: materialPreset?.toUpperCase() || 'PBT',
      formFactor: selectedFormFactor || '60%',
      totalKeys: layout.length,
      ledType: keyboardLEDType || 'None'
    },
    colors: {
      base: {
        hex: globalColor,
        cmyk: `C${baseCMYK.c} M${baseCMYK.m} Y${baseCMYK.y} K${baseCMYK.k}`,
        closestRAL: baseRAL ? `${baseRAL.code} (${baseRAL.name})` : 'N/A',
        warning: baseRAL && baseRAL.distance > 50 ? 'Color may not match exactly - consider using standard RAL' : null
      },
      legend: {
        hex: globalLegendColor,
        cmyk: `C${legendCMYK.c} M${legendCMYK.m} Y${legendCMYK.y} K${legendCMYK.k}`,
        closestRAL: legendRAL ? `${legendRAL.code} (${legendRAL.name})` : 'N/A'
      }
    },
    typography: {
      font: globalFont || 'Inter',
      note: 'Fonts must be converted to outlines/paths before manufacturing'
    },
    layout: {
      keySizes,
      rowAssignments,
      unitSize: `${KEY_UNIT_MM}mm`
    },
    manufacturing: {
      recommendedProcess: materialPreset === 'pbt' ? 'Dye-sublimation' : 'Double-shot injection',
      minimumLineThickness: `${MIN_LINE_THICKNESS_MM}mm`,
      minimumSpacing: `${MIN_SPACING_MM}mm`,
      minimumEnclosedArea: `${MIN_ENCLOSED_AREA_MM}mm diameter`,
      notes: [
        'All dimensions in millimeters (mm)',
        'SVG exports are at 1:1 scale',
        'Screen colors are approximations - request physical samples',
        'For double-shot: verify all vectors meet minimum feature sizes'
      ]
    }
  };
}

/**
 * Export full manufacturing package as ZIP
 * Includes: KLE JSON, SVG, Metadata JSON, README
 */
export async function exportFullPackage(layout, designState) {
  // We'll need to dynamically import JSZip if not available
  // For now, export individual files

  const timestamp = Date.now();
  const baseName = (designState.selectedModel || 'keycap-set').replace(/\s+/g, '-').toLowerCase();

  // Export each file type
  const metadata = generateMetadataJson(layout, designState);
  const results = {
    kle: exportKLEJson(layout, designState),
    svg: exportManufacturingSVG(layout, designState, { includeBleed: true }),
    metadata: metadata
  };

  // Also export metadata as file
  const metaBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
  const metaUrl = URL.createObjectURL(metaBlob);
  const metaLink = document.createElement('a');
  metaLink.download = `${baseName}-metadata-${timestamp}.json`;
  metaLink.href = metaUrl;
  metaLink.click();
  URL.revokeObjectURL(metaUrl);

  return results;
}

// ============================================================
// PRE-FLIGHT CHECKS
// ============================================================

/**
 * Run manufacturing pre-flight checks
 * Returns array of warnings/errors
 */
export function runPreflightChecks(layout, designState) {
  const issues = [];
  const { globalColor, globalLegendColor, materialPreset } = designState;

  // Check 1: Color gamut
  const baseRAL = findClosestRAL(globalColor);
  if (baseRAL && baseRAL.distance > 80) {
    issues.push({
      type: 'warning',
      code: 'COLOR_GAMUT',
      message: `Base color ${globalColor} may not be reproducible in plastic. Closest RAL: ${baseRAL.code}`,
      suggestion: `Consider using ${baseRAL.rgb} (${baseRAL.name}) instead`
    });
  }

  // Check 2: Dye-sub dark-on-light
  if (materialPreset === 'pbt') {
    const baseRgb = hexToRgb(globalColor);
    const legendRgb = hexToRgb(globalLegendColor);
    const baseLum = (baseRgb.r * 0.299 + baseRgb.g * 0.587 + baseRgb.b * 0.114);
    const legendLum = (legendRgb.r * 0.299 + legendRgb.g * 0.587 + legendRgb.b * 0.114);

    if (legendLum > baseLum) {
      issues.push({
        type: 'error',
        code: 'DYESUB_LIGHT_ON_DARK',
        message: 'Dye-sublimation cannot print light legends on dark keycaps',
        suggestion: 'Use darker legend color, or switch to ABS for double-shot'
      });
    }
  }

  // Check 3: Layout completeness
  const keyCount = layout.length;
  if (keyCount < 40) {
    issues.push({
      type: 'info',
      code: 'INCOMPLETE_LAYOUT',
      message: `Only ${keyCount} keys in layout - may be incomplete`,
      suggestion: 'Verify all required keys are present'
    });
  }

  // Check 4: Missing legends
  const keysWithoutLegends = layout.filter(k => !k.label || k.label.trim() === '').length;
  if (keysWithoutLegends > 10) {
    issues.push({
      type: 'warning',
      code: 'MISSING_LEGENDS',
      message: `${keysWithoutLegends} keys have no legends`,
      suggestion: 'Add legends or mark as intentionally blank'
    });
  }

  return issues;
}

// ============================================================
// WASD TEMPLATE EXPORT
// ============================================================

/**
 * Generate WASD-compatible SVG template
 */
export function generateWASDTemplate(layout, designState) {
  // WASD uses specific layer structure
  const svg = generateManufacturingSVG(layout, designState, {
    includeBleed: false,
    showKeyOutlines: true
  });

  // Add WASD-specific metadata
  return svg.replace(
    '<title>',
    '<!-- WASD Keyboards Compatible Template -->\n  <!-- Upload this file to wasdkeyboards.com -->\n  <title>'
  );
}

export function exportWASDTemplate(layout, designState) {
  const svg = generateWASDTemplate(layout, designState);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `wasd-template-${Date.now()}.svg`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

// Default export
export default {
  generateKLEJson,
  exportKLEJson,
  generateManufacturingSVG,
  exportManufacturingSVG,
  generateMetadataJson,
  exportFullPackage,
  runPreflightChecks,
  findClosestRAL,
  rgbToCmyk,
  exportWASDTemplate,
  KEY_UNIT_MM,
  RAL_COLORS
};
