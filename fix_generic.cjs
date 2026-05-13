const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  {
    regex: /await fetchWithCache\(\`workers_\$\{selectedClientId\}_all\`\, \(\) => getDocs\(qWorkers\)\)/g,
    target: "await fetchWithCache(`workers_${selectedClientId}_wc_${selectedCentralizedWcId}`, () => getDocs(qWorkers))"
  },
  {
    regex: /await fetchWithCache\(\s*\`workers_\$\{selectedClientId\}_all\`,\s*\(\) => getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/workers\`\),\s*orderBy\("createdAt", "desc"\),\s*limit\(50\)/g,
    target: "await fetchWithCache(\n            `workers_${selectedClientId}_initial`,\n            () => getDocs(\n              query(\n                collection(db, `clients/${selectedClientId}/workers`),\n                orderBy(\"createdAt\", \"desc\"),\n                limit(50)"
  },
  {
    regex: /await fetchWithCache\(\`generic_cache_\$\{selectedClientId\}\`/g,
    target: "await fetchWithCache(`generic_cache_${selectedClientId}`" // this won't work generically, need specific replacements
  }
];

// Let's replace generic caches individually
// Miper fetch: line 16130
code = code.replace(/const fetchMiper = async \(\) => \{\s*try \{\s*const s = await fetchWithCache\(\`generic_cache_\$\{selectedClientId\}\`, \(\) => getDocs\(q\)\);/g, 
"const fetchMiper = async () => {\n        try {\n          const s = await fetchWithCache(`miper_${selectedClientId}`, () => getDocs(q));");

// Templates fetch: line 16587
code = code.replace(/const fetchTemplates = async \(\) => \{\s*try \{\s*const s = await fetchWithCache\(\`generic_cache_\$\{selectedClientId\}\`, \(\) => getDocs\(q\)\);/g, 
"const fetchTemplates = async () => {\n      try {\n        const s = await fetchWithCache(`irl_templates_${selectedClientId}`, () => getDocs(q));");

// Inspections fetch: line 18615
code = code.replace(/const fetchInspections = async \(\) => \{\s*try \{\s*const s = await fetchWithCache\(\`generic_cache_\$\{selectedClientId\}\`, \(\) => getDocs\(q\)\);/g, 
"const fetchInspections = async () => {\n      try {\n        const s = await fetchWithCache(`generic_inspections_${selectedClientId}`, () => getDocs(q));");

// Minsal Audits fetch and Custom Protocols fetch
// 19164: Minsal Audits
code = code.replace(/const q = query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/minsal_audits\`\),\s*orderBy\("date", "desc"\),\s*\);\s*const s = await fetchWithCache\(\`generic_cache_\$\{selectedClientId\}\`, \(\) => getDocs\(q\)\);/g, 
`const q = query(
          collection(db, \`clients/\${selectedClientId}/minsal_audits\`),
          orderBy("date", "desc"),
        );
        const s = await fetchWithCache(\`minsal_audits_\${selectedClientId}\`, () => getDocs(q));`);

// Custom protocols: 19193
code = code.replace(/const q = query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/custom_protocols\`\),\s*orderBy\("createdAt", "asc"\),\s*\);\s*const s = await fetchWithCache\(\`generic_cache_\$\{selectedClientId\}\`, \(\) => getDocs\(q\)\);/g, 
`const q = query(
          collection(db, \`clients/\${selectedClientId}/custom_protocols\`),
          orderBy("createdAt", "asc"),
        );
        const s = await fetchWithCache(\`custom_protocols_\${selectedClientId}\`, () => getDocs(q));`);

// Replace the workers logic for the first two
if (code.match(replacements[0].regex)) {
   // Wait, there are multiple matches? No, qWorkers is used in a few places.
   // Let's be very specific:
}

fs.writeFileSync('src/App.tsx', code);
console.log("Replaced stage 1");
