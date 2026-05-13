const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /dashboard_clients_list_\$\{user\.uid\}/g,
  'dashboard_clients_list_${profile?.corporateAdminId || user?.uid}'
);

code = code.replace(
  /where\("ownerId", "==", user\.uid\)/g,
  'where("ownerId", "==", profile?.corporateAdminId || user?.uid)'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed user.uid to targetOwnerId in Modals");
