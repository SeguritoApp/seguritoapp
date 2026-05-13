const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
    /const snapshot = await fetchWithCache\(\`workers_\$\{selectedClientId\}_all\`, \(\) => getDocs\(qWorkers\)\);/g,
    "const snapshot = await fetchWithCache(`workers_${selectedClientId}_wc_${selectedCentralizedWcId || 'all'}`, () => getDocs(qWorkers));"
);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed qWorkers call.");
