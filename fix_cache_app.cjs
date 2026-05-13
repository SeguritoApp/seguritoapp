const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  {
    regex: /const sWorkers = await getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/workers\`\),\s*orderBy\("createdAt", "desc"\),\s*limit\(50\),\s*\),\s*\);/g,
    target: `const sWorkers = await fetchWithCache(
            \`workers_\${selectedClientId}\`,
            () => getDocs(
              query(
                collection(db, \`clients/\${selectedClientId}/workers\`),
                orderBy("createdAt", "desc"),
                limit(50),
              )
            )
          );`
  },
  {
    regex: /getDocs\(query\(collection\(db, \`clients\/\$\{selectedClientId\}\/workers\`\)\)\)/g,
    target: `fetchWithCache(\`workers_\${selectedClientId}_all\`, () => getDocs(query(collection(db, \`clients/\${selectedClientId}/workers\`))))`
  },
  {
    regex: /getDocs\(\s*query\(collection\(db, \`clients\/\$\{selectedClientId\}\/gantt_tasks\`\)\),\s*\)/g,
    target: `fetchWithCache(\`gantt_tasks_\${selectedClientId}\`, () => getDocs(query(collection(db, \`clients/\${selectedClientId}/gantt_tasks\`))))`
  },
  {
    regex: /getDocs\(query\(collection\(db, \`clients\/\$\{selectedClientId\}\/gantt_tasks\`\)\)\)/g,
    target: `fetchWithCache(\`gantt_tasks_\${selectedClientId}\`, () => getDocs(query(collection(db, \`clients/\${selectedClientId}/gantt_tasks\`))))`
  },
  {
    regex: /getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/iper_matrices\`\),\s*limit\(1\),\s*\),\s*\)/g,
    target: `fetchWithCache(\`iper_\${selectedClientId}\`, () => getDocs(query(collection(db, \`clients/\${selectedClientId}/iper_matrices\`), limit(1))))`
  },
  {
    regex: /getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/inspections\`\),\s*orderBy\("createdAt", "desc"\),\s*limit\(50\),\s*\),\s*\)/g,
    target: `fetchWithCache(\`inspections_\${selectedClientId}\`, () => getDocs(query(collection(db, \`clients/\${selectedClientId}/inspections\`), orderBy("createdAt", "desc"), limit(50))))`
  },
  {
    regex: /getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/grd_inspections\`\),\s*orderBy\("date", "desc"\),\s*limit\(50\),\s*\),\s*\)/g,
    target: `fetchWithCache(\`grd_\${selectedClientId}\`, () => getDocs(query(collection(db, \`clients/\${selectedClientId}/grd_inspections\`), orderBy("date", "desc"), limit(50))))`
  },
  {
    regex: /getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/minsal_audits\`\),\s*orderBy\("date", "desc"\),\s*limit\(50\),\s*\),\s*\)/g,
    target: `fetchWithCache(\`minsal_\${selectedClientId}\`, () => getDocs(query(collection(db, \`clients/\${selectedClientId}/minsal_audits\`), orderBy("date", "desc"), limit(50))))`
  }
];

let modified = false;
replacements.forEach(r => {
  if(r.regex.test(code)) {
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
