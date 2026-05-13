const fs = require('fs');
let code = fs.readFileSync('src/services/firestore.ts', 'utf8');

code = code.replace(/clearAppCache\(\`gantt_tasks_snap_\$\{clientId\}\`\);/g, 'clearAppCache(`gantt_tasks_data_${clientId}`);');
code = code.replace(/clearAppCache\(\`dashboard_clients_\$\{parts\[1\]\}\`\);/g, 'clearAppCache(`dashboard_clients_${parts[1]}`); clearAppCache(`dashboard_clients_data_${parts[1]}`);');

fs.writeFileSync('src/services/firestore.ts', code);
console.log("Fixed firestore.ts cache invalidation");
