// Patches @libsql/client in node_modules to use web-only transport (no native binaries)
// Runs before Netlify plugin copies node_modules into function bundle
const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, 'node_modules', '@libsql', 'client');

// Replace node.js with web.js content
for (const dir of ['lib-cjs', 'lib-esm']) {
  const webSrc = path.join(clientDir, dir, 'web.js');
  const nodeDst = path.join(clientDir, dir, 'node.js');
  if (fs.existsSync(webSrc)) {
    fs.copyFileSync(webSrc, nodeDst);
    console.log(`Patched ${dir}/node.js -> web.js`);
  }

  // Stub sqlite3.js
  const sqlite3 = path.join(clientDir, dir, 'sqlite3.js');
  if (fs.existsSync(sqlite3)) {
    const stub = dir === 'lib-esm' ? 'export {};\n' : '"use strict";\nObject.defineProperty(exports, "__esModule", { value: true });\n';
    fs.writeFileSync(sqlite3, stub);
    console.log(`Stubbed ${dir}/sqlite3.js`);
  }
}

// Remove native libsql package
const libsqlDir = path.join(__dirname, 'node_modules', 'libsql');
if (fs.existsSync(libsqlDir)) {
  fs.rmSync(libsqlDir, { recursive: true });
  console.log('Removed native libsql package');
}

console.log('libsql patching complete');
