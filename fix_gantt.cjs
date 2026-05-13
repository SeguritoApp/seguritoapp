const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// In fetchDashboardClients
code = code.replace(/const snap = await fetchWithCache\(\`dashboard_clients_snap_\$\{user\?.uid\}\`, \(\) => getDocs\(q\)\);\s*return snap\.docs\.map\(\s*\(doc\) => \(\{ \.\.\.doc\.data\(\), id: doc\.id \}\) as Client,\s*\);/g, `const snap = await getDocs(q);\n          const clients = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client));\n          return clients;`);

// In Dashboard fetchAlerts
code = code.replace(/const snap = await fetchWithCache\(\`gantt_tasks_snap_\$\{client\.id\}\`, \(\) => getDocs\(query\(collection\(db, \`clients\/\$\{client\.id\}\/gantt_tasks\`\)\)\)\);\s*const clientAlerts = snap\.docs/g, `const snap = await getDocs(query(collection(db, \`clients/\${client.id}/gantt_tasks\`)));\n            const clientAlerts = snap.docs`);

// In GanttView fetchTasks
code = code.replace(/const snapshot = await fetchWithCache\(\`gantt_tasks_snap_\$\{selectedClientId\}\`, \(\) => getDocs\(q\)\);\s*const data = snapshot\.docs\.map/g, `const snapshot = await getDocs(q);\n          const data = snapshot.docs.map`);

// In dashboard getDocs Promise.all
code = code.replace(/fetchWithCache\(\`gantt_tasks_snap_\$\{selectedClientId\}\`, \(\) => getDocs\(query\(collection\(db, \`clients\/\$\{selectedClientId\}\/gantt_tasks\`\)\)\)\),/g, 'getDocs(query(collection(db, `clients/${selectedClientId}/gantt_tasks`))),');

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed Gantt cache in App.tsx");
