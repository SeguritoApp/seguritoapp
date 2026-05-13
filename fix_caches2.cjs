const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 8079
code = code.replace(
  /fetchWithCache\(\`library_data_\$\{selectedClientId\}\`, \(\) => getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/irl_records\`\)\s*\)\s*\)\)/g,
  "fetchWithCache(`library_irl_${selectedClientId}`, () => getDocs(query(collection(db, `clients/${selectedClientId}/irl_records`))))"
);

// 13682 and 17723 (qReports without order)
code = code.replace(
  /const s = await fetchWithCache\(\`library_data_\$\{selectedClientId\}\`, \(\) => getDocs\(qReports\)\);/g,
  "const s = await fetchWithCache(`library_reports_all_${selectedClientId}`, () => getDocs(qReports));"
);
code = code.replace(
  /const sReports = await fetchWithCache\(\`library_data_\$\{selectedClientId\}\`, \(\) => getDocs\(qReports\)\);/g,
  "const sReports = await fetchWithCache(`library_reports_all_${selectedClientId}`, () => getDocs(qReports));"
);

// 14366 (qReports with desc)
// Actually we can just leave it as it was replaced if it matches above? Wait, in 14366 it was qReports as well.
// So let's replace all `await fetchWithCache(\`library_data_${selectedClientId}\`, () => getDocs(qReports))` with `library_reports_all_${selectedClientId}`

// 16936
code = code.replace(
  /fetchWithCache\(\`library_data_\$\{selectedClientId\}\`, \(\) => getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/irl_templates\`\)\s*\)\s*\)\)/g,
  "fetchWithCache(`irl_templates_${selectedClientId}`, () => getDocs(query(collection(db, `clients/${selectedClientId}/irl_templates`))))"
);

// 16937 (irl records)
// This will probably match the first one if we don't be careful, but we already replaced it hopefully.
// Actually let's just do a generic replace for irl_records
code = code.replace(
  /fetchWithCache\(\`library_data_\$\{selectedClientId\}\`, \(\) => getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/irl_records\`\)\s*\)\s*\)\)/g,
  "fetchWithCache(`library_irl_${selectedClientId}`, () => getDocs(query(collection(db, `clients/${selectedClientId}/irl_records`))))"
);

// 19184 custom_minsal_protocols
code = code.replace(
  /const s = await fetchWithCache\(\`generic_cache_\$\{selectedClientId\}\`, \(\) => getDocs\(q\)\);/g,
  "const s = await fetchWithCache(`custom_minsal_protocols_${selectedClientId}`, () => getDocs(q));"
);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed caches");
