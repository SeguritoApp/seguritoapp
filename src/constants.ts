export const RISK_TEMPLATES = [
  {
    id: "caida_distinto_nivel",
    label: "Caída a distinto nivel",
    severity: "High",
  },
  {
    id: "ruido_exposicion",
    label: "Exposición a Ruido (Prexor)",
    severity: "Medium",
  },
  {
    id: "silice_cristalina",
    label: "Exposición a Sílice (Planesi)",
    severity: "High",
  },
  {
    id: "sustancias_peligrosas",
    label: "Manejo de Sustancias Peligrosas",
    severity: "High",
  },
  {
    id: "mmc_critico",
    label: "Manejo Manual de Carga (MMC)",
    severity: "Medium",
  },
  { id: "radiacion_uv", label: "Exposición a Radiación UV", severity: "Low" },
  {
    id: "riesgo_psicosocial",
    label: "Riesgos Psicosociales (CEAL-SM)",
    severity: "Medium",
  },
  {
    id: "incendio_explosion",
    label: "Riesgo de Incendio/Explosión",
    severity: "High",
  },
  {
    id: "atrapamiento",
    label: "Atrapamiento por partes móviles",
    severity: "High",
  },
  {
    id: "ergonómico_tmer",
    label: "Riesgo Ergonómico (TMERT)",
    severity: "Medium",
  },
];

export const GANTT_DEFAULT_TASKS = [
  { title: "Ejemplo: Actualización Matriz IPER", duration: 15 },
];

export const DEFAULT_EPP_ITEMS = [
  "OVEROL",
  "ZAPATOS SEGURIDAD Nº",
  "POLERA MANGA LARGA",
  "TRAJE TERMICO",
  "LEGIONARIO",
  "BOTAS DE AGUA Nº",
  "TRAJE PARA AGUA",
  "LENTES OSCUROS",
  "GUANTES TERMICOS",
  "GORRO DE POLAR",
  "POLERA DRYFIT",
  "GORRO DE SOL",
  "ANTIPARRA",
];

export const LEGAL_LIMITS = {
  mmc: {
    male: 25,
    female: 20,
    minors: 20,
  },
  sshh: [
    { workers: 10, toilets: 1, washbasins: 1, showers: 1 },
    { workers: 20, toilets: 2, washbasins: 2, showers: 2 },
    { workers: 30, toilets: 2, washbasins: 2, showers: 3 },
    { workers: 40, toilets: 3, washbasins: 3, showers: 4 },
    { workers: 50, toilets: 3, washbasins: 3, showers: 5 },
    { workers: 60, toilets: 4, washbasins: 3, showers: 6 }, // Correcting based on Art 23 actual table
    { workers: 70, toilets: 4, washbasins: 3, showers: 7 },
    { workers: 80, toilets: 5, washbasins: 5, showers: 8 },
    { workers: 90, toilets: 5, washbasins: 5, showers: 9 },
    { workers: 100, toilets: 6, washbasins: 6, showers: 10 },
  ],
  fire: [
    { area: 150, potential: "4A", distance: 9 },
    { area: 225, potential: "6A", distance: 11 },
    { area: 375, potential: "10A", distance: 13 },
    { area: 420, potential: "20A", distance: 15 },
  ],
  water: {
    minLitersPerPersonPerDay: 100,
    minLitersTemporary: 30,
  },
  ventilation: {
    minVolumePerWorker: 10, // m3
    minAirRenewal: 20, // m3/h per person
  },
};

export const getRiskLevel = (p: number, c: number) => {
  const result = p * c;
  // Traffic Light System (Semaforo)
  if (result >= 16)
    return {
      label: "CRÍTICO",
      color: "bg-red-500",
      hex: "#ef4444",
      level: "red",
    };
  if (result >= 8)
    return { label: "ALTO", color: "bg-red-500", hex: "#ef4444", level: "red" }; // Both Alto and Critico as Red/Alarm
  if (result >= 4)
    return {
      label: "MEDIO",
      color: "bg-yellow-500",
      hex: "#eab308",
      level: "yellow",
    };
  return {
    label: "BAJO",
    color: "bg-green-500",
    hex: "#22c55e",
    level: "green",
  };
};

export const DS67_COTIZACION = [
  { min: 0, max: 32, tasa: 0.0 },
  { min: 33, max: 64, tasa: 0.34 },
  { min: 65, max: 96, tasa: 0.68 },
  { min: 97, max: 128, tasa: 1.02 },
  { min: 129, max: 160, tasa: 1.36 },
  { min: 161, max: 192, tasa: 1.7 },
  { min: 193, max: 224, tasa: 2.04 },
  { min: 225, max: 272, tasa: 2.38 },
  { min: 273, max: 320, tasa: 2.72 },
  { min: 321, max: 368, tasa: 3.06 },
  { min: 369, max: 416, tasa: 3.4 },
  { min: 417, max: 464, tasa: 3.74 },
  { min: 465, max: 512, tasa: 4.08 },
  { min: 513, max: 560, tasa: 4.42 },
  { min: 561, max: 630, tasa: 4.76 },
  { min: 631, max: 700, tasa: 5.1 },
  { min: 701, max: 770, tasa: 5.44 },
  { min: 771, max: 840, tasa: 5.78 },
  { min: 841, max: 910, tasa: 6.12 },
  { min: 911, max: 980, tasa: 6.46 },
  { min: 981, max: 9999, tasa: 6.8 },
];

export const getDS67Tasa = (total: number) => {
  const row = DS67_COTIZACION.find((r) => total >= r.min && total <= r.max);
  return row ? row.tasa : 6.8;
};

export const DS44_REQUIREMENTS = [
  {
    id: 1,
    label: "Sistema de Gestión de Seguridad y Salud en el Trabajo",
    article: "22 inc 1, 64 inc 1",
    defaultDoc:
      "Sistema de gestión - Plan anual de prevención de riesgos - Politica de SST",
  },
  {
    id: 2,
    label:
      "Matriz de Identificación de Peligros y Evaluación de los Riesgos laborales (MIPER)",
    article: "7 inc 1",
    defaultDoc: "MIPER ACTUALIZADA DS 44",
  },
  {
    id: 3,
    label: "Suministro de EPP libres de costo para trabajadores",
    article: "13 inc 1",
    defaultDoc: "PTS Procedimiento Estándar de EPP",
  },
  {
    id: 4,
    label: "Evaluación anual del programa de trabajo preventivo",
    article: "14, 52",
    defaultDoc: "PDTP",
  },
  {
    id: 5,
    label: "Consulta y participación de representantes en gestión preventiva",
    article: "17 inc 1, 37 inc 2, 71 inc 1",
    defaultDoc: "Actas CPHS / Procedimiento participación",
  },
  {
    id: 6,
    label: "Planes de emergencia, catástrofe o desastres",
    article: "19 inc 1",
    defaultDoc: "Plan de Emergencia y Evacuación",
  },
  {
    id: 7,
    label: "Coordinación entre entidades empleadoras en el mismo sitio",
    article: "20 inc 1",
    defaultDoc: "IRL - PTS Coordinación",
  },
  {
    id: 8,
    label: "Comité Paritario de Higiene y Seguridad (>25 trabajadores)",
    article: "23 inc 1",
    defaultDoc: "Actas de constitución CPHS",
  },
  {
    id: 9,
    label: "Delegado de Seguridad y Salud en el Trabajo",
    article: "66 inc 1, 64, 37",
    defaultDoc: "Acta Delegado de Seguridad",
  },
  {
    id: 10,
    label: "Departamento de Prevención de Riesgos (>100 trabajadores)",
    article: "50, 55 inc 2",
    defaultDoc: "Contrato experto / Acta Dpto",
  },
  {
    id: 11,
    label: "Reglamento Interno de Higiene y Seguridad (RIOHS)",
    article: "56 inc 1, 57 inc 1",
    defaultDoc: "RIOHS Actualizado DS 44",
  },
  {
    id: 12,
    label: "Mapas de riesgos en lugares visibles",
    article: "62 inc 1 y 2",
    defaultDoc: "Mapas de Riesgos",
  },
  {
    id: 13,
    label: "Programa de vigilancia ambiental / Protocolos MINSAL",
    article: "67 inc 1, 3",
    defaultDoc: "Ingreso Vigilancia Mutualidad",
  },
  {
    id: 14,
    label: "Investigación de accidentes con enfoque de género",
    article: "71",
    defaultDoc: "Formato Investigación Árbol de Causas",
  },
];

export const MINSAL_PROTOCOLS = [
  {
    id: "tmert",
    title: "1. Protocolo TMERT (Tareas Repetitivas)",
    items: [
      {
        id: "tmert_matriz",
        label: "¿Existe matriz de identificación de tareas repetitivas?",
      },
      {
        id: "tmert_salud",
        label: "¿Se aplicó la lista de chequeo de salud (etapa inicial)?",
      },
      {
        id: "tmert_ergonomia",
        label: "¿Se implementaron mejoras ergonómicas en puestos críticos?",
      },
      {
        id: "tmert_capacitacion",
        label: "¿Capacitación anual realizada y registrada?",
      },
    ],
  },
  {
    id: "prexor",
    title: "2. Protocolo PREXOR (Ruido Ocupacional)",
    items: [
      {
        id: "prexor_dosimetria",
        label: "¿Existe informe de dosimetría vigente (Mutualidad)?",
      },
      {
        id: "prexor_senalizacion",
        label: "¿Las zonas de alto ruido están señalizadas?",
      },
      {
        id: "prexor_vigilancia",
        label: "¿Trabajadores expuestos están en vigilancia médica?",
      },
      {
        id: "prexor_ajuste",
        label: "¿Se realiza prueba de ajuste (Fit Test) de protectores?",
      },
    ],
  },
  {
    id: "ceal_sm",
    title: "3. Protocolo CEAL-SM (Riesgos Psicosociales)",
    items: [
      {
        id: "cealsm_comite",
        label: "¿Constitución del Comité de Aplicación (CdA)?",
      },
      {
        id: "cealsm_sensibilizacion",
        label: "¿Campaña de sensibilización y difusión completada?",
      },
      {
        id: "cealsm_cuestionario",
        label: "¿Aplicación del cuestionario (mínimo 60% participación)?",
      },
      {
        id: "cealsm_accion",
        label: "¿Plan de acción diseñado para dimensiones en rojo?",
      },
    ],
  },
  {
    id: "planesi",
    title: "4. Protocolo PLANESI (Sílice)",
    items: [
      {
        id: "planesi_inventario",
        label: "¿Inventario de materiales que contienen sílice?",
      },
      {
        id: "planesi_humedo",
        label: "¿Implementación de métodos húmedos o captación de polvo?",
      },
      {
        id: "planesi_torax",
        label: "¿Exámenes de tórax (OIT) realizados a los expuestos?",
      },
      {
        id: "planesi_respiradores",
        label: "¿Registro de entrega de respiradores con filtros P100?",
      },
    ],
  },
  {
    id: "uv_solar",
    title: "5. Guía Técnica Radiación UV (Solar)",
    items: [
      {
        id: "uv_indice",
        label: "¿Publicación diaria del índice UV en diario mural?",
      },
      {
        id: "uv_programa",
        label: "¿Programa escrito de protección contra radiación UV?",
      },
      {
        id: "uv_proteccion",
        label: "¿Entrega de elementos de protección (Bloqueador/Legionario)?",
      },
    ],
  },
];

export const GRD_QUESTIONS = [
  {
    id: 1,
    question:
      "¿El empleador ha identificado las amenazas, vulnerabilidades y evaluado los riesgos ante situaciones de emergencias potenciales, considerando las condiciones y procesos internos del centro de trabajo?",
    siAdvice:
      "Verificar el uso de la metodología SENAPRED (Guía Reducción Riesgo Desastres). Debe incluir Incendio, Corte de servicios, Asalto, Vectores, etc.",
    noAdvice:
      "Adoptar medidas de reducción del riesgo para eliminar o atenuar el riesgo grave e inminente.",
    legal: "Art. 184 y 184 bis Código del Trabajo; Dto. N°2, 2023 Mintrab.",
  },
  {
    id: 2,
    question:
      "¿El empleador ha identificado las amenazas, vulnerabilidades y evaluado los riesgos considerando las condiciones y procesos del entorno (sitios, empresas colindantes)?",
    siAdvice:
      "Verificar visor Chile Preparado de SENAPRED (tsunami, erupción, incendio forestal) y visor Sernageomin (remoción en masa).",
    noAdvice:
      "Actualizar el diagnóstico del centro de trabajo considerando amenazas de origen natural o antrópico del entorno.",
    legal: "Art. 184 y 184 bis Código del Trabajo; Dto. N°2, 2023 Mintrab.",
  },
  {
    id: 3,
    question:
      "¿Se mantienen en buenas condiciones de conservación las paredes, cielos rasos, puertas y ventanas y demás elementos estructurales?",
    siAdvice:
      "Verificar que elementos estructurales no afecten la vida/seguridad en caso de evento natural o humano.",
    noAdvice:
      "Reparar o reforzar condiciones de edificación para no afectar a los trabajadores.",
    legal: "Art. 184/184 bis Cód. Trabajo; Art. 6 D.S. 594.",
  },
  {
    id: 4,
    question:
      "¿Se mantienen los pisos y pasillos de tránsito libres de todo obstáculo que impida un fácil y seguro desplazamiento o evacuación?",
    siAdvice:
      "Mantener permanentemente libre de obstáculos para un desplazamiento expedito.",
    noAdvice:
      "Despejar pasillos tanto para tareas habituales como para evacuación.",
    legal: "Art. 184/184 bis Cód. Trabajo; Art. 7 D.S. 594.",
  },
  {
    id: 5,
    question:
      "¿Los lugares de trabajo se mantienen en buenas condiciones de orden y limpieza?",
    siAdvice:
      "Evitar presencia de vectores y generación de incendios por acumulación de materiales.",
    noAdvice: "Implementar programa de orden y limpieza inmediato.",
    legal: "Art. 184/184 bis Cód. Trabajo; Art. 11 D.S. 594.",
  },
  {
    id: 6,
    question:
      "¿Se toman las medidas efectivas para evitar la entrada o eliminar la presencia de insectos, roedores y otras plagas?",
    siAdvice: "Mantener medidas preventivas y de control sanitario.",
    noAdvice: "Prevenir y controlar vectores que pongan en riesgo la salud.",
    legal: "Art. 184/184 bis Cód. Trabajo; Art. 11 D.S. 594.",
  },
  {
    id: 7,
    question: "¿Los casilleros se encuentran empotrados o anclados?",
    siAdvice:
      "Evitar que puedan caer o bloquear vías de escape durante un sismo.",
    noAdvice: "Anclar o empotrar casilleros inmediatamente.",
    legal: "Art. 37 D.S. 594.",
  },
  {
    id: 8,
    question:
      "¿En caso de almacenamiento de materiales, cuentan con sistemas de retención para evitar caídas por movimientos?",
    siAdvice: "Verificar elementos de retención de material almacenado.",
    noAdvice: "Instalar sistemas de retención (barras, mallas, etc.).",
    legal: "Art. 42 D.S. 594.",
  },
  {
    id: 9,
    question:
      "¿Cuenta con agua potable autorizada para consumo humano e higiene?",
    siAdvice:
      "Verificar resolución sanitaria. En caso de estanque, debe estar autorizado.",
    noAdvice:
      "Disponer de agua potable certificada. Suspender labores si no hay agua.",
    legal: "Art. 12 D.S. 594.",
  },
  {
    id: 10,
    question:
      "¿Realiza evaluaciones periódicas de calidad del agua si existen estanques de reserva?",
    siAdvice:
      "Certificar potabilidad del agua almacenada con análisis periódicos.",
    noAdvice: "Realizar evaluaciones inmediatas de potabilidad.",
    legal: "Art. 13 D.S. 594.",
  },
  {
    id: 11,
    question:
      "¿Las instalaciones eléctricas están protegidas y en buen estado (canalización, diferenciales, enchufes)?",
    siAdvice:
      "Revisar conformidad con Reglamento de Seguridad de Instalaciones SEC.",
    noAdvice: "Corregir instalaciones defectuosas o expuestas.",
    legal: "Art. 39 D.S. 594.",
  },
  {
    id: 12,
    question: "¿El sistema eléctrico funciona sin sobrecarga eléctrica?",
    siAdvice: "Verificar que no existan cortes frecuentes por exceso de carga.",
    noAdvice: "Reparar y balancear cargas del sistema eléctrico.",
    legal: "Art. 39 D.S. 594.",
  },
  {
    id: 13,
    question:
      "¿Las extensiones eléctricas (alargadores/zapatillas) cuentan con certificación SEC?",
    siAdvice: "Verificar sello SEC en cada dispositivo de extensión.",
    noAdvice: "Reemplazar por unidades certificadas.",
    legal: "Art. 39 D.S. 594.",
  },
  {
    id: 14,
    question:
      "¿Las extensiones eléctricas se utilizan dentro de su carga máxima permitida?",
    siAdvice:
      "Evitar 'cascadas' de alargadores y sobrepaso de potencia del fabricante.",
    noAdvice: "Distribuir cargas y evitar sobrecargar extensiones.",
    legal: "Art. 39 D.S. 594.",
  },
  {
    id: 15,
    question:
      "¿Se realizan mantenciones preventivas al sistema eléctrico por instalador autorizado SEC?",
    siAdvice:
      "Contar con programa de mantención y certificados de instalador SEC.",
    noAdvice: "Contratar técnico autorizado para revisión preventiva.",
    legal: "Art. 39 D.S. 594.",
  },
  {
    id: 16,
    question:
      "¿Se realizan mantenciones preventivas al grupo electrógeno (si aplica)?",
    siAdvice:
      "Efectuar mantención motor-alternador según manual del fabricante.",
    noAdvice: "Establecer programa de mantenimiento preventivo.",
    legal: "Art. 36 D.S. 594.",
  },
  {
    id: 17,
    question:
      "¿Existen mantenciones preventivas a instalaciones de gas por instalador SEC?",
    siAdvice: "Programa de mantención con técnico autorizado SEC vigente.",
    noAdvice: "Regularizar mantenciones de gas de inmediato.",
    legal: "Art. 39 D.S. 594.",
  },
  {
    id: 18,
    question:
      "¿Cuenta con plan de mantenimiento de instalaciones de combustibles líquidos (SEC)?",
    siAdvice:
      "Verificar registros de mantenimiento según Dto 160 del Ministerio de Economía.",
    noAdvice: "Establecer programa de mantenimiento preventivo y correctivo.",
    legal: "Dto 160, 2008 Economía.",
  },
  {
    id: 19,
    question:
      "¿Cuenta con programa de inspección de cargas de combustible y fuentes de calor?",
    siAdvice:
      "Controlar proximidad de calor a inflamables y prohibición de fumar.",
    noAdvice: "Implementar cronograma de inspección y responsables.",
    legal: "Art. 44 D.S. 594.",
  },
  {
    id: 20,
    question: "¿El control de productos combustibles incluye orden y limpieza?",
    siAdvice: "Evitar acumulación de basura o residuos inflamables.",
    noAdvice: "Incorporar orden y limpieza al programa de inspección.",
    legal: "Art. 44 D.S. 594.",
  },
  {
    id: 21,
    question:
      "¿Se prohíbe fumar y encender fuego en áreas de almacenamiento de inflamables?",
    siAdvice: "Verificar señalética reglamentaria visible.",
    noAdvice: "Instalar señalización de prohibición de inmediato.",
    legal: "Art. 44 D.S. 594.",
  },
  {
    id: 22,
    question:
      "¿Cuenta con extintores adecuados al tipo de fuego/material presente?",
    siAdvice:
      "Adecuar extintor (PQS, CO2, etc.) al riesgo (Madera, Papel, Electricidad).",
    noAdvice: "Reemplazar o adicionar extintores del tipo correcto.",
    legal: "Art. 45 D.S. 594.",
  },
  {
    id: 23,
    question:
      "¿Los extintores son accesibles, están señalizados y libres de obstáculos?",
    siAdvice: "Altura reglamentaria, señalética y despeje garantizado.",
    noAdvice: "Reubicar, señalizar o despejar extintores de inmediato.",
    legal: "Art. 47 D.S. 594.",
  },
  {
    id: 24,
    question:
      "¿Los trabajadores están instruidos y entrenados en el uso de extintores?",
    siAdvice:
      "Registros de capacitación teórica-práctica firmados por personal.",
    noAdvice: "Realizar capacitación práctica de combate de incendios.",
    legal: "Art. 48 D.S. 594.",
  },
  {
    id: 25,
    question:
      "¿Se realizan mantenciones preventivas a sistemas automáticos de extinción/alarma?",
    siAdvice:
      "Programación y ejecución de mantenciones preventivas registradas.",
    noAdvice: "Establecer cronograma de mantenimiento de sistemas críticos.",
    legal: "Art. 36 D.S. 594.",
  },
  {
    id: 26,
    question:
      "¿Se realizan mantenciones a la red húmeda y red seca (si aplica)?",
    siAdvice:
      "Obligatorio en edificios públicos o >3 pisos (Húmeda) y >5 pisos (Seca).",
    noAdvice: "Realizar mantenciones periódicas y documentadas.",
    legal: "Art. 36 D.S. 594.",
  },
  {
    id: 27,
    question: "¿Las zonas de seguridad se encuentran fuera del área de riesgo?",
    siAdvice:
      "Evaluar amenazas específicas (tsunami cota 30, sismo caída estructuras).",
    noAdvice: "Redefinir zonas de seguridad con asesoría técnica.",
    legal: "Art. 37 D.S. 594.",
  },
  {
    id: 28,
    question:
      "¿Las zonas de seguridad están despejadas y libres de nuevos riesgos?",
    siAdvice:
      "Verificar que no existan cables eléctricos o vidrios que caigan sobre la zona.",
    noAdvice: "Despejar y asegurar entorno de la zona de seguridad.",
    legal: "Art. 37 D.S. 594.",
  },
  {
    id: 29,
    question: "¿Están señalizadas las vías de evacuación y zonas de seguridad?",
    siAdvice: "Señalética fotoluminiscente según norma, visible y clara.",
    noAdvice: "Instalar señalética reglamentaria en todas las rutas.",
    legal: "Art. 37 D.S. 594.",
  },
  {
    id: 30,
    question:
      "¿Existen señalizaciones en otros idiomas si hay trabajadores extranjeros?",
    siAdvice:
      "Garantizar comprensión total de la emergencia para todo el personal.",
    noAdvice: "Adicionar señalética bilingüe según corresponda.",
    legal: "Art. 37 D.S. 594.",
  },
  {
    id: 31,
    question:
      "¿Las puertas de salida se abren en el sentido de la evacuación y no tienen llave?",
    siAdvice:
      "Fácil apertura, sin candados que requieran llaves durante la jornada.",
    noAdvice: "Cambiar sentido de apertura o retirar bloqueos/llaves.",
    legal: "Art. 37 D.S. 594.",
  },
  {
    id: 32,
    question:
      "¿Existen medidas de adecuación física para personas con discapacidad?",
    siAdvice: "Ramplas, barandas, alarmas visuales, apoyos técnicos.",
    noAdvice: "Implementar programa de adecuación inclusiva.",
    legal: "Ley 20.422; Art. 37 D.S. 594.",
  },
  {
    id: 33,
    question: "¿Dispone de sistema de iluminación de emergencia?",
    siAdvice:
      "Instalado en pasillos, salidas, escaleras y cambios de dirección.",
    noAdvice: "Instalar equipos autónomos según RIC N°08.",
    legal: "RIC N°08 SEC; Art. 37 D.S. 594.",
  },
  {
    id: 34,
    question:
      "¿El sistema de iluminación de emergencia funciona correctamente?",
    siAdvice: "Autonomía mínima de 90 minutos garantizada.",
    noAdvice: "Reemplazar baterías o equipos defectuosos.",
    legal: "RIC N°08 SEC.",
  },
  {
    id: 35,
    question:
      "¿Se realizan mantenciones preventivas a la iluminación de emergencia?",
    siAdvice: "Pruebas de descarga mensual y registros de mantenimiento.",
    noAdvice: "Implementar programa de mantenimiento preventivo.",
    legal: "Art. 36 D.S. 594.",
  },
  {
    id: 36,
    question:
      "¿Luces de emergencia instaladas en salidas, giros y exterior de la edificación?",
    siAdvice:
      "Verificar cobertura total de la ruta hasta la zona de seguridad.",
    noAdvice: "Completar instalación en puntos ciegos de la evacuación.",
    legal: "RIC N°08 SEC.",
  },
  {
    id: 37,
    question:
      "¿Cuenta con plan de emergencia para bodegas de sustancias peligrosas (SUSPEL)?",
    siAdvice:
      "Incluir planos escala, listado SUSPEL, cadena de mando y simulacros anuales.",
    noAdvice: "Elaborar plan según contenidos del Art. 190 D.S. 43/15.",
    legal: "D.S. 43/15 Salud; Art. 42 D.S. 594.",
  },
  {
    id: 38,
    question:
      "¿Cuenta con un plan de emergencia o respuesta específico por cada amenaza identificada?",
    siAdvice:
      "Evitar planes genéricos. Usar metodología ACCEDER por cada evento.",
    noAdvice: "Desarrollar planes específicos para sismos, incendios, etc.",
    legal: "Art. 184 Cód. Trabajo; Dto. N°2 Mintrab.",
  },
  {
    id: 39,
    question:
      "¿Trabajadores informados y capacitados en el plan de emergencia específico?",
    siAdvice: "Verificar difusión y comprensión mediante test o ejercicios.",
    noAdvice: "Capacitar a todo el personal en los protocolos de respuesta.",
    legal: "Art. 21 D.S. 40.",
  },
  {
    id: 40,
    question:
      "¿Cada plan de emergencia considera los elementos de la metodología ACCEDER?",
    siAdvice:
      "Alarma, Comunicación, Coordinación, Evaluación, Decisiones, Etc.",
    noAdvice: "Estructurar planes bajo el estándar ACCEDER.",
    legal: "Art. 184 Cód. Trabajo.",
  },
  {
    id: 41,
    question:
      "¿Considera amenazas naturales, biológicas y humanas (Sismo, Incendio, Corte Agua, Robo)?",
    siAdvice:
      "Mínimo obligatorio: Sismo, Incendio, Corte de servicios, Asalto/Robo.",
    noAdvice: "Incorporar amenazas mínimas obligatorias al plan.",
    legal: "Art. 184 Cód. Trabajo.",
  },
  {
    id: 42,
    question:
      "¿Considera el tipo de alarma a activar según el tipo de amenaza?",
    siAdvice:
      "Diferenciar sonidos (Sismo vs Incendio) si es posible comunicarlo.",
    noAdvice: "Definir y estandarizar señales de alerta.",
    legal: "Art. 184 Cód. Trabajo.",
  },
  {
    id: 43,
    question:
      "¿Sistemas de alarma consideran a personas con discapacidad o idioma extranjero?",
    siAdvice:
      "Alarmas visuales (estroboscópicas) y métodos de alerta inclusivos.",
    noAdvice: "Implementar medios adecuados para alertar a todos.",
    legal: "Art. 184 Cód. Trabajo.",
  },
  {
    id: 44,
    question:
      "¿El plan considera el sistema de comunicación interna y externa?",
    siAdvice:
      "Listado teléfonos emergencia, cadena de mando y reporte a autoridades.",
    noAdvice: "Definir flujo de comunicación crítica.",
    legal: "Art. 184 Cód. Trabajo.",
  },
  {
    id: 45,
    question:
      "¿Considera la coordinación con Carabineros, Bomberos y Ambulancia?",
    siAdvice:
      "Roles definidos: ¿quién llama?, ¿qué informa?, ¿quién recibe ayuda externa?.",
    noAdvice: "Establecer protocolo de coordinación con ABC de la emergencia.",
    legal: "Art. 184 Cód. Trabajo.",
  },
  {
    id: 46,
    question:
      "¿Plan de Tsunami obliga a evacuar ante 'Evacuación Preventiva' de autoridad?",
    siAdvice: "Evacuar preventivamente antes de reportes SHOA, hacia cota 30.",
    noAdvice: "Incluir obligatoriedad de evacuación preventiva.",
    legal: "Art. 184 Cód. Trabajo.",
  },
  {
    id: 47,
    question: "¿Publicado plano/croquis de emergencia con riesgos y recursos?",
    siAdvice:
      "Ubicación de extintores, rutas, zonas y tableros eléctricos en mapas.",
    noAdvice: "Confeccionar y publicar mapas de emergencia.",
    legal: "Art. 184 Cód. Trabajo.",
  },
  {
    id: 48,
    question:
      "¿Programados simulacros o simulaciones para ejercitar cada plan?",
    siAdvice: "Cronograma anual de ejercicios de diversa complejidad.",
    noAdvice: "Programar simulacros para el periodo actual.",
    legal: "Art. 184 Cód. Trabajo.",
  },
  {
    id: 49,
    question: "¿Existe programa de revisiones periódicas post-simulacros?",
    siAdvice: "Actualizar planes según brechas detectadas en los ejercicios.",
    noAdvice: "Implementar mejora continua post-ejercicios.",
    legal: "Art. 184 Cód. Trabajo.",
  },
  {
    id: 50,
    question:
      "¿Existen medios de apoyo para evacuación de personas con movilidad reducida?",
    siAdvice: "Garantizar colaboración para traslado, autonomía y dignidad.",
    noAdvice: "Designar 'monitores de apoyo' para personas con discapacidad.",
    legal: "Ley 20.422; Art. 184 Cód. Trabajo.",
  },
  {
    id: 51,
    question:
      "¿Empresa Principal tiene planes GRD que incluyen a contratistas (>50 trab)?",
    siAdvice: "Metodología ACCEDER integrada en el Sistema de Gestión (DS 76).",
    noAdvice: "Integrar planes de emergencia en programa de SST.",
    legal: "D.S. 76; Dto. N°2, 2023 Mintrab.",
  },
  {
    id: 52,
    question:
      "¿Plan de la Empresa Principal fue dado a conocer a todas las contratistas?",
    siAdvice:
      "Registros de entrega a Comités Paritarios y Deptos de Prevención.",
    noAdvice: "Socializar planes con todas las empresas presentes en faena.",
    legal: "D.S. 76; Dto. N°2, 2023 Mintrab.",
  },
  {
    id: 53,
    question:
      "¿Simulacros incluyen a trabajadores de empresas contratistas y subcontratistas?",
    siAdvice: "Participación total de la faena en ejercicios de evacuación.",
    noAdvice: "Coordinar simulacros masivos que incluyan a todos.",
    legal: "Art. 6 D.S. 76.",
  },
  {
    id: 54,
    question:
      "¿Empleador protege condiciones de vida/salud de terceros contratistas (no subcontratación)?",
    siAdvice:
      "Obligación de proteger a todo quien se desempeñe en sus instalaciones.",
    noAdvice:
      "Extender protocolos de emergencia a empresas prestadoras de servicio.",
    legal: "Art. 3 D.S. 594.",
  },
  {
    id: 55,
    question:
      "¿Locales de uso público (>100 pers) tienen plan coordinado con instituciones?",
    siAdvice:
      "Coordinación con ABC (Bomberos/Carabineros) para malls o similar.",
    noAdvice: "Elaborar plan de evacuación coordinado para uso público masivo.",
    legal: "Art. 5 D.S. 10, 2010 Salud.",
  },
  {
    id: 56,
    question:
      "¿Cumple con prescripciones de Mutual en gestión del riesgo de desastres?",
    siAdvice:
      "Evidencia de levantamiento de medidas indicadas por el organismo administrador.",
    noAdvice: "Regularizar medidas prescritas por Mutual de Seguridad.",
    legal: "Art. 68 Ley 16.744.",
  },
];
