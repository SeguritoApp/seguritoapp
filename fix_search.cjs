const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const diatRegex = /const handleSearchWorker = async \(rutOrName: string\) => \{\s*if \(\!rutOrName \|\| rutOrName\.length < 3\) return;\s*if \(\!selectedClientId\) \{\s*console\.error\("No se puede buscar: No hay un cliente seleccionado\."\);\s*return;\s*\}\s*setSearching\(true\);\s*try \{\s*console\.log\("Iniciando búsqueda de trabajador \(DIAT\):", \{\s*rutOrName,\s*selectedClientId,\s*\}\);\s*\/\/ Search by RUT or Name\s*const workersRef = collection\(db, "clients", selectedClientId, "workers"\);\s*const q = query\(workersRef, where\("rut", "==", rutOrName\)\);\s*let querySnapshot = await getDocs\(q\);\s*if \(querySnapshot\.empty\) \{\s*const qName = query\(\s*workersRef,\s*where\("firstName", ">=", rutOrName\),\s*where\("firstName", "<=", rutOrName \+ "\\uf8ff"\),\s*\);\s*querySnapshot = await getDocs\(qName\);\s*\}\s*if \(\!querySnapshot\.empty\) \{/g;

const diatReplacement = `const handleSearchWorker = async (rutOrName: string) => {
    if (!rutOrName || rutOrName.length < 3) return;
    if (!selectedClientId) {
      console.error("No se puede buscar: No hay un cliente seleccionado.");
      return;
    }
    setSearching(true);
    try {
      console.log("Iniciando búsqueda de trabajador (DIAT):", { rutOrName, selectedClientId });
      
      const snapshot = await fetchWithCache(
        \`workers_\${selectedClientId}_all\`,
        () => getDocs(query(collection(db, \`clients/\${selectedClientId}/workers\`)))
      );
      
      const searchStr = rutOrName.toLowerCase();
      const docs = snapshot.docs.filter(d => {
        const data = d.data();
        return (data.rut && data.rut.toLowerCase().includes(searchStr)) || 
               (data.firstName && data.firstName.toLowerCase().includes(searchStr)) ||
               (data.paternalLastName && data.paternalLastName.toLowerCase().includes(searchStr));
      });

      if (docs.length > 0) {
        const data = docs[0].data() as any;`;

const diepRegex = /const handleSearchWorker = async \(rutOrName: string\) => \{\s*if \(\!rutOrName \|\| rutOrName\.length < 3\) return;\s*if \(\!selectedClientId\) \{\s*console\.error\("No se puede buscar: No hay un cliente seleccionado\."\);\s*return;\s*\}\s*setSearching\(true\);\s*try \{\s*console\.log\("Iniciando búsqueda de trabajador \(DIEP\):", \{\s*rutOrName,\s*selectedClientId,\s*\}\);\s*const workersRef = collection\(db, "clients", selectedClientId, "workers"\);\s*const q = query\(workersRef, where\("rut", "==", rutOrName\)\);\s*let querySnapshot = await getDocs\(q\);\s*if \(querySnapshot\.empty\) \{\s*console\.log\("No se encontró por RUT, intentando por nombre\.\.\."\);\s*const qName = query\(\s*workersRef,\s*where\("firstName", ">=", rutOrName\),\s*where\("firstName", "<=", rutOrName \+ "\\uf8ff"\),\s*\);\s*querySnapshot = await getDocs\(qName\);\s*\}\s*if \(\!querySnapshot\.empty\) \{/g;

const diepReplacement = `const handleSearchWorker = async (rutOrName: string) => {
    if (!rutOrName || rutOrName.length < 3) return;
    if (!selectedClientId) {
      console.error("No se puede buscar: No hay un cliente seleccionado.");
      return;
    }
    setSearching(true);
    try {
      console.log("Iniciando búsqueda de trabajador (DIEP):", { rutOrName, selectedClientId });
      
      const snapshot = await fetchWithCache(
        \`workers_\${selectedClientId}_all\`,
        () => getDocs(query(collection(db, \`clients/\${selectedClientId}/workers\`)))
      );
      
      const searchStr = rutOrName.toLowerCase();
      const docs = snapshot.docs.filter(d => {
        const data = d.data();
        return (data.rut && data.rut.toLowerCase().includes(searchStr)) || 
               (data.firstName && data.firstName.toLowerCase().includes(searchStr)) ||
               (data.paternalLastName && data.paternalLastName.toLowerCase().includes(searchStr));
      });

      if (docs.length > 0) {
        const data = docs[0].data() as any;`;

if (code.match(diatRegex)) {
  code = code.replace(diatRegex, diatReplacement);
} else {
  console.log("DIAT regex didn't match.");
}

if (code.match(diepRegex)) {
  code = code.replace(diepRegex, diepReplacement);
} else {
  console.log("DIEP regex didn't match.");
}

fs.writeFileSync('src/App.tsx', code);
console.log("Done");
