const fs = require('fs');

const data = fs.readFileSync('src/data/keyboards.js', 'utf8');

const modelsMatch = data.match(/export const KEYBOARDS = (\[[\s\S]*?\]);\n/);
if(!modelsMatch) {
  console.log("Could not find KEYBOARDS array");
  process.exit(1);
}
const models = JSON.parse(modelsMatch[1]);

if(!fs.existsSync('src/data/keyboards')) {
  fs.mkdirSync('src/data/keyboards');
}

const brands = [...new Set(models.map(m => m.brand))];
const indexSwitches = [];

brands.forEach(b => {
  const safeName = b.toLowerCase().replace(/[^a-z0-9]/g, '');
  const brandModels = models.filter(m => m.brand === b);
  fs.writeFileSync(`src/data/keyboards/${safeName}.js`, `export default ${JSON.stringify(brandModels, null, 2)};`);
  
  indexSwitches.push(`    case '${safeName}': return (await import('./${safeName}')).default;`);
});

const indexContent = `
export const BRANDS = ${JSON.stringify(brands.sort(), null, 2)};
export const FORM_FACTORS = ['100%', '96%', 'TKL', '75%', '65%', '60%', '40%'];
export const PROFILES = ['Cherry', 'OEM', 'SA', 'DSA', 'XDA', 'KAT', 'MT3', 'Low Profile', 'OSA', 'KSA'];
export const LAYOUTS = ['ANSI', 'ISO', 'JIS', 'Tsangan', 'Alice'];

export const getBrandModels = async (brand) => {
  const safeName = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  switch(safeName) {
${indexSwitches.join('\n')}
    default: return [];
  }
};
`;

fs.writeFileSync('src/data/keyboards/index.js', indexContent);
console.log('Database successfully split by brand.');
