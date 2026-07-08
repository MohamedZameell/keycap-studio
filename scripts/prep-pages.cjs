// Post-build prep for GitHub Pages: SPA fallback + no Jekyll processing.
// Pages returns 404.html for unknown paths like /keycap-studio/studio —
// serving a copy of index.html lets the router take over client-side.
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('pages prep done: 404.html + .nojekyll');
