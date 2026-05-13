const fs = require('fs');
let code = fs.readFileSync('src/services/firestore.ts', 'utf8');

code = code.replace(
  /clearAppCache\(\`library_reports_\\\$\{clientId\}\`\); clearAppCache\(\`library_data_\\\$\{clientId\}\`\); clearAppCache\(\`inspection_reports_\\\$\{clientId\}\`\);/g,
  "clearAppCache(`library_reports_${clientId}`); clearAppCache(`library_data_${clientId}`); clearAppCache(`inspection_reports_${clientId}`); clearAppCache(`library_reports_all_${clientId}`);"
);

fs.writeFileSync('src/services/firestore.ts', code);
console.log("Fixed firestore.ts cache");
