const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  {
    regex: /const q = query\(\s*collection\(db, \`clients\/\$\{client\.id\}\/gantt_tasks\`\),\s*where\("status", "in", \["pending", "in_progress"\]\),\s*\);\s*const snap = await getDocs\(q\);\s*const clientAlerts = snap\.docs\s*\.map\(\(d\) => \{/g,
    target: `const snap = await fetchWithCache(\`gantt_tasks_\${client.id}\`, () => getDocs(query(collection(db, \`clients/\${client.id}/gantt_tasks\`))));
            const clientAlerts = snap.docs
              .filter(d => {
                const status = d.data().status;
                return status === "pending" || status === "in_progress";
              })
              .map((d) => {`
  },
  {
    regex: /const sReports = await getDocs\(qReports\);/g,
    target: `const sReports = await fetchWithCache(\`library_data_\${selectedClientId}\`, () => getDocs(qReports));`
  },
  {
    regex: /const snap = await getDocs\(clientsQuery\);/g,
    target: `const snap = await fetchWithCache(\`dashboard_clients\`, () => getDocs(clientsQuery));`
  },
  {
    regex: /const s = await getDocs\(qMiper\);/g,
    target: `const s = await fetchWithCache(\`miper_risks_\${selectedClientId}\`, () => getDocs(qMiper));`
  },
  {
    regex: /const oldMiperSnap = await getDocs\(oldMiperQuery\);/g,
    target: `const oldMiperSnap = await fetchWithCache(\`old_miper_\${selectedClientId}\`, () => getDocs(oldMiperQuery));`
  }
];

let modified = false;
replacements.forEach(r => {
  if (r.regex.test(code)) {
    code = code.replace(r.regex, r.target);
    modified = true;
  } else {
      console.log("No match for:", r.regex);
  }
});

if(modified) {
  fs.writeFileSync('src/App.tsx', code);
  console.log("App.tsx modified stage 3 alerts");
} else {
  console.log("No replacements made for stage 3");
}
