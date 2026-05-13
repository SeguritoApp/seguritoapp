const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Dashboard fetchAlerts
code = code.replace(
  /const snap \= await getDocs\(query\(collection\(db, \`clients\/\$\{client\.id\}\/gantt_tasks\`\)\)\);\s*const clientAlerts = snap\.docs\s*\.filter\(d => \{\s*const status = d\.data\(\)\.status;\s*return status === "pending" \|\| status === "in_progress";\s*\}\)\s*\.map\(\(d\) => \{\s*const data = d\.data\(\);\s*const endDate/g,
  `const tasksData = await fetchWithCache(\`gantt_tasks_data_\${client.id}\`, async () => {
              const q = query(collection(db, \`clients/\${client.id}/gantt_tasks\`));
              const snap = await getDocs(q);
              return snap.docs.map(d => ({ ...d.data(), id: d.id } as GanttTask));
            });
            const clientAlerts = tasksData
              .filter(data => {
                const status = data.status;
                return status === "pending" || status === "in_progress";
              })
              .map(data => {
                const endDate`
);

// GanttView fetchTasks
code = code.replace(
  /const fetchFn \= async \(\) => \{\s*const q \= collection\(db, \`clients\/\$\{selectedClientId\}\/gantt_tasks\`\);\s*const snapshot \= await getDocs\(q\);\s*const data \= snapshot\.docs\.map\(\s*\(doc\) => \(\{ \.\.\.doc\.data\(\), id: doc\.id \}\) as GanttTask,\s*\);\s*return data\.sort\(\(a, b\) => a\.startDate\.localeCompare\(b\.startDate\)\);\s*\};\s*const tasksData = await fetchFn\(\);/g,
  `const fetchFn = async () => {
          const q = collection(db, \`clients/\${selectedClientId}/gantt_tasks\`);
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(
            (doc) => ({ ...doc.data(), id: doc.id }) as GanttTask,
          );
          return data.sort((a, b) => a.startDate.localeCompare(b.startDate));
        };
        const tasksData = await fetchWithCache(\`gantt_tasks_data_\${selectedClientId}\`, fetchFn);`
);

// Dashboard Promise.all Tasks
code = code.replace(
  /getDocs\(query\(collection\(db, \`clients\/\$\{selectedClientId\}\/gantt_tasks\`\)\)\),/g,
  `fetchWithCache(\`gantt_tasks_data_\${selectedClientId}\`, async () => {
            const snap = await getDocs(query(collection(db, \`clients/\${selectedClientId}/gantt_tasks\`)));
            return snap.docs.map(d => ({...d.data(), id: d.id}) as GanttTask);
          }),`
);

// Dashboard Promise.all workers parsing
code = code.replace(
  /allTasks \= sTasks\.docs\.map\(\s*\(d\) => \(\{ \.\.\.d\.data\(\), id: d\.id \}\) as GanttTask,\s*\);/g,
  `allTasks = (sTasks as any) as GanttTask[];`
);

// clients cache
code = code.replace(
  /const fetchFn \= async \(\) => \{\s*const q \= query\(\s*collection\(db, "clients"\),\s*where\("ownerId", "==", user\?\.uid\),\s*\);\s*const snap \= await getDocs\(q\);\s*const clients \= snap\.docs\.map\(doc => \(\{ \.\.\.doc\.data\(\), id: doc\.id \} as Client\)\);\s*return clients;\s*\};\s*const clientsList = await fetchFn\(\);/g,
  `const fetchFn = async () => {
          const q = query(
            collection(db, "clients"),
            where("ownerId", "==", user?.uid),
          );
          const snap = await getDocs(q);
          return snap.docs.map(
            (doc) => ({ ...doc.data(), id: doc.id }) as Client,
          );
        };

        const clientsList = await fetchWithCache(
          \`dashboard_clients_data_\${user?.uid}\`,
          fetchFn,
        );`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed caches in App.tsx again");
