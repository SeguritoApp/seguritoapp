const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// QuickIncidentModal
code = code.replace(
  /const \[selectedClientId, setSelectedClientId\] = useState<string>\(""\);/,
  `const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [localClients, setLocalClients] = useState<Client[]>(clients);
  
  useEffect(() => {
    if (isOpen) {
      if (clients.length === 0 && user?.uid) {
        fetchWithCache(\`dashboard_clients_list_\${user.uid}\`, async () => {
          const snap = await getDocs(query(collection(db, "clients"), where("ownerId", "==", user.uid)));
          return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client));
        }).then(setLocalClients);
      } else {
        setLocalClients(clients);
      }
    }
  }, [isOpen, clients, user?.uid]);`
);

code = code.replace(
  /\{clients\.map\(\(c, idx\) => \(\s*<option key=\{c\.id\}/g,
  `{localClients.map((c, idx) => (\n                    <option key={c.id}`
);

// QuickEppModal
code = code.replace(
  /const \[selectedClientId, setSelectedClientId\] = useState<string>\(""\);\s*const \[workers, setWorkers\] = useState<Worker\[\]>\(\[\]\);/,
  `const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [localClients, setLocalClients] = useState<Client[]>(clients);
  
  useEffect(() => {
    if (isOpen) {
      if (clients.length === 0 && user?.uid) {
        fetchWithCache(\`dashboard_clients_list_\${user.uid}\`, async () => {
          const snap = await getDocs(query(collection(db, "clients"), where("ownerId", "==", user.uid)));
          return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client));
        }).then(setLocalClients);
      } else {
        setLocalClients(clients);
      }
    }
  }, [isOpen, clients, user?.uid]);

  const [workers, setWorkers] = useState<Worker[]>([]);`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed modals to fetch clients if empty");
