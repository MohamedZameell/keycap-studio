
export const BRANDS = [
  // Tier 1 - Mainstream/Gaming
  "Keychron",
  "Lemokey",
  "Logitech",
  "Razer",
  "Corsair",
  "SteelSeries",
  "HyperX",
  "ASUS ROG",
  "Ducky",
  "Leopold",

  // Tier 2 - Enthusiast
  "Wooting",
  "Glorious",
  "Akko",
  "NuPhy",
  "Epomaker",
  "Drop",
  "MonsGeek",
  "KBDfans",

  // Tier 3 - Budget/Chinese
  "Redragon",
  "Ajazz",
  "AULA",
  "VGN",
  "Womier",
  "Gamakay",
  "KiiBOOM",
  "Cidoo",
  "Skyloong",
  "FL-Esports",
  "MelGeek",
  "Attack Shark",
  "Royal Kludge",

  // Tier 4 - Premium/Custom
  "Angry Miao",
  "Mode",
  "Higround",
  "Rama Works",
  "Keycult",
  "Filco",

  // Other
  "Varmilo",
  "Obinslab",
  "Endgame Gear"
];

export const FORM_FACTORS = ['100%', '96%', 'TKL', '75%', '70%', '65%', '60%', '40%', 'Alice'];
export const PROFILES = ['Cherry', 'OEM', 'SA', 'DSA', 'XDA', 'KAT', 'MT3', 'Low Profile', 'OSA', 'KSA', 'ASA'];
export const LAYOUTS = ['ANSI', 'ISO', 'JIS', 'Tsangan', 'Alice', 'ANSI/ISO'];

export const SWITCH_TYPES = [
  'MX compatible',
  'Hall Effect',
  'Optical',
  'Inductive',
  'Low Profile',
  'Topre',
  'proprietary'
];

export const MOUNT_TYPES = ['gasket', 'tray', 'top', 'leaf spring', 'integrated'];
export const CONNECTIVITY = ['wired', 'wireless', 'both'];

export const getBrandModels = async (brand) => {
  const safeName = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  switch(safeName) {
    // Tier 1 - Mainstream/Gaming
    case 'keychron': return (await import('./keychron')).default;
    case 'lemokey': return (await import('./lemokey')).default;
    case 'logitech': return (await import('./logitech')).default;
    case 'razer': return (await import('./razer')).default;
    case 'corsair': return (await import('./corsair')).default;
    case 'steelseries': return (await import('./steelseries')).default;
    case 'hyperx': return (await import('./hyperx')).default;
    case 'asusrog': return (await import('./asus')).default;
    case 'ducky': return (await import('./ducky')).default;
    case 'leopold': return (await import('./leopold')).default;

    // Tier 2 - Enthusiast
    case 'wooting': return (await import('./wooting')).default;
    case 'glorious': return (await import('./glorious')).default;
    case 'akko': return (await import('./akko')).default;
    case 'nuphy': return (await import('./nuphy')).default;
    case 'epomaker': return (await import('./epomaker')).default;
    case 'drop': return (await import('./drop')).default;
    case 'monsgeek': return (await import('./monsgeek')).default;
    case 'kbdfans': return (await import('./kbdfans')).default;

    // Tier 3 - Budget/Chinese
    case 'redragon': return (await import('./redragon')).default;
    case 'ajazz': return (await import('./ajazz')).default;
    case 'aula': return (await import('./aula')).default;
    case 'vgn': return (await import('./vgn')).default;
    case 'womier': return (await import('./womier')).default;
    case 'gamakay': return (await import('./gamakay')).default;
    case 'kiiboom': return (await import('./kiiboom')).default;
    case 'cidoo': return (await import('./cidoo')).default;
    case 'skyloong': return (await import('./skyloong')).default;
    case 'flesports': return (await import('./flesports')).default;
    case 'melgeek': return (await import('./melgeek')).default;
    case 'attackshark': return (await import('./attackshark')).default;
    case 'royalkludge': return (await import('./royalkludge')).default;

    // Tier 4 - Premium/Custom
    case 'angrymiao': return (await import('./angrymiao')).default;
    case 'mode': return (await import('./mode')).default;
    case 'higround': return (await import('./higround')).default;
    case 'ramaworks': return (await import('./ramaworks')).default;
    case 'keycult': return (await import('./keycult')).default;
    case 'filco': return (await import('./filco')).default;

    // Other
    case 'varmilo': return (await import('./varmilo')).default;
    case 'obinslab': return (await import('./obinslab')).default;
    case 'endgamegear': return (await import('./endgamegear')).default;

    // Legacy alias
    case 'asus': return (await import('./asus')).default;

    default: return [];
  }
};
