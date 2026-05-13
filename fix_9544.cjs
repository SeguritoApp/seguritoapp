const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
    /const sWorkers = await fetchWithCache\(\s*\`workers_\$\{selectedClientId\}_all\`,\s*\(\) => getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/workers\`\),\s*orderBy\("createdAt", "desc"\),\s*limit\(50\),\s*\),\s*\),\s*\);/g,
    "const sWorkers = await fetchWithCache(`workers_50_${selectedClientId}`, () => getDocs(query(collection(db, `clients/${selectedClientId}/workers`), orderBy('createdAt', 'desc'), limit(50))));"
);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed 9544.");
