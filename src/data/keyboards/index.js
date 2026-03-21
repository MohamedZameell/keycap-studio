
export const BRANDS = [
  "Akko",
  "Asus",
  "Corsair",
  "Drop",
  "Ducky",
  "Endgame Gear",
  "Glorious",
  "HyperX",
  "Keychron",
  "Leopold",
  "Logitech",
  "NuPhy",
  "Obinslab",
  "Razer",
  "Redragon",
  "Royal Kludge",
  "SteelSeries",
  "Varmilo",
  "Wooting"
];
export const FORM_FACTORS = ['100%', '96%', 'TKL', '75%', '65%', '60%', '40%'];
export const PROFILES = ['Cherry', 'OEM', 'SA', 'DSA', 'XDA', 'KAT', 'MT3', 'Low Profile', 'OSA', 'KSA'];
export const LAYOUTS = ['ANSI', 'ISO', 'JIS', 'Tsangan', 'Alice'];

export const getBrandModels = async (brand) => {
  const safeName = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  switch(safeName) {
    case 'keychron': return (await import('./keychron')).default;
    case 'razer': return (await import('./razer')).default;
    case 'logitech': return (await import('./logitech')).default;
    case 'corsair': return (await import('./corsair')).default;
    case 'ducky': return (await import('./ducky')).default;
    case 'wooting': return (await import('./wooting')).default;
    case 'glorious': return (await import('./glorious')).default;
    case 'drop': return (await import('./drop')).default;
    case 'obinslab': return (await import('./obinslab')).default;
    case 'leopold': return (await import('./leopold')).default;
    case 'varmilo': return (await import('./varmilo')).default;
    case 'nuphy': return (await import('./nuphy')).default;
    case 'akko': return (await import('./akko')).default;
    case 'royalkludge': return (await import('./royalkludge')).default;
    case 'redragon': return (await import('./redragon')).default;
    case 'steelseries': return (await import('./steelseries')).default;
    case 'hyperx': return (await import('./hyperx')).default;
    case 'asus': return (await import('./asus')).default;
    case 'endgamegear': return (await import('./endgamegear')).default;
    default: return [];
  }
};
