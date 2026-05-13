const fs = require('fs');
let text = fs.readFileSync('firestore.rules', 'utf8');

const target = `      // MIPER
      match /miper/{id} {`;

const rep = `      // PROCEDURES
      match /procedures/{id} {
        allow list, get: if canAccessClient(clientId);
        allow create, update: if canAccessClient(clientId);
        allow delete: if canAccessClient(clientId);
      }

      // MIPER
      match /miper/{id} {`;

text = text.replace(target, rep);
fs.writeFileSync('firestore.rules', text);
console.log("Added procedures to firestore.rules");
