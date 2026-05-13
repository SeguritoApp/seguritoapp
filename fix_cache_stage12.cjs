const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  {
    regex: /getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/reports\`\),\s*\),\s*\)/g,
    target: `fetchWithCache(\`library_data_\${selectedClientId}\`, () => getDocs(query(collection(db, \`clients/\${selectedClientId}/reports\`))))`
  },
  {
    regex: /getDocs\(\s*query\(collection\(db, \`clients\/\$\{selectedClientId\}\/irl_records\`\)\),\s*\)/g,
    target: `fetchWithCache(\`library_data_\${selectedClientId}\`, () => getDocs(query(collection(db, \`clients/\${selectedClientId}/irl_records\`))))`
  },
  {
    regex: /getDocs\(\s*query\(collection\(db, \`clients\/\$\{selectedClientId\}\/irl_templates\`\)\),\s*\)/g,
    target: `fetchWithCache(\`library_data_\${selectedClientId}\`, () => getDocs(query(collection(db, \`clients/\${selectedClientId}/irl_templates\`))))`
  },
  {
    regex: /const snapAcc = await getDocs\(accsRef\);/g,
    target: `const snapAcc = await fetchWithCache(\`accidents_\${selectedClientId}\`, () => getDocs(accsRef));`
  },
  {
    regex: /const snapInsp = await getDocs\(inspRef\);/g,
    target: `const snapInsp = await fetchWithCache(\`inspections_\${selectedClientId}\`, () => getDocs(inspRef));`
  },
  {
    regex: /const snapGrd = await getDocs\(grdRef\);/g,
    target: `const snapGrd = await fetchWithCache(\`grd_\${selectedClientId}\`, () => getDocs(grdRef));`
  },
  {
    regex: /const snapMinsal = await getDocs\(minsalRef\);/g,
    target: `const snapMinsal = await fetchWithCache(\`minsal_\${selectedClientId}\`, () => getDocs(minsalRef));`
  },
  {
    regex: /const s = await getDocs\(qReports\);/g,
    target: `const s = await fetchWithCache(\`library_data_\${selectedClientId}\`, () => getDocs(qReports));`
  },
  {
    regex: /const sWorkers = await getDocs\(qWorkers\);/g,
    target: `const sWorkers = await fetchWithCache(\`workers_\${selectedClientId}_all\`, () => getDocs(qWorkers));`
  },
  {
    regex: /const s = await getDocs\(q\);/g,
    target: `const s = await fetchWithCache(\`generic_cache_\${selectedClientId}\`, () => getDocs(q));`
  },
  {
    regex: /const snap = await getDocs\(riesgosRef\);/g,
    target: `const snap = await fetchWithCache(\`miper_risks_\${selectedClientId}\`, () => getDocs(riesgosRef));`
  },
  {
    regex: /const snapshot = await getDocs\(qWorkers\);/g,
    target: `const snapshot = await fetchWithCache(\`workers_\${selectedClientId}_all\`, () => getDocs(qWorkers));`
  }
];

let modified = false;
replacements.forEach(r => {
  if (r.regex.test(code)) {
    code = code.replace(r.regex, r.target);
    modified = true;
  }
});

if(modified) {
  fs.writeFileSync('src/App.tsx', code);
  console.log("App.tsx modified");
} else {
  console.log("No replacements made");
}
