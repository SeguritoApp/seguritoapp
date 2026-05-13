import { GoogleGenAI, Type } from "@google/genai";

export const workerAliasDictionary: Record<string, string[]> = {
  firstName: ["nombre", "nombres", "primer nombre", "name", "first name", "trabajador", "empleado"],
  paternalLastName: ["apellidopaterno", "apellidos", "apellidopat", "apellidop", "primer apellido", "apellido materno", "apellido"],
  maternalLastName: ["apellidomaterno", "apellidomat", "apellidom", "segundo apellido"],
  rut: ["rut", "r.u.t", "run", "cedula", "documento", "dni", "id"],
  birthDate: ["fechadenacimiento", "fechainacimiento", "nacimiento", "fnac", "fecha nac", "fecnacimiento", "cumpleaños", "fechanac"],
  incorporationDate: ["fechadeingreso", "fechaingreso", "ingreso", "incorporacion", "contratacion", "fechacontratacion", "fechainicio"],
  address: ["direccion", "domicilio", "ubicacion", "calle", "residencia"],
  email: ["correo", "correoelectronico", "email", "mail", "e-mail"],
  phone: ["telefono", "fono", "celular", "cel", "whatsapp", "movil"],
  position: ["cargo", "puesto", "rol", "ocupacion", "funcion", "perfil", "especialidad", "posicion", "profesion"],
  contractType: ["tipodecontrato", "contrato", "tipocontrato", "tipocon"],
  status: ["estado", "status", "situacion", "vigencia"],
  workCenter: ["centrodetrabajo", "centrotrabajo", "faena", "sucursal", "instalacion", "obra", "centro"],
};

export const normalizeHeader = (header: string): string => {
  return header
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]/g, ""); // Remove spaces and special characters
};

export const mapHeadersToWorkerFields = (headers: string[]): Record<string, string | null> => {
  const mappedFields: Record<string, string | null> = {
    firstName: null,
    paternalLastName: null,
    maternalLastName: null,
    rut: null,
    birthDate: null,
    incorporationDate: null,
    address: null,
    email: null,
    phone: null,
    position: null,
    contractType: null,
    status: null,
    workCenter: null,
  };

  const remainingHeaders = [...headers];

  // Try to match headers to our alias dictionary
  for (const field of Object.keys(workerAliasDictionary)) {
    const aliases = workerAliasDictionary[field].map(normalizeHeader);
    
    for (let i = 0; i < remainingHeaders.length; i++) {
      const header = remainingHeaders[i];
      const normalizedHeader = normalizeHeader(header);
      
      if (aliases.includes(normalizedHeader)) {
        mappedFields[field] = header;
        remainingHeaders.splice(i, 1);
        break;
      }
    }
  }

  return mappedFields;
};

// --- GEMINI INTELLIGENT PARSING LOGIC ---

// Ensure you have initialized ai somewhere or initialize it here:
let aiClient: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiClient) {
    const key = (process.env as any).GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not defined. AI mapping may fail. Make sure it is injected by the bundler or environment.");
    }
    aiClient = new GoogleGenAI({ apiKey: key || 'dummy-key' });
  }
  return aiClient;
};

/**
 * Intelligent parser using Gemini API (Structured Outputs)
 * Expects an array of raw CSV rows (objects with arbitrary keys).
 */
export const parseWorkersWithGemini = async (rawRows: any[]) => {
  if (rawRows.length === 0) return [];
  
  const ai = getAI();
  
  // Find header row by scoring
  let headerRow = -1;
  let maxScore = 0;
  const keywords = ["rut", "run", "nombre", "empleado", "trabajador", "identifica", "cedula", "dni", "cargo", "correo", "apellido", "fecha", "nacimiento", "direccion", "telefono", "sexo"];
  
  for (let i = 0; i < rawRows.length && i < 20; i++) {
      const strRow = rawRows[i].map((c: any) => String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      let score = 0;
      for (const cell of strRow) {
         if (keywords.some(k => cell.includes(k))) score++;
      }
      if (score > maxScore) {
          maxScore = score;
          headerRow = i;
      }
  }

  if (headerRow === -1 || headerRow >= rawRows.length - 1 || maxScore < 2) {
      throw new Error("No se encontraron encabezados reconocibles.");
  }

  const headers = rawRows[headerRow].map((c: any) => String(c).trim());
  const sampleData = rawRows.slice(headerRow + 1, headerRow + 4);

  const prompt = `You are a data mapping assistant. I have a CSV/Excel file with the following headers and sample data rows.
I need you to map these headers to my standard worker schema. 
Return ONLY a JSON object that maps my schema keys to the CORRECT HEADER STRING from the exact list provided.
If a field is not present in the headers, do not include it or set it to null.
The spreadsheet may have two sets of columns (e.g. two RUTs). If that happens, pick the one that belongs to the actual worker/employee instead of the company.

HEADERS LIST:
${JSON.stringify(headers)}

SAMPLE DATA ROWS:
${JSON.stringify(sampleData)}

Return a JSON object matching this TypeScript interface exactly:
{
  firstNameHeader: string | null;
  paternalLastNameHeader: string | null;
  maternalLastNameHeader: string | null;
  rutHeader: string | null;
  birthDateHeader: string | null;
  incorporationDateHeader: string | null;
  addressHeader: string | null;
  emailHeader: string | null;
  phoneHeader: string | null;
  positionHeader: string | null;
  contractTypeHeader: string | null;
  statusHeader: string | null;
  workCenterHeader: string | null;
}`;

  const responsePromise = ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          firstNameHeader: { type: Type.STRING, nullable: true },
          paternalLastNameHeader: { type: Type.STRING, nullable: true },
          maternalLastNameHeader: { type: Type.STRING, nullable: true },
          rutHeader: { type: Type.STRING, nullable: true },
          birthDateHeader: { type: Type.STRING, nullable: true },
          incorporationDateHeader: { type: Type.STRING, nullable: true },
          addressHeader: { type: Type.STRING, nullable: true },
          emailHeader: { type: Type.STRING, nullable: true },
          phoneHeader: { type: Type.STRING, nullable: true },
          positionHeader: { type: Type.STRING, nullable: true },
          contractTypeHeader: { type: Type.STRING, nullable: true },
          statusHeader: { type: Type.STRING, nullable: true },
          workCenterHeader: { type: Type.STRING, nullable: true }
        }
      }
    }
  });

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Gemini API timeout exceeded (30s)")), 30000)
  );

  const response = await Promise.race([responsePromise, timeoutPromise]) as any;

  let batchResultStr = response.text.trim();
  if (batchResultStr.startsWith("\`\`\`json")) {
      batchResultStr = batchResultStr.replace(/^\`\`\`json\n?/, "");
      batchResultStr = batchResultStr.replace(/\`\`\`$/, "").trim();
  } else if (batchResultStr.startsWith("\`\`\`")) {
      batchResultStr = batchResultStr.replace(/^\`\`\`\n?/, "");
      batchResultStr = batchResultStr.replace(/\`\`\`$/, "").trim();
  }

  const mapping = JSON.parse(batchResultStr);
  
  // Now apply the mapping locally for ALL raw rows
  const parsedWorkers: any[] = [];
  
  for (let i = headerRow + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0 || !row.some((val: any) => val && String(val).trim().length > 2)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h: string, idx: number) => {
        rowObj[h] = String(row[idx] || "").trim();
    });

    const getExactOrIncludes = (...matches: string[]) => {
      const avoidWords = ["empresa", "supervis", "jefatur", "jefe", "mandan", "compania", "contrat"];
      for (const match of matches) {
        const matchingKeys = Object.keys(rowObj).filter(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(match));
        if (matchingKeys.length > 0) {
           const bestKey = matchingKeys.find(k => !avoidWords.some(aw => k.toLowerCase().includes(aw))) || matchingKeys[0];
           if (rowObj[bestKey]) return String(rowObj[bestKey]).trim();
        }
      }
      return "";
    };

    let fName = mapping.firstNameHeader ? rowObj[mapping.firstNameHeader] : getExactOrIncludes("nombres", "nombre", "first name", "name", "primer nombre");
    let pName = mapping.paternalLastNameHeader ? rowObj[mapping.paternalLastNameHeader] : getExactOrIncludes("apellido paterno", "paterno", "primer apellido", "last name", "apellidos", "apellido");
    let mName = mapping.maternalLastNameHeader ? rowObj[mapping.maternalLastNameHeader] : getExactOrIncludes("apellido materno", "materno", "segundo apellido");
    let rut = mapping.rutHeader ? rowObj[mapping.rutHeader] : getExactOrIncludes("rut", "run", "cedula", "identidad", "documento", "id", "pasaporte", "identificacion", "dni", "c.i", "ci", "r.u.t", "r.u.n");
    let fullName = getExactOrIncludes("nombre completo", "nombres y apellidos", "empleado", "trabajador", "funcionario", "colaborador", "dotacion", "personal", "recurso", "apenom", "nomape");

    if (fullName && !fName) {
      fName = fullName;
    }

    if (fName && (fName === pName || !pName)) {
      // It's a full name field
      const parts = fName.split(" ").filter(Boolean);
      if (parts.length === 1) {
          pName = "";
      } else if (parts.length === 2) {
          fName = parts[0];
          pName = parts[1];
      } else if (parts.length === 3) {
          fName = parts[0];
          pName = parts[1];
          mName = parts[2];
      } else if (parts.length >= 4) {
          fName = parts.slice(0, 2).join(" ");
          pName = parts[2];
          mName = parts.slice(3).join(" ");
      }
    }

    if (!rut || rut.length < 5) {
       const fallbackRut = row.find((c: any) => String(c).match(/\d{7,8}-[\dkK]/i));
       if (fallbackRut) rut = String(fallbackRut).trim();
    }

    if (!fName && !pName) continue; // Skip no name
    if (!rut) continue; // Skip no rut

    parsedWorkers.push({
      firstName: fName || "",
      paternalLastName: pName || "",
      maternalLastName: mName || "",
      rut: rut || "",
      birthDate: mapping.birthDateHeader ? rowObj[mapping.birthDateHeader] : getExactOrIncludes("nacimiento", "fnac", "fec nac", "cumple"),
      incorporationDate: mapping.incorporationDateHeader ? rowObj[mapping.incorporationDateHeader] : getExactOrIncludes("ingreso", "incorporacion", "contratacion"),
      address: mapping.addressHeader ? rowObj[mapping.addressHeader] : getExactOrIncludes("direccion", "domicilio", "calle", "residencia", "ubicacion"),
      email: mapping.emailHeader ? rowObj[mapping.emailHeader] : getExactOrIncludes("correo", "email", "mail", "e-mail", "contacto electronico"),
      phone: mapping.phoneHeader ? rowObj[mapping.phoneHeader] : getExactOrIncludes("telefono", "celular", "movil", "fono", "tel", "contacto"),
      position: (mapping.positionHeader ? rowObj[mapping.positionHeader] : getExactOrIncludes("cargo", "puesto", "funcion", "rol", "especialidad", "posicion", "ocupacion")) || "NO ASIGNADO",
      contractType: (mapping.contractTypeHeader ? rowObj[mapping.contractTypeHeader] : getExactOrIncludes("tipo contrato", "contrato", "tipo con")) || "INDEFINIDO",
      status: ((mapping.statusHeader ? rowObj[mapping.statusHeader] : getExactOrIncludes("estado", "status", "situacion", "vigencia")) || "active").toLowerCase().includes("inactiv") ? "inactive" : "active",
      workCenter: mapping.workCenterHeader ? rowObj[mapping.workCenterHeader] : getExactOrIncludes("centro", "sucursal", "faena", "obra", "local", "tienda", "instalacion", "proyecto", "oficina", "departamento")
    });
  }

  return parsedWorkers;
};
