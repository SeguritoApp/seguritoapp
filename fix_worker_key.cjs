const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/\`workers_\$\{selectedClientId\}\`/g, "\`workers_\${selectedClientId}_all\`");
fs.writeFileSync('src/App.tsx', code);
