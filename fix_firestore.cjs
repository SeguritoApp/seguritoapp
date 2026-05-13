const fs = require('fs');
let code = fs.readFileSync('src/services/firestore.ts', 'utf8');

code = code.replace(
    /else if \(collectionName === "reports".+clearAppCache\(\`library_data_\$\{clientId\}\`\);/g,
    `else if (collectionName === "reports") { clearAppCache(\`library_reports_\${clientId}\`); clearAppCache(\`library_data_\${clientId}\`); clearAppCache(\`inspection_reports_\${clientId}\`); }
    else if (collectionName === "diep_records") { clearAppCache(\`library_diep_\${clientId}\`); clearAppCache(\`library_data_\${clientId}\`); }
    else if (collectionName === "diat_records") { clearAppCache(\`library_diat_\${clientId}\`); clearAppCache(\`library_data_\${clientId}\`); }
    else if (collectionName === "irl_records") { clearAppCache(\`library_irl_\${clientId}\`); clearAppCache(\`library_data_\${clientId}\`); }
    else if (collectionName === "irl_templates") clearAppCache(\`irl_templates_\${clientId}\`);
    else if (collectionName === "custom_protocols") clearAppCache(\`custom_protocols_\${clientId}\`);`
);

code = code.replace(
    /else if \(collectionName === "inspections"\) clearAppCache\(\`inspections_\$\{clientId\}\`\);/g,
    "else if (collectionName === \"inspections\") { clearAppCache(`inspections_${clientId}`); clearAppCache(`generic_inspections_${clientId}`); }"
);

code = code.replace(
    /else if \(collectionName === "minsal_audits"\) clearAppCache\(\`minsal_\$\{clientId\}\`\);/g,
    "else if (collectionName === \"minsal_audits\") { clearAppCache(`minsal_${clientId}`); clearAppCache(`minsal_audits_${clientId}`); }"
);

fs.writeFileSync('src/services/firestore.ts', code);
console.log("Updated firestore.ts cache invalidation.");
