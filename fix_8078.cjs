const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/reports\`\),\s*orderBy\("createdAt", "desc"\),\s*\),\s*\)/g;
const replacement = "fetchWithCache(`library_reports_${selectedClientId}`, () => getDocs(query(collection(db, `clients/${selectedClientId}/reports`), orderBy(\"createdAt\", \"desc\"))))";

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed 8078");
} else {
    console.log("No match");
}
