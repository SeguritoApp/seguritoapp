const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/import \* as admin from "firebase-admin";/, `import { initializeApp, getApps } from "firebase-admin/app";\nimport { getFirestore, FieldValue } from "firebase-admin/firestore";`);

code = code.replace(/if \(\!admin\.apps\.length\) \{/, 'if (!getApps().length) {');
code = code.replace(/admin\.initializeApp\(\);/, 'initializeApp();');
code = code.replace(/admin\.firestore\.FieldValue\.serverTimestamp\(\)/g, 'FieldValue.serverTimestamp()');
code = code.replace(/admin\.firestore\.FieldValue\.delete\(\)/g, 'FieldValue.delete()');
code = code.replace(/admin\.firestore\(\)/g, 'getFirestore()');

fs.writeFileSync('server.ts', code);
console.log("Fixed server.ts");
