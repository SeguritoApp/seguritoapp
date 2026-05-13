const fs = require('fs');
let code = fs.readFileSync('src/services/firestore.ts', 'utf8');

code = code.replace(
  /else if \(collectionName === "custom_protocols"\) clearAppCache\(\`custom_protocols_\$\{clientId\}\`\);/g,
  "else if (collectionName === \"custom_minsal_protocols\") clearAppCache(`custom_minsal_protocols_${clientId}`);"
);

fs.writeFileSync('src/services/firestore.ts', code);
console.log("Fixed custom_minsal_protocols cache");
