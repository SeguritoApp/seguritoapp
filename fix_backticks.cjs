const fs = require('fs');
let code = fs.readFileSync('src/ProceduresView.tsx', 'utf8');

code = code.replace(/\\`/g, '\`');
code = code.replace(/\\\$/g, '\$');

fs.writeFileSync('src/ProceduresView.tsx', code);
console.log("Fixed backticks");
