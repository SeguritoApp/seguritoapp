const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  {
    // reports line 6020
    regex: /getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/reports\`\),\s*orderBy\("createdAt", "desc"\),\s*limit\(50\),\s*\),\s*\)/g,
    target: "fetchWithCache(`library_reports_${selectedClientId}`, () => getDocs(query(collection(db, `clients/${selectedClientId}/reports`), orderBy(\"createdAt\", \"desc\"), limit(50))))"
  },
  {
    // diep records line 6027
    regex: /getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/diep_records\`\),\s*orderBy\("createdAt", "desc"\),\s*limit\(50\),\s*\),\s*\)/g,
    target: "fetchWithCache(`library_diep_${selectedClientId}`, () => getDocs(query(collection(db, `clients/${selectedClientId}/diep_records`), orderBy(\"createdAt\", \"desc\"), limit(50))))"
  },
  {
    // diat records line 6034
    regex: /getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/diat_records\`\),\s*orderBy\("createdAt", "desc"\),\s*limit\(50\),\s*\),\s*\)/g,
    target: "fetchWithCache(`library_diat_${selectedClientId}`, () => getDocs(query(collection(db, `clients/${selectedClientId}/diat_records`), orderBy(\"createdAt\", \"desc\"), limit(50))))"
  },
  {
    // irl records line 6041
    regex: /getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/irl_records\`\),\s*orderBy\("createdAt", "desc"\),\s*limit\(50\),\s*\),\s*\)/g,
    target: "fetchWithCache(`library_irl_${selectedClientId}`, () => getDocs(query(collection(db, `clients/${selectedClientId}/irl_records`), orderBy(\"createdAt\", \"desc\"), limit(50))))"
  },
  {
    // reports line 8102
    regex: /getDocs\(\s*query\(\s*collection\(db, \`clients\/\$\{selectedClientId\}\/reports\`\),\s*where\("type", "==", "inspection_report"\),\s*\),\s*\)/g,
    target: "fetchWithCache(`inspection_reports_${selectedClientId}`, () => getDocs(query(collection(db, `clients/${selectedClientId}/reports`), where(\"type\", \"==\", \"inspection_report\"))))"
  },
  {
    // gantt tasks fetchFn line 4542
    regex: /const snapshot = await getDocs\(q\);\s*const data = snapshot\.docs\.map\(/g,
    target: "const snapshot = await fetchWithCache(`gantt_tasks_${selectedClientId}`, () => getDocs(q));\n          const data = snapshot.docs.map("
  },
  {
    // client search line 22546 (around User assignment logic or something)
    regex: /const snapshot = await getDocs\(q\);\s*const loadedClients = snapshot\.docs\.map/g,
    target: "const snapshot = await fetchWithCache(`dashboard_clients_${targetOwnerId}`, () => getDocs(q));\n          const loadedClients = snapshot.docs.map"
  },
  {
    // getDocs around 3240 (Dashboard client list? Wait, let's look at 3235 first, wait, it's inside `fetchFn = async () =>` for Dashboard Clients cache!)
    regex: /const snap = await getDocs\(q\);\s*return snap\.docs\.map\(\s*\(doc\)/g,
    target: "const snap = await getDocs(q);\n          return snap.docs.map(\n            (doc)"
  }
];

let modified = false;
replacements.forEach((r, idx) => {
  if (r.regex.test(code)) {
    code = code.replace(r.regex, r.target);
    modified = true;
    console.log("Replaced", idx);
  } else {
    console.log("No match for", idx);
  }
});

if (modified) {
  fs.writeFileSync('src/App.tsx', code);
  console.log("done");
}
