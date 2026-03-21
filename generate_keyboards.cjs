const fs = require('fs');

const database = [];

// Helper to add models easily
function addModels(brand, series, common, modelsList) {
  modelsList.forEach(m => {
    let id = `${brand}-${m.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    database.push({
      id,
      brand,
      series: m.series || series,
      model: m.name,
      formFactor: m.ff || common.ff,
      percentage: m.sz || common.sz,
      keyCount: m.keys || common.keys,
      layout: m.layout || common.layout || 'ANSI',
      profile: m.profile || common.profile || 'OEM',
      ledType: m.led || common.led || 'North-facing RGB',
      ledDirection: (m.led || common.led || 'North-facing RGB').includes('South') ? 'South' : 'North',
      hotswap: m.hot !== undefined ? m.hot : (common.hot !== undefined ? common.hot : false),
      switchType: m.sw || common.sw || 'Cherry MX',
      description: m.desc || common.desc || `A premium mechanical keyboard by ${brand}.`
    });
  });
}

// 1. Keychron
addModels('Keychron', 'Q Series', 
  { profile: 'OSA', led: 'South-facing RGB', hot: true, sw: 'Gateron G Pro', desc: 'Premium full-metal custom mechanical keyboard.' }, 
  [
    { name: 'Q1', ff: '75%', sz: '75%', keys: 82 },
    { name: 'Q1 Pro', ff: '75%', sz: '75%', keys: 81, sw: 'K Pro', profile: 'KSA' },
    { name: 'Q2', ff: '65%', sz: '65%', keys: 66 },
    { name: 'Q2 Pro', ff: '65%', sz: '65%', keys: 66, sw: 'K Pro' },
    { name: 'Q3', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'Q3 Pro', ff: 'TKL', sz: '80%', keys: 87, sw: 'K Pro' },
    { name: 'Q4', ff: '60%', sz: '60%', keys: 61 },
    { name: 'Q4 Pro', ff: '60%', sz: '60%', keys: 61, sw: 'K Pro' },
    { name: 'Q5', ff: '96%', sz: '96%', keys: 98 },
    { name: 'Q5 Pro', ff: '96%', sz: '96%', keys: 98, sw: 'K Pro' },
    { name: 'Q6', ff: '100%', sz: '100%', keys: 104 },
    { name: 'Q6 Pro', ff: '100%', sz: '100%', keys: 104, sw: 'K Pro' },
    { name: 'Q7', ff: '70%', sz: '70%', keys: 73 },
    { name: 'Q8', ff: 'Alice 65%', sz: '65%', keys: 68 },
    { name: 'Q9', ff: '40%', sz: '40%', keys: 45 },
    { name: 'Q10', ff: 'Alice 75%', sz: '75%', keys: 84 },
    { name: 'Q11', ff: 'Split 75%', sz: '75%', keys: 88 },
    { name: 'Q12', ff: '96% Southpaw', sz: '96%', keys: 98 },
    { name: 'Q13', ff: 'Alice 96%', sz: '96%', keys: 100 },
    { name: 'Q14', ff: 'Alice Southpaw', sz: '96%', keys: 100 },
    { name: 'Q15', ff: 'Ortho', sz: '60%', keys: 60 }
  ]
);

addModels('Keychron', 'V Series',
  { profile: 'OSA', led: 'South-facing RGB', hot: true, sw: 'Keychron K Pro', desc: 'Affordable custom mechanical keyboard.' },
  [
    { name: 'V1', ff: '75%', sz: '75%', keys: 82 },
    { name: 'V2', ff: '65%', sz: '65%', keys: 66 },
    { name: 'V3', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'V4', ff: '60%', sz: '60%', keys: 61 },
    { name: 'V5', ff: '96%', sz: '96%', keys: 98 },
    { name: 'V6', ff: '100%', sz: '100%', keys: 104 },
    { name: 'V7', ff: '70%', sz: '70%', keys: 73 },
    { name: 'V8', ff: 'Alice 65%', sz: '65%', keys: 68 },
    { name: 'V10', ff: 'Alice 75%', sz: '75%', keys: 84 }
  ]
);

addModels('Keychron', 'K Series',
  { profile: 'OEM', led: 'North-facing RGB', hot: true, sw: 'Gateron Mechanical', desc: 'Wireless mechanical keyboard for Mac and Windows.' },
  [
    { name: 'K1', ff: 'TKL Low Profile', sz: '80%', keys: 87, profile: 'Low Profile' },
    { name: 'K2', ff: '75%', sz: '75%', keys: 84 },
    { name: 'K2 Pro', ff: '75%', sz: '75%', keys: 84, led: 'South-facing RGB', profile: 'OSA' },
    { name: 'K3', ff: '75% Low Profile', sz: '75%', keys: 84, profile: 'Low Profile' },
    { name: 'K3 Pro', ff: '75% Low Profile', sz: '75%', keys: 84, led: 'South-facing RGB', profile: 'Low Profile' },
    { name: 'K4', ff: '96%', sz: '96%', keys: 100 },
    { name: 'K6', ff: '65%', sz: '65%', keys: 68 },
    { name: 'K6 Pro', ff: '65%', sz: '65%', keys: 68, led: 'South-facing RGB', profile: 'OSA' },
    { name: 'K7', ff: '65% Low Profile', sz: '65%', keys: 68, profile: 'Low Profile' },
    { name: 'K8', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'K8 Pro', ff: 'TKL', sz: '80%', keys: 87, led: 'South-facing RGB', profile: 'OSA' },
    { name: 'K10', ff: '100%', sz: '100%', keys: 104 },
    { name: 'K10 Pro', ff: '100%', sz: '100%', keys: 104, led: 'South-facing RGB', profile: 'OSA' }
  ]
);

addModels('Keychron', 'C & B Series',
  { profile: 'OEM', led: 'North-facing RGB', hot: true, sw: 'Keychron Mechanical', desc: 'Wired mechanical keyboard.' },
  [
    { name: 'C1', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'C2', ff: '100%', sz: '100%', keys: 104 },
    { name: 'C3 Pro', ff: 'TKL', sz: '80%', keys: 87, led: 'South-facing RGB' },
    { name: 'B1', ff: '60%', sz: '60%', keys: 61 },
    { name: 'B6', ff: '65%', sz: '65%', keys: 68 }
  ]
);

// 2. Razer
addModels('Razer', 'Huntsman',
  { profile: 'OEM', led: 'Per-key RGB', hot: false, sw: 'Razer Optical', desc: 'High-performance gaming keyboard with optical switches.' },
  [
    { name: 'Huntsman Mini', ff: '60%', sz: '60%', keys: 61 },
    { name: 'Huntsman Mini Analog', ff: '60%', sz: '60%', keys: 61, sw: 'Razer Analog Optical' },
    { name: 'Huntsman V2 TKL', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'Huntsman V2 Full Size', ff: '100%', sz: '100%', keys: 104 },
    { name: 'Huntsman V3 Pro TKL', ff: 'TKL', sz: '80%', keys: 87, sw: 'Razer Analog Gen-2' },
    { name: 'Huntsman V3 Pro', ff: '100%', sz: '100%', keys: 104, sw: 'Razer Analog Gen-2' }
  ]
);

addModels('Razer', 'BlackWidow & DeathStalker',
  { profile: 'OEM', led: 'Per-key RGB', hot: false, sw: 'Razer Mechanical', desc: 'Flagship mechanical gaming keyboard.' },
  [
    { name: 'BlackWidow V4', ff: '100%', sz: '100%', keys: 104 },
    { name: 'BlackWidow V4 Pro', ff: '100%', sz: '100%', keys: 109 },
    { name: 'BlackWidow V4 75%', ff: '75%', sz: '75%', keys: 82, hot: true },
    { name: 'BlackWidow V4 X', ff: '100%', sz: '100%', keys: 104 },
    { name: 'DeathStalker V2', ff: '100% Low Profile', sz: '100%', keys: 104, profile: 'Low Profile', sw: 'Razer Low-Profile Optical' },
    { name: 'DeathStalker V2 Pro TKL', ff: 'TKL Low Profile', sz: '80%', keys: 87, profile: 'Low Profile', sw: 'Razer Low-Profile Optical' }
  ]
);

// 3. Logitech
addModels('Logitech', 'G Series',
  { profile: 'OEM', led: 'Per-key RGB', hot: false, sw: 'Logitech GX', desc: 'Premium wireless and wired gaming keyboards.' },
  [
    { name: 'G Pro X', ff: 'TKL', sz: '80%', keys: 87, hot: true },
    { name: 'G Pro X TKL', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'G Pro X 60', ff: '60%', sz: '60%', keys: 61 },
    { name: 'G Pro X Superlight', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'G915', ff: '100% Low Profile', sz: '100%', keys: 109, profile: 'Low Profile', sw: 'Logitech GL' },
    { name: 'G915 TKL', ff: 'TKL Low Profile', sz: '80%', keys: 87, profile: 'Low Profile', sw: 'Logitech GL' },
    { name: 'G915 X', ff: '100% Low Profile', sz: '100%', keys: 109, profile: 'Low Profile', sw: 'Logitech GL' },
    { name: 'G815', ff: '100% Low Profile', sz: '100%', keys: 109, profile: 'Low Profile', sw: 'Logitech GL' },
    { name: 'G713', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'G413', ff: '100%', sz: '100%', keys: 104 },
    { name: 'G213', ff: '100%', sz: '100%', keys: 104, sw: 'Mech-Dome' },
    { name: 'G512', ff: '100%', sz: '100%', keys: 104 },
    { name: 'G513', ff: '100%', sz: '100%', keys: 104 },
    { name: 'G910', ff: '100%', sz: '100%', keys: 113, sw: 'Romer-G' },
    { name: 'G810', ff: '100%', sz: '100%', keys: 104, sw: 'Romer-G' }
  ]
);

// 4. Corsair
addModels('Corsair', 'K Series',
  { profile: 'OEM', led: 'Per-key RGB', hot: false, sw: 'Cherry MX / OPX', desc: 'High-end gaming keyboard with advanced RGB.' },
  [
    { name: 'K100 RGB', ff: '100%', sz: '100%', keys: 110, sw: 'Corsair OPX' },
    { name: 'K70 RGB Pro', ff: '100%', sz: '100%', keys: 104 },
    { name: 'K70 Pro Mini Wireless', ff: '60%', sz: '60%', keys: 61, hot: true },
    { name: 'K65 RGB Mini', ff: '60%', sz: '60%', keys: 61 },
    { name: 'K65 Plus', ff: '75%', sz: '75%', keys: 84 },
    { name: 'K65 Plus Wireless', ff: '75%', sz: '75%', keys: 84 },
    { name: 'K55 RGB Pro', ff: '100%', sz: '100%', keys: 110, sw: 'Rubber Dome' },
    { name: 'K60 RGB Pro', ff: '100%', sz: '100%', keys: 104, sw: 'Cherry Viola' },
    { name: 'K60 Pro TKL', ff: 'TKL', sz: '80%', keys: 87, sw: 'Corsair OPX' },
    { name: 'K63 Wireless', ff: 'TKL', sz: '80%', keys: 87 }
  ]
);

// 5. Ducky
addModels('Ducky', 'One 3 & Mecha',
  { profile: 'Cherry', led: 'North-facing RGB', hot: true, sw: 'Cherry MX', desc: 'Enthusiast-grade mechanical keyboard with excellent acoustics.' },
  [
    { name: 'One 3', ff: '100%', sz: '100%', keys: 104 },
    { name: 'One 3 Mini', ff: '60%', sz: '60%', keys: 61 },
    { name: 'One 3 SF', ff: '65%', sz: '65%', keys: 67 },
    { name: 'One 3 TKL', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'One 3 Full Size', ff: '100%', sz: '100%', keys: 104 },
    { name: 'One 3 Fuji', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'Shine 7', ff: '100%', sz: '100%', keys: 108, hot: false },
    { name: 'Mecha Mini', ff: '60%', sz: '60%', keys: 61, hot: false },
    { name: 'Mecha Pro SF', ff: '65%', sz: '65%', keys: 67, hot: false },
    { name: 'Year of the Rabbit', ff: '65%', sz: '65%', keys: 67 },
    { name: 'Year of the Dragon', ff: '60%', sz: '60%', keys: 61 }
  ]
);

// 6. Wooting
addModels('Wooting', 'HE Series',
  { profile: 'OEM', led: 'North-facing RGB', hot: true, sw: 'Lekker Hall-Effect', desc: 'Analog hall-effect gaming keyboard with rapid trigger.' },
  [
    { name: 'Wooting 60HE', ff: '60%', sz: '60%', keys: 61 },
    { name: 'Wooting 60HE+', ff: '60%', sz: '60%', keys: 61 },
    { name: 'Wooting 80HE', ff: '80%', sz: '80%', keys: 87, led: 'South-facing RGB' },
    { name: 'Wooting Two HE', ff: '100%', sz: '100%', keys: 104 },
    { name: 'Wooting One HE', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'Wooting Two HE ARM', ff: '100%', sz: '100%', keys: 104 }
  ]
);

// 7. GMMK / Glorious
addModels('Glorious', 'GMMK',
  { profile: 'OEM', led: 'South-facing RGB', hot: true, sw: 'Glorious Fox / Panda', desc: 'Modular mechanical gaming keyboard.' },
  [
    { name: 'GMMK Pro', ff: '75%', sz: '75%', keys: 82 },
    { name: 'GMMK 2 65%', ff: '65%', sz: '65%', keys: 67, led: 'North-facing RGB' },
    { name: 'GMMK 2 96%', ff: '96%', sz: '96%', keys: 99, led: 'North-facing RGB' },
    { name: 'GMMK Full Size', ff: '100%', sz: '100%', keys: 104, led: 'North-facing RGB' },
    { name: 'GMMK TKL', ff: 'TKL', sz: '80%', keys: 87, led: 'North-facing RGB' },
    { name: 'GMMK Compact', ff: '60%', sz: '60%', keys: 61, led: 'North-facing RGB' },
    { name: 'GMMK Numpad', ff: 'Numpad', sz: '20%', keys: 21 },
    { name: 'GPRO X 60', ff: '60%', sz: '60%', keys: 61 }
  ]
);

// 8. Drop
addModels('Drop', 'Signature',
  { profile: 'Drop Skylight', led: 'North-facing RGB', hot: true, sw: 'Halo True / Holy Panda', desc: 'Enthusiast mechanical keyboard with aluminum case.' },
  [
    { name: 'CTRL', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'CTRL V2', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'ALT', ff: '65%', sz: '65%', keys: 67 },
    { name: 'ALT V2', ff: '65%', sz: '65%', keys: 67 },
    { name: 'SHIFT', ff: '1800', sz: '96%', keys: 99 },
    { name: 'Sense75', ff: '75%', sz: '75%', keys: 84, led: 'South-facing RGB' },
    { name: 'Carina', ff: '60%', sz: '60%', keys: 61 },
    { name: 'Holy Panda X', ff: 'TKL', sz: '80%', keys: 87 }
  ]
);

// 9. Anne Pro
addModels('Obinslab', 'Anne Pro',
  { profile: 'OEM', led: 'North-facing RGB', hot: false, sw: 'Gateron / Kailh', desc: 'Compact wireless mechanical keyboard.' },
  [
    { name: 'Anne Pro 2', ff: '60%', sz: '60%', keys: 61 }
  ]
);

// 10. Leopold
addModels('Leopold', 'FC Series',
  { profile: 'Cherry', led: 'None', hot: false, sw: 'Cherry MX', desc: 'High-quality mechanical keyboard with sound-dampening pad.' },
  [
    { name: 'FC750R', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'FC900R', ff: '100%', sz: '100%', keys: 104 },
    { name: 'FC660M', ff: '65%', sz: '65%', keys: 66 },
    { name: 'FC980M', ff: '1800', sz: '96%', keys: 98 },
    { name: 'FC210TP', ff: 'Numpad', sz: '20%', keys: 21 }
  ]
);

// 11. Varmilo
addModels('Varmilo', 'VA Series',
  { profile: 'Cherry', led: 'North-facing RGB', hot: false, sw: 'Cherry MX / Varmilo EC', desc: 'Artistic mechanical keyboard with premium PBT keycaps.' },
  [
    { name: 'VA87M', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'VA108M', ff: '100%', sz: '100%', keys: 108 },
    { name: 'VEA108', ff: '100%', sz: '100%', keys: 108 },
    { name: 'VXH87', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'VEM87', ff: 'TKL', sz: '80%', keys: 87 }
  ]
);

// 12. NuPhy
addModels('NuPhy', 'Air & Halo',
  { profile: 'NuPhy', led: 'North-facing RGB', hot: true, sw: 'Gateron Low Profile / Baby Kangaroo', desc: 'Modern aesthetic wireless mechanical keyboard.' },
  [
    { name: 'Air75', ff: '75% Low Profile', sz: '75%', keys: 84 },
    { name: 'Air75 V2', ff: '75% Low Profile', sz: '75%', keys: 84 },
    { name: 'Air96', ff: '96% Low Profile', sz: '96%', keys: 100 },
    { name: 'Air96 V2', ff: '96% Low Profile', sz: '96%', keys: 100 },
    { name: 'Air60', ff: '60% Low Profile', sz: '60%', keys: 64 },
    { name: 'Air60 V2', ff: '60% Low Profile', sz: '60%', keys: 64 },
    { name: 'Field75', ff: '75%', sz: '75%', keys: 83 },
    { name: 'Halo65', ff: '65%', sz: '65%', keys: 67 },
    { name: 'Halo75', ff: '75%', sz: '75%', keys: 83 },
    { name: 'Halo96', ff: '96%', sz: '96%', keys: 99 }
  ]
);

// 13. Akko
addModels('Akko', 'B & MOD Series',
  { profile: 'ASA', led: 'North-facing RGB', hot: true, sw: 'Akko CS', desc: 'Colorful and budget-friendly custom keyboard.' },
  [
    { name: '3068B', ff: '65%', sz: '65%', keys: 68 },
    { name: '3098B', ff: '1800', sz: '96%', keys: 98 },
    { name: '5075B', ff: '75%', sz: '75%', keys: 82, led: 'South-facing RGB' },
    { name: '5087B', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'ACR Pro 68', ff: '65%', sz: '65%', keys: 68 },
    { name: 'MOD 007B', ff: '75%', sz: '75%', keys: 82, led: 'South-facing RGB' },
    { name: 'MOD 007B PC', ff: '75%', sz: '75%', keys: 82, led: 'South-facing RGB' },
    { name: 'Crystal', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'Midnight World Tour', ff: '100%', sz: '100%', keys: 108 }
  ]
);

// 14. Royal Kludge
addModels('Royal Kludge', 'RK Series',
  { profile: 'OEM', led: 'North-facing RGB', hot: true, sw: 'RK Switch', desc: 'Budget wireless mechanical keyboard.' },
  [
    { name: 'RK61', ff: '60%', sz: '60%', keys: 61 },
    { name: 'RK68', ff: '65%', sz: '65%', keys: 68 },
    { name: 'RK84', ff: '75%', sz: '75%', keys: 84 },
    { name: 'RK87', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'RK100', ff: '96%', sz: '96%', keys: 100 },
    { name: 'RK919', ff: '100%', sz: '100%', keys: 108 },
    { name: 'RK71', ff: '70%', sz: '70%', keys: 71 }
  ]
);

// 15. Redragon
addModels('Redragon', 'K Series',
  { profile: 'OEM', led: 'North-facing RGB', hot: true, sw: 'Outemu', desc: 'Affordable gaming mechanical keyboard.' },
  [
    { name: 'K552', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'K556', ff: '100%', sz: '100%', keys: 104 },
    { name: 'K580', ff: '100%', sz: '100%', keys: 104 },
    { name: 'K618', ff: '100% Low Profile', sz: '100%', keys: 104, profile: 'Low Profile' },
    { name: 'K630', ff: '60%', sz: '60%', keys: 61 },
    { name: 'K550', ff: '100%', sz: '100%', keys: 104 },
    { name: 'K551', ff: '100%', sz: '100%', keys: 104 }
  ]
);

// 16. SteelSeries
addModels('SteelSeries', 'Apex',
  { profile: 'OEM', led: 'Per-key RGB', hot: false, sw: 'OmniPoint Adjustable', desc: 'Premium gaming keyboard with adjustable actuation.' },
  [
    { name: 'Apex Pro', ff: '100%', sz: '100%', keys: 104 },
    { name: 'Apex Pro TKL', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'Apex Pro Mini', ff: '60%', sz: '60%', keys: 61 },
    { name: 'Apex 7', ff: '100%', sz: '100%', keys: 104, sw: 'SteelSeries QX2' },
    { name: 'Apex 7 TKL', ff: 'TKL', sz: '80%', keys: 87, sw: 'SteelSeries QX2' },
    { name: 'Apex 5', ff: '100%', sz: '100%', keys: 104, sw: 'Hybrid Mechanical' },
    { name: 'Apex 3', ff: '100%', sz: '100%', keys: 104, sw: 'Whisper Quiet Switch' }
  ]
);

// 17. HyperX
addModels('HyperX', 'Alloy',
  { profile: 'OEM', led: 'Per-key RGB', hot: false, sw: 'HyperX Mechanical', desc: 'Durable gaming keyboard with aircraft-grade aluminum.' },
  [
    { name: 'Alloy FPS Pro', ff: 'TKL', sz: '80%', keys: 87, led: 'Red LED' },
    { name: 'Alloy Origins', ff: '100%', sz: '100%', keys: 104 },
    { name: 'Alloy Origins 60', ff: '60%', sz: '60%', keys: 61 },
    { name: 'Alloy Origins Core', ff: 'TKL', sz: '80%', keys: 87 },
    { name: 'Alloy Elite 2', ff: '100%', sz: '100%', keys: 104 }
  ]
);

// 18. Asus ROG
addModels('Asus', 'ROG',
  { profile: 'OEM', led: 'Per-key RGB', hot: true, sw: 'ROG NX / RX', desc: 'High-end Republic of Gamers mechanical keyboard.' },
  [
    { name: 'Falchion', ff: '65%', sz: '65%', keys: 68 },
    { name: 'Falchion RX', ff: '65% Low Profile', sz: '65%', keys: 68, profile: 'Low Profile' },
    { name: 'Strix Scope', ff: '100%', sz: '100%', keys: 104, hot: false },
    { name: 'Strix Scope TKL', ff: 'TKL', sz: '80%', keys: 84, hot: false },
    { name: 'Strix Flare', ff: '100%', sz: '100%', keys: 104, hot: false },
    { name: 'Claymore II', ff: '100% Modular', sz: '100%', keys: 104 }
  ]
);

// 19. Endgame Gear
addModels('Endgame Gear', 'KB Series',
  { profile: 'Cherry', led: 'North-facing RGB', hot: true, sw: 'Hall-Effect', desc: 'Premium esports magnetic keyboard.' },
  [
    { name: 'KB65HE', ff: '65%', sz: '65%', keys: 65 },
    { name: 'KB68HE', ff: '65%', sz: '65%', keys: 68 }
  ]
);


const uniqueBrands = [...new Set(database.map(d => d.brand))].sort();

const fileContent = `export const BRANDS = ${JSON.stringify(uniqueBrands, null, 2)};

export const KEYBOARDS = ${JSON.stringify(database, null, 2)};

export const FORM_FACTORS = ['100%', '96%', 'TKL', '75%', '65%', '60%', '40%'];
export const PROFILES = ['Cherry', 'OEM', 'SA', 'DSA', 'XDA', 'KAT', 'MT3', 'Low Profile', 'OSA', 'KSA'];
export const LAYOUTS = ['ANSI', 'ISO', 'JIS', 'Tsangan', 'Alice'];
`;

fs.writeFileSync('./src/data/keyboards.js', fileContent);
console.log('Successfully generated keyboards.js with', database.length, 'models.');
