const fs = require('fs');

const brandsData = {
  "Keychron": {
    series: ["Q", "Q Pro", "Q Max", "V", "V Max", "K", "K Pro", "K Max", "C", "C Pro", "Lemokey", "S"],
    models: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"],
    formFactors: {"1": "75%", "2": "75%", "3": "TKL", "4": "60%", "5": "65%", "6": "65%", "7": "65%", "8": "65%", "9": "75%", "10": "Alice", "11": "Alice", "12": "60%", "13": "Numpad", "14": "Alice"}
  },
  "Ducky": {
    series: ["One 2", "One 3"],
    models: ["Mini", "SF", "TKL", "Full", "Pro"],
    themes: ["Classic", "Daybreak", "Matcha", "Yellow", "Fuji", "Cosmic Blue", "Pure White", "Tuxedo"],
    factors: {"Mini": "60%", "SF": "65%", "TKL": "TKL", "Full": "100%", "Pro": "65%"}
  },
  "Leopold": {
    series: ["FC"],
    models: ["660M", "660C", "750R", "900R", "980M", "980C", "650MDS", "730M"],
    variants: ["BT", "PD", "OE", "Standard", "V2"],
    colors: ["Black", "White", "Ash Yellow", "Blue Grey", "Sweden", "Light Pink"]
  },
  "Filco": {
    series: ["Majestouch 2", "Majestouch 3", "Convertible 2", "Convertible 3", "MINILA-R"],
    sizes: ["Full", "TKL", "60%"],
    variants: ["Ninja", "HAKUA", "Camouflage", "Lumi S", "SS", "SC"]
  },
  "Varmilo": {
    series: ["VA", "MA", "Minilo", "Sword"],
    sizes: ["68", "87", "104", "108", "81"],
    themes: ["Sea Melody", "Koi", "Panda", "Sakura", "Forest Fairy", "Midnight", "Vintage Days"]
  },
  "Akko": {
    series: ["3068B", "3084B", "3098B", "5075B", "SPR67", "ACR Pro"],
    themes: ["Black&Cyan", "Black&Pink", "Blue on White", "Prunus Lannesiana", "Dracula Castle", "SpongeBob", "Cinnamoroll"]
  },
  "Epomaker": {
    series: ["TH80", "TH96", "RT100", "EK68", "Shadow-X", "Aura75"],
    variants: ["Pro", "Regular", "SE"]
  },
  "Topre": {
    series: ["Realforce R2", "Realforce R3", "Realforce R3S"],
    sizes: ["Full", "TKL"],
    weights: ["30g", "45g", "55g", "Variable"]
  }
};

let additionalKeyboards = [];
let idCounter = 3000;

function addKb(brand, modelName, factor) {
  additionalKeyboards.push({
    id: idCounter++,
    brand,
    name: brand + " " + modelName,
    formFactor: factor || "TKL",
    layout: "ANSI",
    profile: "OEM"
  });
}

// Generate Ducky
for(let series of brandsData.Ducky.series) {
  for(let model of brandsData.Ducky.models) {
    for(let theme of brandsData.Ducky.themes) {
      addKb("Ducky", `${series} ${model} ${theme}`, brandsData.Ducky.factors[model]);
    }
  }
}
// Generate Keychron
for(let series of brandsData.Keychron.series) {
  for(let model of brandsData.Keychron.models) {
    let factor = brandsData.Keychron.formFactors[model] || "TKL";
    addKb("Keychron", `${series}${model}`, factor);
  }
}
// Generate Leopold
for(let model of brandsData.Leopold.models) {
  for(let variant of brandsData.Leopold.variants) {
    for(let color of brandsData.Leopold.colors) {
      addKb("Leopold", `FC${model} ${variant} ${color}`, model.includes("660") ? "65%" : model.includes("750") ? "TKL" : model.includes("980") ? "1800" : "100%");
    }
  }
}
// Generate Filco
for(let series of brandsData.Filco.series) {
  for(let size of brandsData.Filco.sizes) {
    for(let variant of brandsData.Filco.variants) {
      addKb("Filco", `${series} ${size} ${variant}`, size === "Full" ? "100%" : size);
    }
  }
}
// Generate Varmilo
for(let series of brandsData.Varmilo.series) {
  for(let size of brandsData.Varmilo.sizes) {
    for(let theme of brandsData.Varmilo.themes) {
      addKb("Varmilo", `${series}${size} ${theme}`, size.includes("68") ? "65%" : size.includes("87") ? "TKL" : "100%");
    }
  }
}
// Generate Akko
for(let series of brandsData.Akko.series) {
  for(let theme of brandsData.Akko.themes) {
    addKb("Akko", `${series} ${theme}`, series.includes("68") ? "65%" : series.includes("84") ? "75%" : series.includes("98") ? "1800" : "75%");
  }
}
// Generate Epomaker
for(let series of brandsData.Epomaker.series) {
  for(let variant of brandsData.Epomaker.variants) {
    addKb("Epomaker", `${series} ${variant}`, series.includes("80") ? "75%" : series.includes("96") ? "96%" : "65%");
  }
}
// Generate Topre
for(let series of brandsData.Topre.series) {
  for(let size of brandsData.Topre.sizes) {
    for(let weight of brandsData.Topre.weights) {
      addKb("Topre", `${series} ${size} ${weight}`, size === "Full" ? "100%" : "TKL");
    }
  }
}

const keyboardsFile = fs.readFileSync('src/data/keyboards.js', 'utf8');

const insertStr = additionalKeyboards.map(kb => JSON.stringify(kb, null, 2)).join(',\n') + ',\n';
const updatedFile = keyboardsFile.replace('export const KEYBOARDS = [', 'export const KEYBOARDS = [\n' + insertStr);

const brandsMatch = updatedFile.match(/export const BRANDS = \[([\s\S]*?)\];/);
if(brandsMatch) {
  let existingBrands = JSON.parse('[' + brandsMatch[1] + ']');
  let mergedBrands = [...new Set([...existingBrands, ...new Set(additionalKeyboards.map(k=>k.brand))])].sort();
  let finalFile = updatedFile.replace(/export const BRANDS = \[([\s\S]*?)\];/, `export const BRANDS = ${JSON.stringify(mergedBrands, null, 2)};`);
  fs.writeFileSync('src/data/keyboards.js', finalFile);
  console.log('Added ' + additionalKeyboards.length + ' keyboards to the database.');
}
