const fs = require('node:fs');
const path = require('node:path');
const spec = require('../docs/openapi');
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'openapi.json'), JSON.stringify(spec, null, 2) + '\n');
console.log('Contrato exportado em docs/openapi.json');
