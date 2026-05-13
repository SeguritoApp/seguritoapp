export interface MiperRiskClassification {
  categoria: string;
  familia: string;
  especifico: string;
  definicion: string;
  codigo: string;
}

export const MIPER_LEGAL_RISKS: MiperRiskClassification[] = [
  // RIESGOS DE SEGURIDAD
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Caída de personas",
    especifico: "Caídas al mismo nivel",
    definicion: "Caída que se produce en el mismo plano de sustentación.",
    codigo: "A1",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Caída de personas",
    especifico: "Caídas a distinto nivel",
    definicion: "Caída a un plano inferior desde menos de 1.8 mts.",
    codigo: "A2",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Caída de personas",
    especifico: "Caídas de altura",
    definicion: "Caída a un plano inferior desde más de 1.8 mts.",
    codigo: "A3",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Caída de personas",
    especifico: "Caídas al agua",
    definicion: "Caída a un curso de agua natural o estructura con agua.",
    codigo: "A4",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con objetos",
    especifico: "Atrapamiento",
    definicion:
      "Enganche o aprisionamiento del cuerpo, o parte de éste, por mecanismos de las máquinas, objetos, piezas, materiales, equipos o vehículos que han perdido su estabilidad.",
    codigo: "B1",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con objetos",
    especifico: "Caída de objetos",
    definicion:
      "Caída de elementos que golpean al cuerpo, por ejemplo, materiales, herramientas, estructuras, etc.",
    codigo: "B2",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con objetos",
    especifico: "Cortes por objetos/herramientas cortopunzantes",
    definicion:
      "Cortes y/o punzaciones generadas en parte del cuerpo debido al contacto de éste con objetos cortantes, punzantes y/o abrasivos.",
    codigo: "B3",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con objetos",
    especifico: "Choque contra objetos",
    definicion:
      "Encuentro violento del cuerpo, o de una parte de éste, con uno o varios objetos, estén éstos en movimiento o no.",
    codigo: "B4",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con seres vivos",
    especifico: "Contacto con personas",
    definicion:
      "Lesiones recibidas en el cuerpo, o parte de éste (agresiones, patadas, mordiscos, etc.) debido a la acción de otras personas.",
    codigo: "C1",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con seres vivos",
    especifico: "Contacto con animales y/o insectos",
    definicion:
      "Lesiones recibidas en el cuerpo, o parte de éste (arañazos, patadas, mordiscos, etc.) debido a la interacción con animales y/o insectos.",
    codigo: "C2",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contactos térmicos",
    especifico: "Contactos térmicos por calor",
    definicion:
      "Acción y efecto de hacer contacto físico con superficies o productos calientes.",
    codigo: "E1",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contactos térmicos",
    especifico: "Contactos térmicos por frío",
    definicion: "Contacto físico con superficies o productos fríos.",
    codigo: "E2",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con energía eléctrica",
    especifico: "Contactos eléctricos directos baja tensión",
    definicion: "Contacto directo con partes activas en tensión (<1000 volts).",
    codigo: "F1",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con energía eléctrica",
    especifico: "Contactos eléctricos directos alta tensión",
    definicion: "Contacto directo con partes activas en tensión (>1000 volts).",
    codigo: "F2",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con energía eléctrica",
    especifico: "Contactos eléctricos indirectos baja tensión",
    definicion: "Contacto con masas accidentalmente en tensión (<1000 volts).",
    codigo: "F3",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con energía eléctrica",
    especifico: "Contactos eléctricos indirectos alta tensión",
    definicion: "Contacto con masas accidentalmente en tensión (>1000 volts).",
    codigo: "F4",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con sustancias químicas",
    especifico: "Contacto con sustancias cáusticas y/o corrosivas",
    definicion:
      "Contacto con sustancias cáusticas que causan lesiones en la piel.",
    codigo: "G1",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con sustancias químicas",
    especifico: "Contacto con otras sustancias químicas",
    definicion:
      "Contacto con sustancias no cáusticas que causan lesiones en la piel.",
    codigo: "G2",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con elementos que se proyectan",
    especifico: "Explosiones",
    definicion: "Liberación brusca de energía que genera presión y calor.",
    codigo: "H1",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con elementos que se proyectan",
    especifico: "Proyección de fragmentos y/o partículas",
    definicion:
      "Contacto violento con fragmentos proyectados como piezas o partículas.",
    codigo: "H2",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con/en Vehículos en movimiento",
    especifico: "Atropellos o golpes con vehículos",
    definicion: "Impacto entre peatón y vehículo en movimiento.",
    codigo: "I1",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Contacto con/en Vehículos en movimiento",
    especifico: "Choque, colisión o volcamiento",
    definicion: "Lesiones por choque, colisión o volcamiento de vehículos.",
    codigo: "I2",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Incendios",
    especifico: "Incendios",
    definicion:
      "Fuego incontrolado que genera lesiones por gases o altas temperaturas.",
    codigo: "J",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Exposición a condiciones atmosféricas extremas",
    especifico: "Exposición a ambientes con deficiencia de oxígeno",
    definicion: "Exposición a atmósfera con déficit de oxígeno (<19.5%).",
    codigo: "K1",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Exposición a condiciones atmosféricas extremas",
    especifico: "Exposición a sustancias químicas tóxicas",
    definicion:
      "Exposición a atmósfera con altas concentraciones de químicos tóxicos.",
    codigo: "K2",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Exposición a altos niveles de radiación",
    especifico: "Exposición a radiaciones no ionizantes",
    definicion:
      "Exposición a altas dosis de radiaciones no ionizantes (UV, IR, etc.).",
    codigo: "L1",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Exposición a altos niveles de radiación",
    especifico: "Exposición a radiaciones ionizantes",
    definicion:
      "Exposición a altas dosis de radiaciones ionizantes (rayos X, gamma).",
    codigo: "L2",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Ingesta de sustancias nocivas",
    especifico: "Ingesta de sustancias nocivas",
    definicion: "Ingesta de sustancias que alteran la salud del trabajador.",
    codigo: "M",
  },
  {
    categoria: "RIESGOS DE SEGURIDAD",
    familia: "Otros riesgos",
    especifico: "Otros riesgos",
    definicion: "Riesgos no descritos en ítems anteriores.",
    codigo: "N",
  },

  // RIESGOS HIGIÉNICOS
  {
    categoria: "RIESGOS HIGIÉNICOS",
    familia: "Exposición a agentes químicos",
    especifico: "Exposición a aerosoles sólidos",
    definicion:
      "Permanencia en ambientes con partículas sólidas en suspensión.",
    codigo: "O1",
  },
  {
    categoria: "RIESGOS HIGIÉNICOS",
    familia: "Exposición a agentes químicos",
    especifico: "Exposición a aerosoles líquidos",
    definicion:
      "Permanencia en ambientes con partículas líquidas en suspensión.",
    codigo: "O2",
  },
  {
    categoria: "RIESGOS HIGIÉNICOS",
    familia: "Exposición a agentes químicos",
    especifico: "Exposición a gases y vapores",
    definicion: "Permanencia en ambientes con sustancias en estado gaseoso.",
    codigo: "O3",
  },
  {
    categoria: "RIESGOS HIGIÉNICOS",
    familia: "Exposición a agentes físicos",
    especifico: "Exposición a ruido",
    definicion: "Permanencia en ambientes con altos niveles de presión sonora.",
    codigo: "P1",
  },
  {
    categoria: "RIESGOS HIGIÉNICOS",
    familia: "Exposición a agentes físicos",
    especifico: "Exposición a Vibraciones",
    definicion:
      "Permanencia en ambientes con energía vibratoria transferida al cuerpo.",
    codigo: "P2",
  },
  {
    categoria: "RIESGOS HIGIÉNICOS",
    familia: "Exposición a agentes físicos",
    especifico: "Exposición a Radiaciones Ionizantes",
    definicion: "Permanencia en ambientes con radiaciones ionizantes.",
    codigo: "P3",
  },
  {
    categoria: "RIESGOS HIGIÉNICOS",
    familia: "Exposición a agentes físicos",
    especifico: "Exposición a Radiaciones No Ionizantes",
    definicion: "Permanencia en ambientes con radiaciones no ionizantes.",
    codigo: "P4",
  },
  {
    categoria: "RIESGOS HIGIÉNICOS",
    familia: "Exposición a agentes físicos",
    especifico: "Exposición a Calor",
    definicion: "Permanencia en ambientes con altas temperaturas.",
    codigo: "P5",
  },
  {
    categoria: "RIESGOS HIGIÉNICOS",
    familia: "Exposición a agentes físicos",
    especifico: "Exposición a Frío",
    definicion: "Permanencia en ambientes con bajas temperaturas.",
    codigo: "P6",
  },
  {
    categoria: "RIESGOS HIGIÉNICOS",
    familia: "Exposición a agentes físicos",
    especifico: "Exposición a Altas presiones",
    definicion:
      "Permanencia en ambientes con presiones superiores a la atmosférica.",
    codigo: "P7",
  },
  {
    categoria: "RIESGOS HIGIÉNICOS",
    familia: "Exposición a agentes físicos",
    especifico: "Exposición a Bajas presiones",
    definicion:
      "Permanencia en ambientes con presiones inferiores a la atmosférica.",
    codigo: "P8",
  },
  {
    categoria: "RIESGOS HIGIÉNICOS",
    familia: "Exposición a agentes biológicos",
    especifico: "Transmisión por sangre y fluidos",
    definicion: "Inoculación de agentes biológicos por sangre o fluidos.",
    codigo: "Q1",
  },
  {
    categoria: "RIESGOS HIGIÉNICOS",
    familia: "Exposición a agentes biológicos",
    especifico: "Transmisión aérea, hídrica y por contacto",
    definicion:
      "Exposición a agentes biológicos por transmisión aérea, hídrica o por contacto.",
    codigo: "Q2",
  },

  // RIESGOS MÚSCULO ESQUELÉTICOS
  {
    categoria: "RIESGOS MÚSCULO ESQUELÉTICOS",
    familia: "Manejo o Manipulación Manual de Carga (MMC) o Personas (MMP)",
    especifico: "Sobrecarga física debido a la manipulación manual de cargas",
    definicion:
      "Trabajos que implican levantar, descender o transportar manualmente objetos de más de 3 kg.",
    codigo: "R1",
  },
  {
    categoria: "RIESGOS MÚSCULO ESQUELÉTICOS",
    familia: "Manejo o Manipulación Manual de Carga (MMC) o Personas (MMP)",
    especifico:
      "Sobrecarga física debido a la manipulación de personas/pacientes",
    definicion: "Trabajos que implican manejo manual de personas/pacientes.",
    codigo: "R2",
  },
  {
    categoria: "RIESGOS MÚSCULO ESQUELÉTICOS",
    familia: "Trabajo repetitivo de la extremidad superior",
    especifico:
      "Sobrecarga física debido al trabajo repetitivo de las extremidades superiores",
    definicion:
      "Tareas que implican movimientos repetitivos de las extremidades superiores.",
    codigo: "S1",
  },
  {
    categoria: "RIESGOS MÚSCULO ESQUELÉTICOS",
    familia: "Sobrecarga Postural (postura mantenida y/o forzada)",
    especifico: "Sobrecarga Postural debido a trabajo de pie",
    definicion:
      "Trabajos en posición bípeda permanente con escasa alternancia postural.",
    codigo: "T1",
  },
  {
    categoria: "RIESGOS MÚSCULO ESQUELÉTICOS",
    familia: "Sobrecarga Postural (postura mantenida y/o forzada)",
    especifico: "Sobrecarga Postural debido a trabajo sentado",
    definicion:
      "Trabajos en posición sentado mantenido por períodos prolongados.",
    codigo: "T2",
  },
  {
    categoria: "RIESGOS MÚSCULO ESQUELÉTICOS",
    familia: "Sobrecarga Postural (postura mantenida y/o forzada)",
    especifico: "Sobrecarga Postural debido a trabajo en cuclillas (agachado)",
    definicion: "Trabajos en posición de cuclillas por tiempos prolongados.",
    codigo: "T3",
  },
  {
    categoria: "RIESGOS MÚSCULO ESQUELÉTICOS",
    familia: "Sobrecarga Postural (postura mantenida y/o forzada)",
    especifico: "Sobrecarga Postural debido a trabajo arrodillado",
    definicion:
      "Trabajos que implican compresión directa sobre las rodillas sostenidamente.",
    codigo: "T4",
  },
  {
    categoria: "RIESGOS MÚSCULO ESQUELÉTICOS",
    familia: "Sobrecarga Postural (postura mantenida y/o forzada)",
    especifico:
      "Sobrecarga Postural debido a tronco inclinado, en torsión o lateralización",
    definicion:
      "Trabajos con posturas del tronco fuera del rango neutro o de confort.",
    codigo: "T5",
  },
  {
    categoria: "RIESGOS MÚSCULO ESQUELÉTICOS",
    familia: "Sobrecarga Postural (postura mantenida y/o forzada)",
    especifico:
      "Sobrecarga Postural debido a trabajo fuera del alcance funcional",
    definicion:
      "Trabajos que implican movimientos fuera del alcance funcional.",
    codigo: "T6",
  },
  {
    categoria: "RIESGOS MÚSCULO ESQUELÉTICOS",
    familia: "Sobrecarga Postural (postura mantenida y/o forzada)",
    especifico: "Sobrecarga Postural debido a otras posturas",
    definicion: "Otras posturas no definidas en los ítems anteriores.",
    codigo: "T7",
  },

  // RIESGOS PSICOSOCIALES LABORALES
  {
    categoria: "RIESGOS PSICOSOCIALES LABORALES",
    familia: "Riesgos Psicosociales Laborales",
    especifico: "Exigencias psicológicas en el trabajo",
    definicion: "Involucra exigencias emocionales, creativas y cuantitativas.",
    codigo: "D1",
  },
  {
    categoria: "RIESGOS PSICOSOCIALES LABORALES",
    familia: "Riesgos Psicosociales Laborales",
    especifico: "Trabajo activo y desarrollo de habilidades",
    definicion: "Se refiere a la autonomía del trabajador sobre su trabajo.",
    codigo: "D2",
  },
  {
    categoria: "RIESGOS PSICOSOCIALES LABORALES",
    familia: "Riesgos Psicosociales Laborales",
    especifico: "Apoyo social en la empresa y calidad del liderazgo",
    definicion: "Calidad del apoyo social y liderazgo dentro de la empresa.",
    codigo: "D3",
  },
  {
    categoria: "RIESGOS PSICOSOCIALES LABORALES",
    familia: "Riesgos Psicosociales Laborales",
    especifico: "Compensaciones",
    definicion:
      "Equilibrio entre esfuerzo y recompensas, estabilidad del empleo.",
    codigo: "D4",
  },
  {
    categoria: "RIESGOS PSICOSOCIALES LABORALES",
    familia: "Riesgos Psicosociales Laborales",
    especifico: "Doble presencia",
    definicion: "Preocupación por cumplir con tareas domésticas y laborales.",
    codigo: "D5",
  },
];
