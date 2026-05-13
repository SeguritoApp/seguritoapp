const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `        const fetchFn = async () => {
          const q = query(
            collection(db, "clients"),
            where("ownerId", "==", user?.uid),
          );`;

const rep1 = `        const fetchFn = async () => {
          const targetOwnerId = profile?.corporateAdminId || user?.uid;
          const q = query(
            collection(db, "clients"),
            where("ownerId", "==", targetOwnerId),
          );`;

const target2 = `        const clientsList = await fetchWithCache(
          \`dashboard_clients_list_\${user?.uid}\`,
          fetchFn,
        );`;

const rep2 = `        const targetOwnerId = profile?.corporateAdminId || user?.uid;
        const clientsList = await fetchWithCache(
          \`dashboard_clients_list_\${targetOwnerId}\`,
          fetchFn,
        );`;

code = code.replace(target1, rep1);
code = code.replace(target2, rep2);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed dash");
