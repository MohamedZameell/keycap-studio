// Utility to generate a row of standard 1u keys
const generateRow = (keys, y, startX = 0, rowIdx = 0) => {
  let currentX = startX;
  return keys.map((label, idx) => {
    // Basic standard width is 1u. 
    // We handle varying widths manually later if provided as object.
    const w = label.w !== undefined ? label.w : 1;
    const keyDef = {
      id: `key-R${rowIdx}-${idx}-${label.id !== undefined ? label.id : label}`,
      label: label.label !== undefined ? label.label : label,
      row: rowIdx,
      col: idx,
      x: currentX,
      y,
      w,
      h: label.h !== undefined ? label.h : 1,
      isSpecial: label.w > 1 || label.h > 1 || ['Esc', 'Fn', 'Win', 'Alt', 'Ctrl', 'Menu', 'PgUp', 'PgDn', 'Home', 'End', 'Ins', 'Del'].includes(label.label || label)
    };
    currentX += w;
    return keyDef;
  });
};

// Common ANSI QWERTY rows
const rowEscF = [
  {label: 'Esc'}, {label: 'F1', xOffset: 1}, 'F2', 'F3', 'F4',
  {label: 'F5', xOffset: 0.5}, 'F6', 'F7', 'F8',
  {label: 'F9', xOffset: 0.5}, 'F10', 'F11', 'F12'
];

const row1 = ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', {label: 'Backspace', w: 2}];
const row2 = [{label: 'Tab', w: 1.5}, 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', {label: '\\', w: 1.5}];
const row3 = [{label: 'Caps Lock', w: 1.75}, 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", {label: 'Enter', w: 2.25}];
const row4 = [{label: 'Shift', w: 2.25}, 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', {label: 'Shift', w: 2.75}];
const row5 = [{label: 'Ctrl', w: 1.25}, {label: 'Win', w: 1.25}, {label: 'Alt', w: 1.25}, {label: '', w: 6.25}, {label: 'Alt', w: 1.25}, {label: 'Win', w: 1.25}, {label: 'Menu', w: 1.25}, {label: 'Ctrl', w: 1.25}];

function build60Percent() {
  const keys = [];
  keys.push(...generateRow([{label: 'Esc'}, ...row1.slice(1)], 0, 0, 0));
  keys.push(...generateRow(row2, 1, 0, 1));
  keys.push(...generateRow(row3, 2, 0, 2));
  keys.push(...generateRow(row4, 3, 0, 3));
  keys.push(...generateRow(row5, 4, 0, 4));
  return keys;
}

function buildTKL() {
  const keys = [];
  
  // F Row
  let fRow = [];
  fRow.push({id: 'Esc', label: 'Esc', row:0, col:0, x:0, y:0, w:1, h:1, isSpecial: true});
  fRow.push(...generateRow(['F1','F2','F3','F4'], 0, 2, 0));
  fRow.push(...generateRow(['F5','F6','F7','F8'], 0, 6.5, 0));
  fRow.push(...generateRow(['F9','F10','F11','F12'], 0, 11, 0));
  fRow.push(...generateRow(['PrtSc','ScrLk','Pause'], 0, 15.25, 0));
  keys.push(...fRow);

  // Main block + Nav block
  keys.push(...generateRow(row1, 1.25, 0, 1));
  keys.push(...generateRow(['Ins', 'Home', 'PgUp'], 1.25, 15.25, 1));

  keys.push(...generateRow(row2, 2.25, 0, 2));
  keys.push(...generateRow(['Del', 'End', 'PgDn'], 2.25, 15.25, 2));

  keys.push(...generateRow(row3, 3.25, 0, 3));

  keys.push(...generateRow(row4, 4.25, 0, 4));
  keys.push(...generateRow(['↑'], 4.25, 16.25, 4));

  keys.push(...generateRow(row5, 5.25, 0, 5));
  keys.push(...generateRow(['←','↓','→'], 5.25, 15.25, 5));

  return keys;
}

function buildFull100() {
  const keys = buildTKL();
  // Add numpad to TKL
  const offset = 18.5;
  keys.push(...generateRow(['NumLk', '/', '*', '-'], 1.25, offset, 1));
  keys.push(...generateRow(['7', '8', '9', {label: '+', h: 2}], 2.25, offset, 2));
  keys.push(...generateRow(['4', '5', '6'], 3.25, offset, 3));
  keys.push(...generateRow(['1', '2', '3', {label: 'Ent', h: 2}], 4.25, offset, 4));
  keys.push(...generateRow([{label: '0', w: 2}, '.'], 5.25, offset, 5));
  // Fix the tall keys Y positions since they span height: 2, 
  // GenerateRow assigns x and w, but doesn't handle visually pushing the next row.
  keys.forEach(k => {
    if (k.h > 1 && k.label === '+') k.y = 2.75 - 0.5; // Custom positioning for tall keys in 3D might be centered depending on anchor
  });
  return keys;
}

function build75Percent() {
  const keys = [];
  keys.push({id: 'Esc', label: 'Esc', row:0, col:0, x:0, y:0, w:1, h:1, isSpecial: true});
  keys.push(...generateRow(['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'], 0, 1, 0));
  keys.push({id: 'Del', label: 'Del', row:0, col:13, x:13, y:0, w:1, h:1, isSpecial: true});
  keys.push({id: 'Home', label: 'Home', row:0, col:14, x:14.25, y:0, w:1, h:1, isSpecial: true});

  keys.push(...generateRow(row1, 1, 0, 1));
  keys.push({id: 'PgUp', label: 'PgUp', row:1, col:15, x:15.25, y:1, w:1, h:1, isSpecial: true});

  keys.push(...generateRow(row2, 2, 0, 2));
  keys.push({id: 'PgDn', label: 'PgDn', row:2, col:15, x:15.25, y:2, w:1, h:1, isSpecial: true});

  keys.push(...generateRow(row3, 3, 0, 3));
  keys.push({id: 'End', label: 'End', row:3, col:14, x:15.25, y:3, w:1, h:1, isSpecial: true});

  const row4_75 = [{label: 'Shift', w: 2.25}, 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', {label: 'Shift', w: 1.75}, '↑'];
  keys.push(...generateRow(row4_75, 4, 0, 4));

  const row5_75 = [{label: 'Ctrl', w: 1.25}, {label: 'Win', w: 1.25}, {label: 'Alt', w: 1.25}, {label: '', w: 6.25}, {label: 'Alt', w: 1}, {label: 'Fn', w: 1}, {label: 'Ctrl', w: 1}, '←', '↓', '→'];
  keys.push(...generateRow(row5_75, 5, 0, 5));

  return keys;
}

function build65Percent() {
  const keys = [];
  keys.push(...generateRow([{label: 'Esc'}, ...row1.slice(1)], 0, 0, 0));
  keys.push({id: 'Del', label: 'Del', row:0, col:14, x:15, y:0, w:1, h:1, isSpecial: true});

  keys.push(...generateRow(row2, 1, 0, 1));
  keys.push({id: 'PgUp', label: 'PgUp', row:1, col:14, x:15, y:1, w:1, h:1, isSpecial: true});

  keys.push(...generateRow(row3, 2, 0, 2));
  keys.push({id: 'PgDn', label: 'PgDn', row:2, col:13, x:15, y:2, w:1, h:1, isSpecial: true});

  const row4_65 = [{label: 'Shift', w: 2.25}, 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', {label: 'Shift', w: 1.75}, '↑'];
  keys.push(...generateRow(row4_65, 3, 0, 3));

  const row5_65 = [{label: 'Ctrl', w: 1.25}, {label: 'Win', w: 1.25}, {label: 'Alt', w: 1.25}, {label: '', w: 6.25}, {label: 'Alt', w: 1}, {label: 'Fn', w: 1}, {label: 'Ctrl', w: 1}, '←', '↓', '→'];
  keys.push(...generateRow(row5_65, 4, 0, 4));

  return keys;
}

export const LAYOUT_TEMPLATES = {
  'FULL_100': buildFull100(),
  'TKL_80': buildTKL(),
  'SEVENTY_FIVE': build75Percent(),
  'SIXTY_FIVE': build65Percent(),
  'SIXTY': build60Percent()
};

export function getLayoutForFormFactor(formFactorString) {
  return LAYOUT_TEMPLATES[formFactorString] || LAYOUT_TEMPLATES['SIXTY'];
}
