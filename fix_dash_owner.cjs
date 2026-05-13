const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const fetchDashboardClients = async \(\) => \{\n\s*try \{\n\s*const fetchFn = async \(\) => \{\n\s*const q = query\(\n\s*collection\(db, "clients"\),\n\s*where\("ownerId", "==", user\?\.uid\),\n\s*\);/g,
  `const fetchDashboardClients = async () => {
      try {
        const fetchFn = async () => {
          const targetOwnerId = profile?.corporateAdminId || user?.uid;
          const q = query(
            collection(db, "clients"),
            where("ownerId", "==", targetOwnerId),
          );`
);

code = code.replace(
  /const clientsList = await fetchWithCache\(\n\s*\`dashboard_clients_list_\$\{user\?.uid\}\`,\n\s*fetchFn,\n\s*\);/g,
  `const targetOwnerId = profile?.corporateAdminId || user?.uid;
        const clientsList = await fetchWithCache(
          \`dashboard_clients_list_\${targetOwnerId}\`,
          fetchFn,
        );`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed dashboard owner checks in App.tsx");
