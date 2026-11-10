const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'DepSyS', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const current = pkg.version || '1.0.0';
const parts = current.split('.').map(n => parseInt(n, 10) || 0);
const next = `${parts[0] || 1}.${parts[1] || 0}.${(parts[2] || 0) + 1}`;

const mode = process.argv[2];

if (mode === '--next') {
  console.log(next);
} else if (mode === '--current') {
  console.log(current);
} else {
  console.log(`${current} ${next}`);
}
