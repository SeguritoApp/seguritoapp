const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetImport = `import autoTable from "jspdf-autotable";`;
const repImport = `import autoTable from "jspdf-autotable";\nimport { ProceduresView } from "./ProceduresView";`;

code = code.replace(targetImport, repImport);

fs.writeFileSync('src/App.tsx', code);
console.log("Imported ProceduresView");
