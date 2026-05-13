const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
    /const sWorkers = await fetchWithCache\([\s\n]*\`workers_\$\{selectedClientId\}_all\`\,[\s\n]*\(\) => getDocs\([\s\n]*query\([\s\n]*collection\(db, \`clients\/\$\{selectedClientId\}\/workers\`\),[\s\n]*orderBy\("createdAt", "desc"\),[\s\n]*limit\(50\),?[\s\n]*\),?[\s\n]*\),?[\s\n]*\);/g,
    "const sWorkers = await fetchWithCache(`workers_50_${selectedClientId}`, () => getDocs(query(collection(db, `clients/${selectedClientId}/workers`), orderBy('createdAt', 'desc'), limit(50))));"
);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed 9544 again.");
