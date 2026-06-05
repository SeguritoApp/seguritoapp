import { checkAndIncrementPDFLimit, auth, db } from "./firebase";
import { getDoc, doc as docFirestore } from "./firestore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getRiskLevel } from "../constants";

const savePDFWithLimit = async (doc: jsPDF, filename: string) => {
  if (await checkAndIncrementPDFLimit()) {
    doc.save(filename);
  }
};

interface PDFHeaderData {
  title: string;
  clientName: string;
  workCenter?: string;
  clientRut?: string;
  clientAddress?: string;
  authorName: string;
  license: string;
  signatureURL?: string;
  date: string;
  userPlan?: any;
}

const checkPDFLimitEarly = (header: PDFHeaderData): boolean => {
  const plan = header.userPlan?.subscriptionType || "free";
  const pdfCount = header.userPlan?.pdfCount || 0;
  const isTrialActive = header.userPlan?.isTrialActive || false;
  
  if (!isTrialActive) {
    if (plan === "free" && pdfCount >= 3) {
      alert("Has alcanzado el límite de tu plan gratuito. Actualiza a PRO para seguir generando documentos.");
      return false;
    }
  }
  return true;
};

const addHeader = (doc: jsPDF, data: PDFHeaderData) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Segurito Logo / Branding
  doc.setFillColor(255, 110, 0); // brand-orange
  doc.rect(0, 0, pageWidth, 25, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("SEGURITO", 15, 17);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("OFICINA TÉCNICA DE PREVENCIÓN DE RIESGOS", pageWidth - 15, 17, {
    align: "right",
  });

  // Report Info
  doc.setTextColor(40, 40, 45); // tech-ink
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.title.toUpperCase(), 15, 40);

  doc.setFontSize(10);
  doc.text(`CLIENTE: ${data.clientName}`, 15, 50);
  
  if (data.workCenter) {
    doc.text(`CENTRO: ${data.workCenter}`, 15, 56);
    doc.text(`FECHA: ${data.date}`, pageWidth - 15, 50, { align: "right" });
    doc.setDrawColor(230, 230, 230);
    doc.line(15, 61, pageWidth - 15, 61);
  } else {
    doc.text(`FECHA: ${data.date}`, pageWidth - 15, 50, { align: "right" });
    doc.setDrawColor(230, 230, 230);
    doc.line(15, 55, pageWidth - 15, 55);
  }
};

const addFooter = (doc: jsPDF, data: PDFHeaderData, pageNumber: number) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setDrawColor(230, 230, 230);
  doc.line(15, pageHeight - 40, pageWidth - 15, pageHeight - 40);

  // Signature & Professional Info (Bottom Left)
  if (data.signatureURL) {
    try {
      doc.addImage(data.signatureURL, "PNG", 15, pageHeight - 38, 30, 15);
    } catch (e) {
      console.error("Error adding signature to PDF", e);
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(40, 40, 45);
  doc.setFont("helvetica", "bold");
  doc.text(data.authorName.toUpperCase(), 15, pageHeight - 20);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`REGISTRO SEREMI: ${data.license}`, 15, pageHeight - 16);

  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(
    `Sello de Integridad Digital - SEGURITO PROFESIONAL`,
    15,
    pageHeight - 10,
  );

  doc.setFontSize(8);
  doc.text(`Página ${pageNumber}`, pageWidth - 15, pageHeight - 10, {
    align: "right",
  });

  const plan = data.userPlan?.subscriptionType || "free";
  if (plan === "free") {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.text("Generado por Segurito - Plan Gratuito", pageWidth / 2, pageHeight - 10, { align: "center" });
  }
};

export const generateCompliancePDF = (data: any, header: PDFHeaderData) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  addHeader(doc, header);

  // 1. General Info Table
  autoTable(doc, {
    startY: 65,
    margin: { top: 65, bottom: 45 },
    head: [["Identificación de Parámetros", "Datos Registrados"]],
    body: [
      ["Total de Trabajadores (por turno)", data.workers],
      ["Superficie del Establecimiento (m2)", `${data.surfaceArea} m2`],
      [
        "Condición de la Faena",
        data.isTemporarySite ? "TEMPORAL / CAMPAMENTO (Art. 24)" : "PERMANENTE",
      ],
      [
        "Suministro de Agua Potable (Art. 12)",
        data.hasPotableWater
          ? `CUMPLE (Req min. ${data.requiredWater} L/Día)`
          : "INCUMPLE",
      ],
      [
        "Guardarropía / Casilleros (Art. 27)",
        data.hasDressingRoom ? "HABILITADO / CUMPLE" : "NO POSEE / INCUMPLE",
      ],
      [
        "Comedor Habilitado (Art. 28)",
        data.hasDiningRoom ? "HABILITADO / CUMPLE" : "NO POSEE / INCUMPLE",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45] },
  });

  // 2. SSHH Validation Table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    margin: { top: 65, bottom: 45 },
    head: [
      [
        "Servicio Higiénico",
        "Cant. Instalada",
        "Mínimo Legal (D.S. 594)",
        "Cumplimiento",
      ],
    ],
    body: [
      [
        "Excusados (WC)",
        data.actualToilets,
        data.requiredToilets,
        data.actualToilets >= data.requiredToilets ? "CUMPLE" : "DÉFICIT",
      ],
      [
        "Lavatorios",
        data.actualWashbasins,
        data.requiredWashbasins,
        data.actualWashbasins >= data.requiredWashbasins ? "CUMPLE" : "DÉFICIT",
      ],
      [
        "Duchas",
        data.actualShowers,
        data.requiredShowers,
        data.actualShowers >= data.requiredShowers ? "CUMPLE" : "DÉFICIT",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45] },
  });

  // 3. Condition Checklist
  const checklistLabels: Record<string, string> = {
    solidFloor: "Pisos sólidos y no resbaladizos (Art. 5)",
    cleanWalls: "Paredes y cielos en buen estado (Art. 6)",
    ventilationNatural: "Ventilación natural adecuada (Art. 32)",
    ventilationMechanical: "Existencia Ventilación mecánica (Art. 34)",
    orderCleanliness: "Orden y limpieza general (Art. 11)",
    dangerSignage: "Señalización de peligro (Art. 37)",
    eppAvailable: "Entrega de EPP sin costo (Art. 53)",
    liquidWaste: "Gestión de residuos líquidos (Art. 16)",
    solidWaste: "Gestión de residuos sólidos (Art. 18)",
    fireEvacuation: "Vías de evacuación libres (Art. 37)",
    machineryProtection: "Protección de maquinaria (Art. 38)",
    electricalSafety: "Seguridad Eléctrica/Gas (Art. 39)",
    noiseControl: "Control ruido y vibraciones (Art. 70)",
    lightingAdequate: "Iluminación promedio adecuada (Art. 104)",
  };

  const checklistRows = Object.entries(data.checklist).map(([key, value]) => {
    return [
      checklistLabels[key] || key,
      value ? "SÍ" : "NO",
      value ? "OK" : "OBSERVADO",
    ];
  });

  // Add custom items if any
  if (data.customItems && data.customItems.length > 0) {
    data.customItems.forEach((item: any) => {
      checklistRows.push([
        `[Personalizado] ${item.label}`,
        item.value ? "SÍ" : "NO",
        item.value ? "OK" : "OBSERVADO",
      ]);
    });
  }

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    margin: { top: 65, bottom: 45 },
    head: [["Condiciones de Saneamiento y Seguridad", "Estado", "Resultado"]],
    body: checklistRows,
    theme: "striped",
    headStyles: { fillColor: [100, 100, 100] },
    styles: { fontSize: 8 },
  });

  // 4. Lighting & Observations
  const measurements = [];
  if (data.lightingMeasured !== undefined) {
    const lightingStatus =
      data.lightingMeasured < 150
        ? "INSUFICIENTE (Mín. 150 Lux pasillos)"
        : "CUMPLE";
    measurements.push([
      "Iluminación Medida",
      `${data.lightingMeasured} Lux (${lightingStatus})`,
    ]);
  }

  if (measurements.length > 0 || data.observations) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      margin: { top: 65, bottom: 45 },
      head: [["Parámetros Adicionales y Observaciones", "Valor / Detalle"]],
      body: [
        ...measurements,
        [
          "Observaciones Generales",
          data.observations || "Sin observaciones registradas",
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [40, 40, 45] },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: "auto" } },
    });
  }

  // 5. Fire Safety
  if (data.extinguishers && data.extinguishers.length > 0) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      margin: { top: 65, bottom: 45 },
      head: [
        [
          "Control de Extintores",
          "Potencial Req.",
          "Unidades Contadas",
          "Estado",
        ],
      ],
      body: [
        [
          "Dotación de Extintores (Art. 46)",
          data.requiredFirePotential || "N/A",
          data.extinguishers.length,
          "Registrado",
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [255, 110, 0] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      margin: { top: 65, bottom: 45 },
      head: [["ID/Serie", "Agente", "Ubicación", "Fab.", "Recarga", "Vto. PH", "Vto. Equipo"]],
      body: data.extinguishers.map((ext: any) => [
        ext.id,
        ext.type || "PQS",
        ext.location || "-",
        ext.fabricationDate || "-",
        ext.rechargeDate || "-",
        ext.phExpiryDate || "-",
        ext.expiry || ext.expiryDate,
      ]),
      theme: "plain",
      styles: { fontSize: 8 },
    });
  }

  // Metadata timestamps
  const finalY = (doc as any).lastAutoTable.finalY;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Fecha Creación Reporte: ${data.dateCreated || "No registrada"}`,
    15,
    finalY + 10,
  );
  doc.text(
    `Fecha Generación PDF: ${data.pdfGeneratedDate || "No registrada"}`,
    15,
    finalY + 14,
  );

  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHeader(doc, header);
    addFooter(doc, header, i);
  }
  savePDFWithLimit(doc, `Informe_DS594_${header.clientName.replace(/\s/g, "_")}.pdf`);
};

export const generateGanttPDF = (
  tasks: any[],
  header: PDFHeaderData,
  timeScale: "months" | "quarters" | "semesters" | "year" = "months",
) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "legal",
  });

  const getTaskMonthSpan = (start: string, end: string) => {
    const span = new Array(12).fill(false);
    if (!start || !end) return span;
    const s = new Date(`${start}T12:00:00Z`).getUTCMonth();
    const e = new Date(`${end}T12:00:00Z`).getUTCMonth();
    for (let i = 0; i < 12; i++) {
      if (s <= e) {
        if (i >= s && i <= e) span[i] = true;
      } else {
        if ((i >= s && i <= 11) || (i >= 0 && i <= e)) span[i] = true;
      }
    }
    return span;
  };

  const getTaskSpanForScale = (start: string, end: string, scale: string) => {
    const monthSpan = getTaskMonthSpan(start, end);
    if (scale === "months") return monthSpan;
    if (scale === "quarters")
      return [
        monthSpan.slice(0, 3).some(Boolean),
        monthSpan.slice(3, 6).some(Boolean),
        monthSpan.slice(6, 9).some(Boolean),
        monthSpan.slice(9, 12).some(Boolean),
      ];
    if (scale === "semesters")
      return [
        monthSpan.slice(0, 6).some(Boolean),
        monthSpan.slice(6, 12).some(Boolean),
      ];
    if (scale === "year") return [monthSpan.some(Boolean)];
    return monthSpan;
  };

  let scaleLabels: string[] = [];
  const colWidths: Record<number, any> = {
    0: { cellWidth: 60, fontSize: 8 },
    1: { cellWidth: 20, fontSize: 7, halign: "center" },
    2: { cellWidth: 20, fontSize: 7, halign: "center" },
    3: { cellWidth: 15, fontSize: 7, halign: "center" },
    4: { cellWidth: 15, fontSize: 7, halign: "center" },
  };

  if (timeScale === "months") {
    scaleLabels = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
    for (let i = 0; i < 12; i++) colWidths[i + 5] = { cellWidth: 10 };
  } else if (timeScale === "quarters") {
    scaleLabels = ["Q1", "Q2", "Q3", "Q4"];
    for (let i = 0; i < 4; i++) colWidths[i + 5] = { cellWidth: 30 };
  } else if (timeScale === "semesters") {
    scaleLabels = ["Sem 1", "Sem 2"];
    for (let i = 0; i < 2; i++) colWidths[i + 5] = { cellWidth: 60 };
  } else if (timeScale === "year") {
    scaleLabels = ["Año"];
    colWidths[5] = { cellWidth: 120 };
  }

  const bodyData = tasks.map((t) => {
    const span = getTaskSpanForScale(t.startDate, t.endDate, timeScale);
    return [
      t.title,
      t.responsable || "-",
      t.workCenter || "-",
      t.startDate.substring(5),
      t.endDate.substring(5),
      ...span.map((isSpanned) => (isSpanned ? "" : " ")), // Space placeholder for autoTable
    ];
  });

  autoTable(doc, {
    startY: 65,
    margin: { top: 65, bottom: 45 },
    head: [["Actividad", "Resp.", "Centro T.", "Inicio", "Fin", ...scaleLabels]],
    body: bodyData,
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], fontSize: 8, halign: "center" },
    columnStyles: colWidths,
    styles: {
      valign: "middle",
    },
    didDrawPage: (data) => {
      addHeader(doc, header);
      addFooter(doc, header, data.pageNumber);
    },
    willDrawCell: (data) => {
      // Paint Gantt blocks
      if (data.section === "body" && data.column.index >= 5) {
        const tIndex = data.row.index;
        const task = tasks[tIndex];
        const mIndex = data.column.index - 5;
        const span = getTaskSpanForScale(
          task.startDate,
          task.endDate,
          timeScale,
        );

        if (span[mIndex]) {
          let color = [249, 115, 22]; // Orange (default/in progress)
          if (task.status === "completed") color = [34, 197, 94]; // Green

          doc.setFillColor(color[0], color[1], color[2]);
          doc.rect(
            data.cell.x + 1,
            data.cell.y + 1,
            data.cell.width - 2,
            data.cell.height - 2,
            "F",
          );
        }
      }
    },
  });

  savePDFWithLimit(doc, `Carta_Gantt_${header.clientName.replace(/\s/g, "_")}.pdf`);
};

export const generateIPERPDF = (risks: any[], header: PDFHeaderData) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "letter",
  });

  autoTable(doc, {
    startY: 65,
    margin: { top: 65, bottom: 45 },
    head: [
      [
        "ID",
        "Peligro Identificado",
        "Probabilidad",
        "Consecuencia",
        "Magnitud",
        "Clasificación",
      ],
    ],
    body: risks.map((r, i) => {
      const magnitude = r.probability * r.consequence;
      let label = "BAJO";
      if (magnitude >= 16) label = "CRÍTICO";
      else if (magnitude >= 8) label = "ALTO";
      else if (magnitude >= 4) label = "MEDIO";

      return [
        i + 1,
        r.templateLabel || "Peligro Terreno",
        r.probability,
        r.consequence,
        magnitude,
        label,
      ];
    }),
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45] },
    didDrawPage: (data) => {
      addHeader(doc, header);
      addFooter(doc, header, data.pageNumber);
    },
  });

  savePDFWithLimit(doc, `Matriz_IPER_${header.clientName.replace(/\s/g, "_")}.pdf`);
};

export const generateAccidentPDF = (
  accidents: any[],
  header: PDFHeaderData,
  stats?: any,
) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  addHeader(doc, header);

  if (stats) {
    // Principal Metrics Table
    autoTable(doc, {
      startY: 65,
      margin: { top: 65, bottom: 45 },
      head: [
        [
          "Resumen de Siniestralidad Normativa D.S. 67 y Global",
          "Valor / Tasa",
        ],
      ],
      body: [
        ["Promedio Anual de Trabajadores", `${stats.avgWorkers} personas`],
        ["Total Siniestros", `${stats.totalIncidents} eventos`],
        ["Días Perdidos Totales", `${stats.totalDaysLost} días`],
        ["Tasa Incapacidad Temporal (IT)", stats.tasaIT],
        ["Tasa Invalidez y Muerte (IM)", stats.tasaIM],
        ["Tasa de Siniestralidad Total D.S. 67", `${stats.tasaTotal}%`],
        ["Tasa de Cotización Adicional", `${stats.adicionalTasa}%`],
        ["Tasa de Accidentabilidad Anual", `${stats.tasaAccidentabilidad}%`],
        ["Tasa de Frecuencia (por 1 millón HH)", stats.tasaFrecuencia],
        ["Tasa de Gravedad (por 1 millón HH)", stats.tasaGravedad],
      ],
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    // Projection Section
    if (stats.projection && stats.projection.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(
        "Proyección de Siniestralidad Futura (Tendencia Lineal)",
        15,
        (doc as any).lastAutoTable.finalY + 10,
      );

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 12,
        margin: { top: 65, bottom: 45 },
        head: [["Mes Proyectado", "Días Perdidos Estimados", "Confianza"]],
        body: stats.projection.map((p: any) => [
          p.name,
          Math.round(p.value),
          "Media (95%)",
        ]),
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      });
    }
  }

  const tableStartY = (doc as any).lastAutoTable
    ? (doc as any).lastAutoTable.finalY + 10
    : 65;

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text("Detalle de Siniestros Registrados", 15, tableStartY - 2);

  autoTable(doc, {
    startY: tableStartY,
    margin: { top: 65, bottom: 45 },
    head: [["Fecha", "Trabajador", "Tipo", "Días", "% Inv.", "Estado"]],
    body: accidents.map((a) => [
      a.date,
      a.workerName || "N/A",
      a.type === "accident"
        ? "Trabajo"
        : a.type === "disease"
          ? "Enferm."
          : "Trayecto",
      a.daysLost || 0,
      `${a.invalidityDegree || 0}%`,
      a.isFatal ? "Muerte / FATAL" : "-",
    ]),
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 8 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        addHeader(doc, header);
      }
      addFooter(doc, header, data.pageNumber);
    },
  });

  savePDFWithLimit(doc, `Informe_DS67_${header.clientName.replace(/\s/g, "_")}.pdf`);
};

export const generateWorkersReportPDF = (
  workers: any[],
  header: PDFHeaderData,
) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "letter",
  });

  autoTable(doc, {
    startY: 65,
    margin: { top: 65, bottom: 45 },
    head: [
      [
        "Trabajador",
        "RUT",
        "Cargo",
        "Estado",
        "Siniestros",
        "Detalle de Siniestralidad",
      ],
    ],
    body: workers.map((w) => {
      const incidentsCount = w.incidents?.length || 0;
      const incidentsSummary =
        w.incidents
          ?.map((i: any) => `• [${i.date}] ${i.title}: ${i.description}`)
          .join("\n") || "Sin siniestros registrados";
      return [
        `${w.firstName} ${w.paternalLastName} ${w.maternalLastName}`,
        w.rut,
        w.position,
        w.status === "active" ? "ACTIVO" : "INACTIVO",
        incidentsCount,
        incidentsSummary,
      ];
    }),
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45] },
    columnStyles: {
      0: { cellWidth: "wrap" },
      1: { cellWidth: "wrap" },
      2: { cellWidth: "wrap" },
      3: { cellWidth: "wrap" },
      4: { halign: "center", cellWidth: "wrap" },
      5: { fontSize: 7, cellWidth: "auto" },
    },
    didDrawPage: (data) => {
      addHeader(doc, header);
      addFooter(doc, header, data.pageNumber);
    },
  });

  savePDFWithLimit(doc, `Reporte_Trabajadores_${header.clientName.replace(/\s/g, "_")}.pdf`);
};

export const generateGeneralStatusPDF = (data: any, header: PDFHeaderData) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  addHeader(doc, header);

  // 1. Executive Summary Table
  autoTable(doc, {
    startY: 65,
    margin: { top: 65, bottom: 45 },
    head: [["Resumen Ejecutivo de Situación Gral.", "Valor / Estado"]],
    body: [
      ["Total Trabajadores Registrados", `${data.totalWorkers} personas`],
      ["Siniestralidad Acumulada (Eventos)", data.totalIncidents],
      ["Total Días Perdidos", `${data.totalDaysLost} días`],
      [
        "Tasa Accid. D.S. 67 (Proyectada)",
        `${((data.totalAccidentsDS67 / Math.max(data.totalWorkers, 1)) * 100).toFixed(2)}%`,
      ],
      ["Cumplimiento Carta Gantt", `${Math.round(data.ganttCompliance)}%`],
      ["Auditorías GRD (Score)", `${Math.round(data.grdScore)}%`],
      ["Revisiones / Protocolos", data.minsalAuditsCount || 0],
      ["Inspecciones Sanatarias (594/44)", data.totalInspections],
      ["Riesgos Críticos Identificados", data.totalRisks],
    ],
    theme: "grid",
    headStyles: { fillColor: [255, 110, 0] },
    styles: { fontSize: 10, cellPadding: 4 },
  });

  // 2. Incident Breakdown
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    margin: { top: 65, bottom: 45 },
    head: [["Desglose de Accidentabilidad", "Cantidad", "Observación"]],
    body: [
      [
        "Accidentes del Trabajo",
        data.incidentTypes.accident || 0,
        "Eventos en jornada",
      ],
      [
        "Enfermedades Profesionales",
        data.incidentTypes.disease || 0,
        "Origen laboral",
      ],
      [
        "Accidentes de Trayecto",
        data.incidentTypes.trayecto || 0,
        "Traslado domicilio-trabajo",
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [40, 40, 45] },
  });

  // 3. Gantt Tasks Status
  if (data.tasksSummary) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      margin: { top: 65, bottom: 45 },
      head: [["Estado de Planificación (Gantt)", "N° Actividades"]],
      body: [
        ["Completadas", data.tasksSummary.completed || 0],
        ["En Proceso / Pendientes", data.tasksSummary.pending || 0],
        ["Total Programado", data.tasksSummary.total || 0],
      ],
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
    });
  }

  // 4. Compliance by Module Visualization (Simulated bars/status)
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    margin: { top: 65, bottom: 45 },
    head: [["Módulo de Gestión", "Estado de Cumplimiento / Avance"]],
    body: [
      [
        "Matriz IPER / Riesgos",
        data.totalRisks > 0 ? "Documentado" : "Pendiente",
      ],
      [
        "Carta Gantt / Programa",
        `${Math.round(data.ganttCompliance)}% Alcanzado`,
      ],
      [
        "Gestión de Accidentes",
        data.totalIncidents > 0
          ? `${data.totalIncidents} Registros`
          : "Sin Accidentes en Periodo",
      ],
      [
        "Auditoría GRD",
        data.grdScore > 0
          ? `${Math.round(data.grdScore)}% Cumplimiento`
          : "No Evaluado",
      ],
      [
        "Protocolos de Salud",
        data.minsalAuditsCount > 0 ? "En Vigilancia" : "Sin Evaluaciones",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [71, 85, 105] },
  });

  // 5. Observations & Recommendations
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 45);
  doc.setFont("helvetica", "bold");
  doc.text(
    "Conclusiones y Recomendaciones Técnicas",
    15,
    (doc as any).lastAutoTable.finalY + 15,
  );

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 70, 70);

  const recommendations = [
    `• Se recomienda mantener el índice de siniestralidad por debajo del promedio rubro.`,
    `• Es imperativo completar las actividades pendientes de la Carta Gantt para asegurar cumplimiento legal.`,
    `• Continuar con el programa de inspecciones periódicas basadas en D.S. 594.`,
    `${data.totalRisks > 0 ? `• Se han identificado ${data.totalRisks} riesgos en la matriz IPER que requieren control inmediato.` : "• Se debe iniciar el levantamiento de matriz IPER si aún no se ha realizado."}`,
  ];

  let currentY = (doc as any).lastAutoTable.finalY + 22;
  recommendations.forEach((rec) => {
    doc.text(rec, 15, currentY);
    currentY += 6;
  });

  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHeader(doc, header);
    addFooter(doc, header, i);
  }
  savePDFWithLimit(doc,
    `Informe_Situacion_General_${header.clientName.replace(/\s/g, "_")}.pdf`,
  );
};

export const generateMIPERPDF = (records: any[], header: PDFHeaderData) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a3", // We need a lot of space for 24+ columns
  });

  addHeader(doc, header);

  // Date and extra info
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 110);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Fecha Generación PDF: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
    15,
    60,
  );

  // The columns layout is dense. Let's group them or use very small fonts.
  const head = [
    [
      {
        content: "Contexto de Tarea",
        colSpan: 6,
        styles: {
          halign: "center" as const,
          fillColor: [50, 50, 55] as [number, number, number],
        },
      },
      {
        content: "Identificación",
        colSpan: 4,
        styles: {
          halign: "center" as const,
          fillColor: [60, 60, 65] as [number, number, number],
        },
      },
      {
        content: "Evaluación del Riesgo (Prob x Cons = VEP)",
        colSpan: 4,
        styles: {
          halign: "center" as const,
          fillColor: [200, 80, 0] as [number, number, number],
        },
      },
      {
        content: "Controles y Responsables",
        colSpan: 6,
        styles: {
          halign: "center" as const,
          fillColor: [50, 50, 55] as [number, number, number],
        },
      },
      {
        content: "Residual",
        colSpan: 4,
        styles: {
          halign: "center" as const,
          fillColor: [200, 80, 0] as [number, number, number],
        },
      },
    ],
    [
      "Proceso",
      "Puestos",
      "Tarea",
      "Lugar",
      "N° Trab.",
      "Obs.",
      "Peligro",
      "Riesgo",
      "Código",
      "Control Act.",
      "Seguridad",
      "Higiénicos",
      "Psico.",
      "Musculoesq.",
      "Req. Legal",
      "Jerarquía",
      "Resp. Ejec.",
      "Plazo.",
      "Resp. Seg.",
      "Plazo Seg.",
      "Prob.",
      "Cons.",
      "VEP",
      "Nivel",
    ],
  ];

  const getRiskLevelStr = (p: number, c: number) => {
    const v = p * c;
    if (v >= 16) return "CRÍTICO";
    if (v >= 8) return "ALTO";
    if (v >= 4) return "MEDIO";
    return "BAJO";
  };

  const bodyData = records.map((r: any) => [
    r.proceso || "-",
    r.puestosTrabajo || "-",
    r.tareaNombre || "-",
    r.lugarEspecifico || "-",
    r.numPersonas || 1,
    r.observaciones || "-",
    r.peligro || "-",
    r.riesgo || "-",
    r.codigoRiesgo || "-",
    r.medidaControlActual || "-",
    (r.evalSeguridad?.prob || 1) * (r.evalSeguridad?.cons || 1),
    (r.evalHigienicos?.prob || 1) * (r.evalHigienicos?.cons || 1),
    (r.evalPsicosociales?.prob || 1) * (r.evalPsicosociales?.cons || 1),
    (r.evalMusculo?.prob || 1) * (r.evalMusculo?.cons || 1),
    r.requisitoLegal || "-",
    r.jerarquiaControl || "-",
    r.respEjecucion || "-",
    r.fechaEjecucion || "-",
    r.respSeguimiento || "-",
    r.fechaSeguimiento || "-",
    r.residualProb || 1,
    r.residualCons || 1,
    (r.residualProb || 1) * (r.residualCons || 1),
    getRiskLevelStr(r.residualProb || 1, r.residualCons || 1),
  ]);

  autoTable(doc, {
    startY: 65,
    margin: { top: 65, bottom: 45 },
    head: head,
    body: bodyData,
    theme: "grid",
    headStyles: { fontSize: 6, cellPadding: 1, textColor: 255 },
    styles: { fontSize: 5, cellPadding: 1, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 22 }, // Proceso
      1: { cellWidth: 22 }, // Puestos
      2: { cellWidth: 25 }, // Tarea
      3: { cellWidth: 22 }, // Lugar
      4: { cellWidth: 8, halign: "center" }, // N Trab
      5: { cellWidth: 15 }, // Obs
      6: { cellWidth: 25 }, // Peligro
      7: { cellWidth: 25 }, // Riesgo
      8: { cellWidth: 10 }, // Codigo
      9: { cellWidth: 25 }, // Control
      10: { cellWidth: 10, halign: "center" }, // Seg
      11: { cellWidth: 10, halign: "center" }, // Higien
      12: { cellWidth: 10, halign: "center" }, // Psico
      13: { cellWidth: 10, halign: "center" }, // Musculo
      14: { cellWidth: 25 }, // Req. Legal
      15: { cellWidth: 15 }, // Jerarquia
      16: { cellWidth: 20 }, // Resp Ejec
      17: { cellWidth: 15 }, // Plazo
      18: { cellWidth: 20 }, // Resp Seg
      19: { cellWidth: 15 }, // Plazo Seg
      20: { cellWidth: 8, halign: "center" }, // Prob
      21: { cellWidth: 8, halign: "center" }, // Cons
      22: { cellWidth: 8, halign: "center" }, // VEP
      23: { cellWidth: 15, halign: "center", fontStyle: "bold" },
    },
    willDrawCell: (data) => {
      if (data.section === "body") {
        const cIdx = data.column.index;
        // Columns 10,11,12,13 are the eval VEP strings
        // Column 23 is Residual Level
        if ([10, 11, 12, 13, 23].includes(cIdx)) {
          // We parse original data directly from records based on row index
          const record = records[data.row.index];
          let riskLevelData;
          if (cIdx === 10)
            riskLevelData = getRiskLevel(
              record.evalSeguridad?.prob || 1,
              record.evalSeguridad?.cons || 1,
            );
          else if (cIdx === 11)
            riskLevelData = getRiskLevel(
              record.evalHigienicos?.prob || 1,
              record.evalHigienicos?.cons || 1,
            );
          else if (cIdx === 12)
            riskLevelData = getRiskLevel(
              record.evalPsicosociales?.prob || 1,
              record.evalPsicosociales?.cons || 1,
            );
          else if (cIdx === 13)
            riskLevelData = getRiskLevel(
              record.evalMusculo?.prob || 1,
              record.evalMusculo?.cons || 1,
            );
          else if (cIdx === 23)
            riskLevelData = getRiskLevel(
              record.residualProb || 1,
              record.residualCons || 1,
            );

          if (riskLevelData && riskLevelData.hex) {
            doc.setFillColor(riskLevelData.hex);
            doc.setTextColor(255, 255, 255);
            if (data.cell) {
              // Apply background directly to the cell
              data.cell.styles.fillColor = riskLevelData.hex;
              data.cell.styles.textColor = "#ffffff";
              data.cell.styles.fontStyle = "bold";
            }
          }
        }
      }
    },
    didDrawPage: (data) => {
      addFooter(doc, header, data.pageNumber);
      if (data.pageNumber > 1) {
        addHeader(doc, header);
      }
    },
  });

  savePDFWithLimit(doc, `Formulario_MIPER_${header.clientName.replace(/\s/g, "_")}.pdf`);
};

export const generateDS44PDF = (data: any, header: PDFHeaderData) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "legal",
  });

  addHeader(doc, header);

  // Summary Box (Top Right)
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(245, 245, 245);

  doc.setDrawColor(200, 200, 200);
  doc.rect(pageWidth - 85, 30, 70, 42); // Increased height
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 45);
  doc.text("RESUMEN CUMPLIMIENTO", pageWidth - 80, 37);

  doc.setFontSize(14);
  doc.setTextColor(255, 110, 0);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.compliancePercentage}%`, pageWidth - 50, 48, {
    align: "center",
  });

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 110);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Cumplen: ${data.stats?.cumple || 0} (${((data.stats?.cumple / 14) * 100).toFixed(1)}%)`,
    pageWidth - 80,
    56,
  );
  doc.text(
    `No Cumplen: ${data.stats?.no_cumple || 0} (${((data.stats?.no_cumple / 14) * 100).toFixed(1)}%)`,
    pageWidth - 80,
    61,
  );
  doc.text(
    `No Aplica: ${data.stats?.no_aplica || 0} (${((data.stats?.no_aplica / 14) * 100).toFixed(1)}%)`,
    pageWidth - 80,
    66,
  );

  // Dates Info
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 110);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Fecha Creación Informe: ${data.dateCreated || header.date}`,
    15,
    75,
  );
  doc.text(
    `Fecha Generación PDF: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
    pageWidth - 15,
    75,
    { align: "right" },
  );

  // Table
  autoTable(doc, {
    startY: 80,
    margin: { top: 65, bottom: 45 },
    head: [
      [
        "Item",
        "Descripción Requerimiento",
        "Art. D.S. 44",
        "Valoración",
        "Documento / Evidencia",
        "Plan de Acción",
        "Resp.",
        "Venc.",
      ],
    ],
    body: data.items.map((item: any) => [
      item.id,
      item.label,
      item.article,
      item.valoracion === "cumple"
        ? "CUMPLE"
        : item.valoracion === "no_cumple"
          ? "NO CUMPLE"
          : "N/A",
      item.documento || "-",
      item.planAccion || "-",
      item.responsable || "-",
      item.vencimiento || "-",
    ]),
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: "wrap" },
      1: { cellWidth: "auto" },
      2: { cellWidth: "wrap" },
      3: { cellWidth: "wrap" },
      4: { cellWidth: "auto" },
      5: { cellWidth: "auto" },
      6: { cellWidth: "wrap" },
      7: { cellWidth: "wrap" },
    },
    didDrawPage: (data) => {
      // Draw footer on every page
      addFooter(doc, header, data.pageNumber);

      // On pages after the first, we might want to re-draw the header title area
      // but simpler is to rely on autoTable's margin and repeat header logic if needed
      if (data.pageNumber > 1) {
        addHeader(doc, header);
      }
    },
  });

  savePDFWithLimit(doc, `Informe_DS44_${header.clientName.replace(/\s/g, "_")}.pdf`);
};

export const generateIRLPDF = (
  record: any,
  template: any,
  header: PDFHeaderData,
) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF("p", "mm", "a4");
  addHeader(doc, header);
  addFooter(doc, header, 1);

  let currentY = 65;

  const leftX = 14;
  const rightX = doc.internal.pageSize.getWidth() - 14;

  // 1. ANTECEDENTES DEL TRABAJADOR
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("I.- ANTECEDENTES DEL TRABAJADOR", leftX, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: 14, right: 14 },
    theme: "plain",
    head: [],
    body: [
      [
        {
          content: "Empresa / Contratante",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        `: ${header.clientName || "No especificado"}`,
      ],
      [
        {
          content: "RUT Contratante",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        `: ${header.clientRut || "--"}`,
      ],
      [
        {
          content: "Dirección Contratante",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        `: ${header.clientAddress || "--"}`,
      ],
      [
        {
          content: "Nombre Trabajador",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        `: ${record.workerName}`,
      ],
      [
        {
          content: "RUT Trabajador",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        `: ${record.workerRut}`,
      ],
      [
        {
          content: "Dirección / Domicilio",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        `: ${record.workerAddress || "--"}`,
      ],
      [
        {
          content: "Cargo / Especialidad",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        `: ${template?.cargo || "No especificado"}`,
      ],
      [
        {
          content: "Tipo de Inducción",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        `: ${record.tipoInduccion}`,
      ],
      [
        {
          content: "Fecha Inducción",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        `: ${record.fecha} | Horario: ${record.horarioDesde} a ${record.horarioHasta}`,
      ],
    ],
    styles: {
      fontSize: 9,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
  });
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 2. DESCRIPCIÓN DEL CARGO
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(
    "II.- DESCRIPCIÓN Y ASPECTOS GENERALES DEL PUESTO DE TRABAJO",
    leftX,
    currentY,
  );
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: 14, right: 14 },
    theme: "grid",
    head: [],
    body: [
      [
        {
          content: "Espacio de Trabajo y Frecuencias:",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        template?.espacioTrabajo || "No especificado",
      ],
      [
        {
          content: "Condiciones Ambientales Principales:",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        template?.condicionesAmbientales || "No especificado",
      ],
      [
        {
          content: "Riesgos de Falta de Orden y Aseo:",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        template?.ordenAseo || "No especificado",
      ],
      [
        {
          content: "Herramientas y Máquinas Utilizadas:",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        template?.herramientas || "No especificado",
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
  });
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 3. MATRIZ DE RIESGOS ESPECÍFICA (IRL)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(
    "III.- IDENTIFICACIÓN DE RIESGOS Y MEDIDAS PREVENTIVAS DE LA ESPECIALIDAD",
    leftX,
    currentY,
  );
  currentY += 6;

  // Helper const to map category titles:
  const CATEGORIES = [
    { key: "riesgosGenerales", label: "Riesgos Generales del Trabajo" },
    { key: "riesgosMaquinas", label: "Riesgos con Uso de Máquinas / Equipos" },
    { key: "riesgosQuimicos", label: "Exposición a Agentes Químicos" },
    { key: "riesgosBiologicos", label: "Exposición a Agentes Biológicos" },
    { key: "riesgosPsicosociales", label: "Riesgos Psicosociales" },
    { key: "riesgosEspecificos", label: "Riesgos Específicos Adicionales" },
    { key: "riesgosEmergencias", label: "Procedimientos por Emergencias" },
  ];

  let bodyData: any[] = [];

  CATEGORIES.forEach((cat) => {
    const records = template?.[cat.key] || [];
    if (records.length > 0) {
      bodyData.push([
        {
          content: cat.label,
          colSpan: 5,
          styles: {
            fillColor: [230, 230, 230],
            fontStyle: "bold",
            halign: "center",
          },
        },
      ]);
      records.forEach((r: any) => {
        let magColor = [250, 204, 21]; // yellow-400 (MEDIO)
        let textColor = [113, 63, 18]; // yellow-900

        if (r.magnitud === "CRÍTICO") {
          magColor = [239, 68, 68]; // red-500
          textColor = [255, 255, 255];
        } else if (r.magnitud === "ALTO") {
          magColor = [249, 115, 22]; // orange-500
          textColor = [255, 255, 255];
        } else if (r.magnitud === "BAJO") {
          magColor = [34, 197, 94]; // green-500
          textColor = [255, 255, 255];
        }

        bodyData.push([
          r.riesgo,
          {
            content: r.magnitud || "MEDIO",
            styles: {
              fillColor: magColor,
              textColor: textColor,
              halign: "center",
              fontStyle: "bold",
            },
          },
          r.consecuencia,
          r.preventiva,
          r.metodo,
        ]);
      });
    }
  });

  if (bodyData.length === 0) {
    bodyData.push([
      {
        content: "No hay riesgos documentados para este cargo.",
        colSpan: 5,
        styles: {
          halign: "center",
          fontStyle: "italic",
          textColor: [150, 150, 150],
        },
      },
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: 14, right: 14 },
    theme: "grid",
    head: [
      [
        "Peligro / Riesgo",
        "Mag.",
        "Consecuencias Posibles",
        "Medida Preventiva / Control",
        "Método Correcto de Trabajo",
      ],
    ],
    headStyles: {
      fillColor: [243, 146, 0],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    body: bodyData,
    styles: { fontSize: 8, cellPadding: 2, valign: "middle" },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 18 },
      2: { cellWidth: 34 },
      3: { cellWidth: 48 },
      4: { cellWidth: 38 },
    },
  });
  currentY = (doc as any).lastAutoTable.finalY + 8;

  const checkPageBreak = (needed: number) => {
    if (currentY + needed > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      addHeader(doc, header);
      addFooter(doc, header, (doc as any).getNumberOfPages());
      currentY = 60;
    }
  };

  checkPageBreak(50);

  // 4. OBSERVACIONES Y MATERIAL ADJUNTO
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("IV.- MATERIAL ADJUNTO ENTREGADO EN LA INDUCCIÓN", leftX, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: 14, right: 14 },
    theme: "plain",
    body: [
      [
        "Procedimientos de Trabajo Seguro:",
        record.procedimientosAdjuntos || "Ninguno",
      ],
      [
        "Hojas de Datos de Seguridad (HDS):",
        record.hojasSeguridadAdjuntas || "Ninguna",
      ],
      ["Otros Documentos Adicionales:", record.otrosAdjuntos || "Ninguno"],
    ],
    styles: { fontSize: 9, cellPadding: 1, textColor: [40, 40, 40] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 70 },
    },
  });
  currentY = (doc as any).lastAutoTable.finalY + 15;

  checkPageBreak(100);

  // 5. DECLARACIÓN Y FIRMAS
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("V.- DECLARACIÓN Y FIRMAS", leftX, currentY);
  currentY += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const declaration =
    "Declaro que he recibido la capacitación de Información de Riesgos Laborales (IRL) correspondiente a mi cargo. He sido instruido(a) acerca de los riesgos y peligros que entrañan mis labores, de las medidas preventivas y de los métodos de trabajo correctos correspondientes, de acuerdo a lo establecido en la normativa vigente y el Decreto Supremo N° 40, Título VI 'De la Obligación de Informar de los Riesgos Laborales'. He recibido información sobre los límites de exposición y las medidas de prevención para la salud laboral del DS 594.";
  const splitDeclaration = doc.splitTextToSize(declaration, rightX - leftX);
  doc.text(splitDeclaration, leftX, currentY);
  currentY += splitDeclaration.length * 4 + 20;

  // Signatures
  doc.setLineWidth(0.5);
  doc.line(20, currentY, 80, currentY);
  doc.line(130, currentY, 190, currentY);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Firma Trabajador / Empleado", 50, currentY + 5, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.text(record.workerName, 50, currentY + 10, { align: "center" });
  doc.text(record.workerRut, 50, currentY + 15, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.text("Firma Experto Prevencionista", 160, currentY + 5, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.text(record.relatorName, 160, currentY + 10, { align: "center" });
  doc.text(
    `Reg. SNS/SEREMI: ${header.license || "Sin registro"}`,
    160,
    currentY + 15,
    { align: "center" },
  );

  if (header.signatureURL) {
    try {
      doc.addImage(header.signatureURL, "PNG", 140, currentY - 20, 40, 15);
    } catch (e) {
      console.error("Signature image add failed", e);
    }
  }

  savePDFWithLimit(doc,
    `IRL_${record.workerName.replace(/\s/g, "_")}_${header.clientName.replace(/\s/g, "_")}.pdf`,
  );
};

export const generateGRDPDF = (
  data: any,
  header: PDFHeaderData,
  questions: any[],
) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  addHeader(doc, header);

  // Summary Table
  autoTable(doc, {
    startY: 65,
    margin: { top: 65, bottom: 45 },
    head: [["Indicador de Cumplimiento", "Resultado"]],
    body: [
      ["Puntaje de Cumplimiento (%)", `${data.complianceScore.toFixed(1)}%`],
      ["Total Preguntas Aplicadas", data.responses.length.toString()],
      [
        "Estado de Gestión",
        data.complianceScore >= 90 ? "SATISFACTORIO" : "REQUIERE ACCIÓN",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [255, 110, 0] },
    styles: { fontSize: 10, font: "helvetica" },
  });

  // Detailed Findings Table
  const tableBody = data.responses.map((r: any) => {
    const q = questions.find((question) => question.id === r.qId);
    return [
      r.qId.toString(),
      q?.question || "N/A",
      r.status,
      r.observation || "",
    ];
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    margin: { top: 65, bottom: 45 },
    head: [["#", "Requisito / Auditoria", "Estado", "Observaciones"]],
    body: tableBody,
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 110 },
      2: { cellWidth: 20 },
      3: { cellWidth: "auto" },
    },
    styles: { fontSize: 8, font: "helvetica" },
  });

  const totalPagesGRD = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPagesGRD; i++) {
    doc.setPage(i);
    addHeader(doc, header);
    addFooter(doc, header, i);
  }

  savePDFWithLimit(doc,
    `GRD_${header.clientName.replace(/\s/g, "_")}_${new Date().getTime()}.pdf`,
  );
};

export const generateMinsalPDF = (
  data: any,
  header: PDFHeaderData,
  protocols: any[],
) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  addHeader(doc, header);

  let currentY = 65;

  // Introduction text
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const intro =
    "El presente informe detalla el estado de cumplimiento de los principales protocolos obligatorios de salud, identificados según las condiciones de la empresa y la vigilancia epidemiológica correspondiente.";
  const splitIntro = doc.splitTextToSize(
    intro,
    doc.internal.pageSize.getWidth() - 30,
  );
  doc.text(splitIntro, 15, currentY);
  currentY += splitIntro.length * 5 + 10;

  protocols.forEach((protocol) => {
    const protocolExtraFields = (data.extraFields || []).filter(
      (ef: any) => ef.protocolId === protocol.id,
    );
    const allItems = [...protocol.items, ...protocolExtraFields];

    if (allItems.length === 0) return;

    // Check for page overflow before starting a new section
    if (currentY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      addHeader(doc, header);
      currentY = 60;
    }

    // Section Header
    doc.setFillColor(40, 40, 45);
    doc.rect(15, currentY, doc.internal.pageSize.getWidth() - 30, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(protocol.title.toUpperCase(), 20, currentY + 5.5);
    currentY += 8;

    const tableBody = allItems.map((item: any) => {
      const response = data.responses.find((r: any) => r.qId === item.id);
      return [
        item.label, 
        response?.status.replace("_", " ") || "NO",
        response?.documento || "-",
        response?.planAccion || "-",
        response?.responsable || "-",
        response?.vencimiento ? new Date(response.vencimiento).toLocaleDateString() : "-"
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { top: 65, bottom: 45, left: 10, right: 10 },
      head: [["Ítem de Verificación", "Estado", "Evidencia", "Plan Acción", "Resp.", "Venc."]],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [100, 100, 100], fontSize: 7, halign: "center" },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 22, halign: "center" },
        2: { cellWidth: 38 },
        3: { cellWidth: 42 },
        4: { cellWidth: 25 },
        5: { cellWidth: 19, halign: "center" },
      },
      styles: { fontSize: 7, font: "helvetica", overflow: 'linebreak' },
      didParseCell: (data) => {
        if (data.column.index === 1 && data.section === "body") {
          const status = data.cell.text[0];
          if (status === "FINALIZADO")
            data.cell.styles.textColor = [34, 197, 94];
          if (status === "EN PROCESO")
            data.cell.styles.textColor = [249, 115, 22];
          if (status === "NO") data.cell.styles.textColor = [239, 68, 68];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  });

  const totalPagesMinsal = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPagesMinsal; i++) {
    doc.setPage(i);
    addHeader(doc, header);
    addFooter(doc, header, i);
  }

  savePDFWithLimit(doc,
    `Protocolos_MINSAL_${header.clientName.replace(/\s/g, "_")}_${new Date().getTime()}.pdf`,
  );
};

export const generateAllMinsalAuditsPDF = (
  audits: any[],
  header: PDFHeaderData,
  protocols: any[],
) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  audits.forEach((audit, index) => {
    if (index > 0) {
      doc.addPage();
    }
    
    addHeader(doc, header);
    let currentY = 65;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const dateStr = audit.date ? new Date(audit.date).toLocaleDateString() : "-";
    const intro = `El presente documento resume el estado de cumplimiento de los "Protocolos del Ministerio de Salud (MINSAL)", auditado el día ${dateStr}. Este proceso permite la vigilancia médica y ambiental de los riesgos laborales en los diferentes puestos de trabajo de la organización.`;
    const lines = doc.splitTextToSize(intro, 175);
    doc.text(lines, 20, currentY);
    currentY += lines.length * 5 + 5;

    protocols.forEach((protocol) => {
      const pItems = protocol.items || [];
      if (pItems.length === 0) return;

      doc.setFillColor(240, 240, 240);
      doc.rect(20, currentY, 175, 8, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text((protocol.title || "").toUpperCase(), 20, currentY + 5.5);
      currentY += 8;

      const tableBody = pItems.map((item: any) => {
        const response = audit.responses?.find((r: any) => r.qId === item.id);
        return [
          item.label || "-", 
          response?.status?.replace("_", " ") || "NO",
          response?.documento || "-",
          response?.planAccion || "-",
          response?.responsable || "-",
          response?.vencimiento ? new Date(response.vencimiento).toLocaleDateString() : "-"
        ];
      });

      autoTable(doc, {
        startY: currentY,
        margin: { top: 65, bottom: 45, left: 10, right: 10 },
        head: [["Ítem de Verificación", "Estado", "Evidencia", "Plan Acción", "Resp.", "Venc."]],
        body: tableBody,
        theme: "grid",
        headStyles: { fillColor: [100, 100, 100], fontSize: 7, halign: "center" },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 22, halign: "center" },
          2: { cellWidth: 35 },
          3: { cellWidth: 40 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 },
        },
        styles: { fontSize: 7, cellPadding: 2 },
        didDrawPage: (hookData) => {
          currentY = hookData.cursor?.y || currentY;
        }
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 5;
    });
  });

  const totalPagesMinsal = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPagesMinsal; i++) {
    doc.setPage(i);
    addHeader(doc, header);
    addFooter(doc, header, i);
  }

  savePDFWithLimit(doc,
    `Resumen_Todos_Protocolos_MINSAL_${header.clientName.replace(/\s/g, "_")}_${new Date().getTime()}.pdf`,
  );
};

export const generateCompendiumPDF = async (
  data: any,
  header: PDFHeaderData,
) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const { reports, options } = data;

  // 1. Cover Page
  addHeader(doc, header);
  doc.setFontSize(24);
  doc.setTextColor(40, 40, 45);
  doc.setFont("helvetica", "bold");
  doc.text("COMPENDIO TÉCNICO", 15, 80);
  doc.setFontSize(14);
  doc.text("RECOPILACIÓN INTEGRAL DE ACTIVOS PREVENTIVOS", 15, 90);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Este documento contiene una selección de ${reports.length} informes técnicos realizados`,
    15,
    110,
  );
  doc.text(
    `bajo la supervisión del profesional a cargo en el portal SEGURITO.`,
    15,
    115,
  );

  autoTable(doc, {
    startY: 130,
    head: [["N°", "Tipo de Activo", "Fecha Registro", "Autor / Profesional"]],
    body: reports.map((r: any, i: number) => [
      i + 1,
      r.title || r.type,
      r.createdAt?.toDate?.()?.toLocaleDateString() || "--",
      r.authorName || "Profesional",
    ]),
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45] },
  });

  addFooter(doc, header, 1);

  // 2. Comparative Summary (Horizontal Table)
  if (options.comparativeSummary) {
    doc.addPage("letter", "landscape");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    addHeader(doc, {
      ...header,
      title: "TABLA COMPARATIVA DE ACTIVOS Y CUMPLIMIENTO",
    });

    // We filter reports that have meaningful scores
    const summaryData = reports.map((r: any) => {
      let score = "Evaluado";
      let status = "S/D";

      if (r.type === "grd_report") {
        const val = Math.round(r.dataSnapshot?.complianceScore || 0);
        score = `${val}%`;
        status = val >= 85 ? "ÓPTIMO" : val >= 70 ? "MEDIO" : "DEFICIENTE";
      } else if (r.type === "ds44_inspection") {
        const val = r.dataSnapshot?.compliancePercentage || 0;
        score = `${val}%`;
        status = val >= 90 ? "CUMPLE" : "PENDIENTE";
      } else if (
        r.type === "accident_report" ||
        r.type === "individual_accident"
      ) {
        score =
          "Tasa: " + (r.dataSnapshot?.stats?.tasaAccidentabilidad || "0") + "%";
        status = "Analítico";
      } else if (r.type === "minsal_report") {
        const count = r.dataSnapshot?.responses?.length || 0;
        score = `${count} Ítems`;
        status = "Protocolo";
      } else if (r.type === "irl") {
        score = r.dataSnapshot?.templateSnapshot?.cargo || "-";
        status = "Entregado";
      }

      return [
        r.title || r.type,
        r.createdAt?.toDate?.()?.toLocaleDateString() || "--",
        score,
        status,
        r.authorName || "Profesional",
      ];
    });

    autoTable(doc, {
      startY: 65,
      margin: { top: 65, right: 15, bottom: 45, left: 15 },
      head: [
        [
          "Título del Informe Técnico",
          "Fecha Emisión",
          "Score / Métrica",
          "Estado / Clasificación",
          "Responsable",
        ],
      ],
      body: summaryData,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 4, valign: "middle" },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 35, halign: "center" },
        2: { cellWidth: 40, halign: "center" },
        3: { cellWidth: 40, halign: "center" },
        4: { cellWidth: "auto" },
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addHeader(doc, {
            ...header,
            title: "TABLA COMPARATIVA DE ACTIVOS (CONT.)",
          });
        }
        addFooter(doc, header, data.pageNumber);
      },
    });
  }

  // 3. Individual Report Pages (Optional)
  if (options.onePagePerReport) {
    reports.forEach((report: any) => {
      doc.addPage();
      const currentPage = doc.getNumberOfPages();
      addHeader(doc, {
        ...header,
        title: `DETALLE: ${report.title.toUpperCase()}`,
      });

      const snap = report.dataSnapshot;
      if (!snap) {
        doc.text(
          "Sin snapshot de datos disponible para este registro.",
          15,
          70,
        );
      } else {
        // Draw a compact version of the report based on type
        switch (report.type) {
          case "compliance_594":
            autoTable(doc, {
              startY: 65,
              margin: { top: 65, bottom: 45 },
              head: [["Parámetro", "Valor"]],
              body: [
                ["Trabajadores", snap.workers],
                ["Superficie", `${snap.surfaceArea} m2`],
                ["Agua Potable", snap.hasPotableWater ? "CUMPLE" : "INCUMPLE"],
                ["Observaciones", snap.observations || "Sin obs."],
              ],
              theme: "grid",
            });
            break;
          case "miper":
          case "iper_matrix":
            const risks = Array.isArray(snap) ? snap : snap.risks || [];
            autoTable(doc, {
              startY: 65,
              margin: { top: 65, bottom: 45 },
              head: [["Peligro", "VEP", "Nivel"]],
              body: risks
                .slice(0, 15)
                .map((r: any) => [
                  r.peligro || r.templateLabel || "Peligro",
                  (r.residualProb || r.probability || 1) *
                    (r.residualCons || r.consequence || 1),
                  "Registrado",
                ]),
              theme: "grid",
            });
            break;
          case "grd_report":
            autoTable(doc, {
              startY: 65,
              margin: { top: 65, bottom: 45 },
              head: [["Métrica de Auditoría Subvencional", "Resultado"]],
              body: [
                ["Compliance Score", `${Math.round(snap.complianceScore)}%`],
                ["Fecha Evaluación", snap.date],
                ["Observaciones Auditor", snap.auditObservations || "Sin obs."],
              ],
              theme: "grid",
            });
            break;
          case "accident_report":
            autoTable(doc, {
              startY: 65,
              margin: { top: 65, bottom: 45 },
              head: [["Métrica de Siniestralidad", "Valor"]],
              body: [
                [
                  "Tasa de Accidentabilidad",
                  `${snap.stats?.tasaAccidentabilidad}%`,
                ],
                ["Siniestros Totales", snap.stats?.totalIncidents],
                ["Días Perdidos Totales", snap.stats?.totalDaysLost],
                ["Tasa Cotización Adic.", `${snap.stats?.adicionalTasa}%`],
              ],
              theme: "grid",
            });
            break;
          case "minsal_report":
            autoTable(doc, {
              startY: 65,
              margin: { top: 65, bottom: 45 },
              head: [["Protocolos de Salud", "Estado"]],
              body: [
                ["Fecha Chequeo", snap.date],
                ["Auditados", snap.responses?.length || "N/A"],
                [
                  "Observación General",
                  "Consultar informe original para detalle por ítem.",
                ],
              ],
              theme: "grid",
            });
            break;
          case "irl":
            autoTable(doc, {
              startY: 65,
              margin: { top: 65, bottom: 45 },
              head: [["Registro Información de Riesgos", "Detalle"]],
              body: [
                ["Trabajador", snap.workerName || "N/A"],
                ["Cargo (DS 44)", snap.templateSnapshot?.cargo || "N/A"],
                ["Fecha de Emisión", snap.fecha || "N/A"],
                ["Relator / Instructor", snap.relatorName || "N/A"],
                ["Tipo Inducción", snap.tipoInduccion || "N/A"],
              ],
              theme: "grid",
            });
            break;
          case "individual_accident":
            autoTable(doc, {
              startY: 65,
              margin: { top: 65, bottom: 45 },
              body: [
                ["Trabajador", snap.workerName || "N/A"],
                ["RUT", snap.workerRut || "N/A"],
                ["Tipo", snap.type || "Accidente"],
                ["Fecha", snap.date],
                ["Días Perdidos", snap.daysLost || 0],
                ["Descripción", snap.description || snap.title || "S/D"],
              ],
              theme: "grid",
              columnStyles: {
                0: { fontStyle: "bold", fillColor: [240, 240, 245], cellWidth: 60 },
              },
            });
            break;
          case "ds44_inspection":
            autoTable(doc, {
              startY: 65,
              margin: { top: 65, bottom: 45 },
              head: [["Criterio DS 44", "Resultado"]],
              body: [
                ["Cumplimiento Global", `${snap.compliancePercentage}%`],
                ["Items Evaluados", snap.items?.length || 14],
                ["Observaciones", "Auditoría de Requisitos Mínimos (D.S. 44)"],
              ],
              theme: "grid",
            });
            break;
          default:
            doc.text(
              `Registro tipo: ${report.type}. Datos consolidados en tablas superiores.`,
              15,
              70,
            );
        }
      }
      addFooter(doc, header, currentPage);
    });
  }

  savePDFWithLimit(doc,
    `Compendio_Tecnico_${header.clientName.replace(/\s/g, "_")}_${new Date().getTime()}.pdf`,
  );
};

export const generateEppPDF = (
  worker: any,
  eppRecord: any,
  header: PDFHeaderData,
) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF();
  let currentY = 15;

  addHeader(doc, header);
  currentY += 45;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("REGISTRO ENTREGA DE CARGO Y EPP", 105, currentY, { align: "center" });
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Reg.Gen.Dpr.18", 14, currentY);
  doc.text(
    `Declaro recibir en buenas condiciones por parte de ${header.clientName || "la empresa"} El siguiente cargo:`,
    14,
    currentY + 5,
    { maxWidth: 180 },
  );
  currentY += 15;

  // Metadata boxes
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);

  // Box 0: Empresa Info
  doc.rect(14, currentY, 182, 14, "FD");
  doc.setFont("helvetica", "bold");
  doc.text("EMPRESA/CONTRATANTE:", 16, currentY + 6);
  doc.setFont("helvetica", "normal");
  doc.text(header.clientName || "--", 62, currentY + 6);

  doc.setFont("helvetica", "bold");
  doc.text("RUT:", 145, currentY + 6);
  doc.setFont("helvetica", "normal");
  doc.text(header.clientRut || "--", 156, currentY + 6);

  doc.setFont("helvetica", "bold");
  doc.text("DIRECCIÓN:", 16, currentY + 11);
  doc.setFont("helvetica", "normal");
  doc.text(header.clientAddress || "--", 40, currentY + 11);
  currentY += 16;

  // Box 1: Centro
  doc.rect(14, currentY, 182, 9, "FD");
  doc.setFont("helvetica", "bold");
  doc.text("CENTRO TRABAJO:", 16, currentY + 6);
  doc.setFont("helvetica", "normal");
  doc.text(eppRecord.centro || "", 50, currentY + 6);
  currentY += 11;

  // Box 2: Worker Info
  doc.rect(14, currentY, 182, 21, "FD");
  doc.setFont("helvetica", "bold");
  doc.text("NOMBRE TRABAJADOR:", 16, currentY + 6);
  doc.setFont("helvetica", "normal");
  const fullName = `${worker.firstName} ${worker.paternalLastName} ${worker.maternalLastName || ""}`.trim();
  doc.text(fullName, 62, currentY + 6);

  doc.setFont("helvetica", "bold");
  doc.text("RUT:", 145, currentY + 6);
  doc.setFont("helvetica", "normal");
  doc.text(worker.rut || "", 156, currentY + 6);

  doc.setFont("helvetica", "bold");
  doc.text("CARGO:", 16, currentY + 12);
  doc.setFont("helvetica", "normal");
  doc.text(worker.position || "N/A", 35, currentY + 12);

  doc.setFont("helvetica", "bold");
  doc.text("DIRECCIÓN / DOMICILIO:", 16, currentY + 18);
  doc.setFont("helvetica", "normal");
  doc.text(worker.address || "N/A", 62, currentY + 18);
  currentY += 25;

  const items = eppRecord.items || [];
  const tableData = items.map((item: any, i: number) => [
    i + 1,
    item.name,
    item.deliveryDate1 || "",
    item.returnDate1 || "",
    item.deliveryDate2 || "",
    item.returnDate2 || "",
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        { content: "N°", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "ARTÍCULOS", rowSpan: 2, styles: { halign: "left", valign: "middle" } },
        { content: "ENTREGA 1", styles: { halign: "center" } },
        { content: "DEVOLUCION 1", styles: { halign: "center" } },
        { content: "ENTREGA 2", styles: { halign: "center" } },
        { content: "DEVOLUCION 2", styles: { halign: "center" } },
      ],
      [
        { content: "FECHA/FIRMA" },
        { content: "FECHA/FIRMA" },
        { content: "FECHA/FIRMA" },
        { content: "FECHA/FIRMA" },
      ],
    ],
    body: tableData,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 50 },
      2: { cellWidth: 30, halign: "center" },
      3: { cellWidth: 30, halign: "center" },
      4: { cellWidth: 30, halign: "center" },
      5: { cellWidth: 30, halign: "center" },
    },
    didDrawPage: (data) => {
      // Handle page overflow if needed
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Observaciones
  if (eppRecord.observaciones) {
    if (currentY + 20 > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      currentY = 15;
    }
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones:", 14, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(eppRecord.observaciones, 14, currentY + 5, { maxWidth: 180 });
    currentY += 20;
  }

  // Signatures
  if (currentY + 40 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY = doc.internal.pageSize.getHeight() - 40;
  }

  // Worker signature
  doc.setDrawColor(15, 23, 42);
  doc.line(30, currentY, 90, currentY);
  doc.setFont("helvetica", "bold");
  doc.text("Firma Trabajador", 60, currentY + 5, { align: "center" });

  // Profesional signature
  doc.line(120, currentY, 180, currentY);
  doc.text("Firma Prevencionista/Usuario", 150, currentY + 5, { align: "center" });

  if (header.signatureURL) {
    try {
      doc.addImage(header.signatureURL, "PNG", 130, currentY - 20, 40, 15);
    } catch (e) {
      console.warn("Could not add signature image to specific PDF.", e);
    }
  }

  savePDFWithLimit(doc, `EPP_${fullName}_${new Date().toISOString().split("T")[0]}.pdf`);
};

export const generateGeneralProceduresPDF = (procedures: any[], header: PDFHeaderData) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "letter",
  });

  addHeader(doc, header);

  let finalY = 65;

  const cleanProcedureText = (txt: string) => {
    return txt ? txt.replace(/\r/g, "").replace(/\n/g, "\n") : "";
  };

  const tableData = procedures.map((proc, index) => [
    `${index + 1}. ${proc.title || "Procedimiento Sin Título"}`,
    cleanProcedureText(proc.objetivo || ""),
    cleanProcedureText(proc.alcance || ""),
    cleanProcedureText(proc.definiciones || ""),
    cleanProcedureText(proc.responsables || ""),
    cleanProcedureText(proc.procedimiento || ""),
    cleanProcedureText(proc.riesgos || ""),
    cleanProcedureText(proc.epp || "")
  ]);

  if (procedures.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("No hay procedimientos registrados para esta empresa.", 15, finalY);
  } else {
    autoTable(doc, {
      startY: finalY,
      margin: { top: 65, bottom: 45, left: 15, right: 15 },
      head: [["Título", "Objetivo", "Alcance", "Def. y Abrev.", "Responsables", "Procedimiento", "Riesgos", "EPP"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [40, 40, 45], textColor: 255, fontSize: 8, halign: "center" },
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak", valign: "top" },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: "bold" },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: "auto" }, // Procedimiento will take remaining space
        6: { cellWidth: 30 },
        7: { cellWidth: 25 },
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addHeader(doc, header);
        }
      }
    });
  }

  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, header, i);
  }

  savePDFWithLimit(doc, `Informe_General_PTS_${header.clientName?.replace(/\s+/g, "_") || "Empresa"}.pdf`);
};

export const generateProcedurePDF = (proc: any, header: PDFHeaderData) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  addHeader(doc, header);

  const cleanProcedureText = (txt: string) => {
    return txt ? txt.replace(/\r/g, "").replace(/\n/g, "\n") : "";
  };

  const sections = [];
  if (proc.objetivo) sections.push({ title: "1. OBJETIVO", content: cleanProcedureText(proc.objetivo) });
  if (proc.alcance) sections.push({ title: "2. ALCANCE", content: cleanProcedureText(proc.alcance) });
  if (proc.definiciones) sections.push({ title: "3. DEFINICIONES Y ABREVIACIONES", content: cleanProcedureText(proc.definiciones) });
  if (proc.responsables) sections.push({ title: "4. RESPONSABLES DE APLICAR Y CUMPLIR EL PTS", content: cleanProcedureText(proc.responsables) });
  if (proc.procedimiento) sections.push({ title: "5. PROCEDIMIENTO", content: cleanProcedureText(proc.procedimiento) });
  if (proc.riesgos) sections.push({ title: "6. RIESGOS ASOCIADOS A LA ACTIVIDAD", content: cleanProcedureText(proc.riesgos) });
  if (proc.epp) sections.push({ title: "7. ELEMENTOS DE PROTECCIÓN PERSONAL", content: cleanProcedureText(proc.epp) });
  if (proc.documentosRelacionados) sections.push({ title: "8. DOCUMENTOS RELACIONADOS", content: cleanProcedureText(proc.documentosRelacionados) });

  const body: any[] = [];
  sections.forEach((s) => {
    // Row 1: Title
    body.push([{ 
      content: s.title, 
      styles: { 
        fontStyle: "bold", 
        fontSize: 10, 
        textColor: [40, 40, 45], 
        fillColor: [240, 245, 248] as [number, number, number], 
        cellPadding: 4,
        halign: "left"
      } 
    }]);
    // Row 2: Content
    body.push([{ 
      content: s.content, 
      styles: { 
        fontStyle: "normal", 
        fontSize: 9, 
        textColor: [60, 60, 65], 
        cellPadding: { top: 4, right: 6, bottom: 8, left: 6 },
        halign: "justify"
      } 
    }]);
  });

  autoTable(doc, {
    startY: 75,
    margin: { left: 15, right: 15, bottom: 25 },
    body: body,
    theme: "plain",
    styles: {
      cellWidth: "wrap", 
      overflow: "linebreak",
      lineColor: [220, 225, 230] as [number, number, number],
      lineWidth: 0.1,
    }
  });

  if (proc.revision) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 5,
      margin: { left: 15, right: 15, bottom: 25 },
      body: [
        [{ 
          content: "9. REVISIÓN Y CONTROL DE CAMBIOS", 
          colSpan: 4,
          styles: { 
            fontStyle: "bold", 
            fontSize: 10, 
            textColor: [40, 40, 45], 
            fillColor: [240, 245, 248] as [number, number, number], 
            cellPadding: 4,
            halign: "left",
            lineWidth: 0.1,
            lineColor: [220, 225, 230] as [number, number, number],
          } 
        }],
        [{
          content: "Fecha de Elaboración",
          styles: { fontStyle: "bold", fillColor: [250, 250, 250] as [number, number, number] }
        }, {
          content: "Responsable",
          styles: { fontStyle: "bold", fillColor: [250, 250, 250] as [number, number, number] }
        }, {
          content: "Fecha de Mod.",
          styles: { fontStyle: "bold", fillColor: [250, 250, 250] as [number, number, number] }
        }, {
          content: "Descripción del Cambio",
          styles: { fontStyle: "bold", fillColor: [250, 250, 250] as [number, number, number] }
        }],
        [
          proc.revision.fechaElaboracion ? new Date(proc.revision.fechaElaboracion).toLocaleDateString() : "-",
          proc.revision.responsable || "-",
          proc.revision.fechaModificacion ? new Date(proc.revision.fechaModificacion).toLocaleDateString() : "-",
          proc.revision.descripcionCambio || "-",
        ]
      ],
      theme: "grid",
      styles: { fontSize: 8, textColor: [60, 60, 65], cellPadding: 4, halign: "center", valign: "middle", lineColor: [220, 225, 230] as [number, number, number], lineWidth: 0.1 },
    });
  }

  const totalPagesCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPagesCount; i++) {
    doc.setPage(i);
    if (i > 1) {
      addHeader(doc, header);
    }
    addFooter(doc, header, i);
  }

  savePDFWithLimit(doc, `PTS_${proc.title?.replace(/\s+/g, "_") || "Procedimiento"}.pdf`);
};

export const generateWorkerProfilePDF = (
  worker: any,
  header: PDFHeaderData
) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  addHeader(doc, header);

  let currentY = 65;
  const marginX = 15;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 110, 0);
  doc.text("FICHA PERSONAL DE TRABAJADOR Y SINIESTRALIDAD", marginX, currentY);
  currentY += 10;

  // Personal data table
  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    body: [
      [
        "Empresa / Contratante",
        header.clientName || "--",
        "RUT Contratante",
        header.clientRut || "--",
      ],
      [
        "Dirección Empresa",
        { content: header.clientAddress || "--", colSpan: 3 },
      ],
      [
        "Nombres",
        worker.firstName || "--",
        "Apellidos",
        `${worker.paternalLastName || ""} ${worker.maternalLastName || ""}`.trim() || "--",
      ],
      [
        "RUT",
        worker.rut || "--",
        "Estado / Contrato",
        `${worker.status === "active" ? "ACTIVO" : "INACTIVO"} / ${worker.contractType ? worker.contractType.replace(/_/g, " ").toUpperCase() : "INDEFINIDO"}`,
      ],
      [
        "Fecha Nacimiento",
        worker.birthDate || "--",
        "Fecha Ingreso",
        worker.incorporationDate || "--",
      ],
      [
        "Cargo / Puesto",
        worker.position || "--",
        "Email",
        { content: worker.email || "--", colSpan: 3 },
      ],
      [
        "Dirección Residencial",
        { content: worker.address || "--", colSpan: 3 },
      ],
      [
        "Teléfono",
        worker.phone || "--",
        "Motivo/Desc. Estado",
        worker.statusDescription || "--",
      ],
    ],
    theme: "grid",
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [240, 240, 245], cellWidth: 40 },
      2: { fontStyle: "bold", fillColor: [240, 240, 245], cellWidth: 40 },
    },
    styles: { fontSize: 9, textColor: [40, 40, 45] },
  });

  // Incidents
  const incidents = worker.incidents || [];
  currentY = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 110, 0);
  doc.text(
    `REGISTRO DE SINIESTRALIDAD INDIVIDUAL (${incidents.length} Eventos)`,
    marginX,
    currentY,
  );
  currentY += 8;

  if (incidents.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { top: 65, bottom: 45, left: marginX, right: marginX },
      head: [
        [
          "Fecha",
          "Hora",
          "Tipo",
          "Severidad",
          "Días Perdidos",
          "Descripción / Detalle",
        ],
      ],
      body: incidents.map((i: any) => [
        i.date || "--",
        `${i.hour || "--"} ${i.hourType || ""}`.trim() || "--",
        i.type === "accident"
          ? "ACCIDENTE TRAB."
          : i.type === "trayecto"
            ? "TRAYECTO"
            : i.type === "enfermedad"
              ? "ENFERMEDAD PROF."
              : i.type === "incident"
                ? "INCIDENTE/CUASI"
                : (i.type || "NO DEFINIDO").toUpperCase(),
        i.isFatal ? "FATAL" : `${i.invalidityDegree || 0}% de Invalidez`,
        i.daysLost || 0,
        `${i.title ? i.title.toUpperCase() + ": " : ""}${i.description || "Sin detalles"}`,
      ]),
      theme: "striped",
      headStyles: { fillColor: [220, 38, 38] }, // Red header
      styles: { fontSize: 8 },
      columnStyles: {
        5: { cellWidth: 50 },
        0: { cellWidth: 20 },
      },
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  } else {
    autoTable(doc, {
      startY: currentY,
      margin: { top: 65, bottom: 45, left: marginX, right: marginX },
      body: [["El trabajador(a) no registra historial de accidentes o incidentes."]],
      theme: "plain",
      styles: { fontSize: 10, textColor: [100, 100, 100] },
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // IRL Tickets
  const irls = worker.irls || [];

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 110, 0);
  doc.text(
    `REGISTRO DE INFORMACIÓN DE RIESGOS LABORALES (IRL - ${irls.length} Eventos)`,
    marginX,
    currentY,
  );
  currentY += 8;

  if (irls.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { top: 65, bottom: 45, left: marginX, right: marginX },
      head: [
        [
          "Fecha",
          "Tipo Inducción",
          "Cargo (Plantilla)",
          "Relator"
        ],
      ],
      body: irls.map((i: any) => [
        i.fecha || "--",
        i.tipoInduccion || "--",
        i.templateSnapshot?.cargo || "--",
        i.relatorName || "--",
      ]),
      theme: "striped",
      headStyles: { fillColor: [40, 40, 45] },
      styles: { fontSize: 8 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  } else {
    autoTable(doc, {
      startY: currentY,
      margin: { top: 65, bottom: 45, left: marginX, right: marginX },
      body: [["El trabajador(a) no registra historial de Inducción (IRL)."]],
      theme: "plain",
      styles: { fontSize: 10, textColor: [100, 100, 100] },
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Trainings
  const trainings = worker.trainings || [];

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 110, 0);
  doc.text(
    `REGISTRO DE CAPACITACIONES (${trainings.length} Eventos)`,
    marginX,
    currentY,
  );
  currentY += 8;

  if (trainings.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { top: 65, bottom: 45, left: marginX, right: marginX },
      head: [
        [
          "Fecha",
          "Tema / Nombre",
          "Instructor",
          "Observaciones"
        ],
      ],
      body: trainings.map((t: any) => [
        t.date || "--",
        t.topic || "--",
        t.instructor || "--",
        t.observations || "--",
      ]),
      theme: "striped",
      headStyles: { fillColor: [40, 40, 45] },
      styles: { fontSize: 8 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  } else {
    autoTable(doc, {
      startY: currentY,
      margin: { top: 65, bottom: 45, left: marginX, right: marginX },
      body: [["El trabajador(a) no registra capacitaciones o charlas."]],
      theme: "plain",
      styles: { fontSize: 10, textColor: [100, 100, 100] },
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Add header to subsequent pages
    if (i > 1) {
      addHeader(doc, header);
    }
    addFooter(doc, header, i);
  }

  savePDFWithLimit(doc,
    `Ficha_Trabajador_${worker.rut || "000000"}_${header.clientName.replace(/\s/g, "_")}.pdf`,
  );
};

export const generateMassiveActionPDF = (
  options: {
    type: "epp" | "training";
    date: string;
    topic?: string;
    trainingType?: string;
    instructor?: string;
    instructorType?: string;
    startTime?: string;
    endTime?: string;
    duration?: string;
    requester?: string;
    materials?: string;
    location?: string;
    observations: string;
    items?: {name: string}[];
    workCenterName: string;
    affectedWorkers: any[];
  },
  header: PDFHeaderData
) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "letter",
  });

  addHeader(doc, header);

  const marginX = 15;

  let currentY = 65;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 110, 0);
  const pdfTitle = options.type === "epp" ? "REGISTRO MASIVO DE ENTREGA DE EPP" : "REGISTRO DE ASISTENCIA A CAPACITACIÓN";
  doc.text(pdfTitle, marginX, currentY);

  currentY += 8;
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  
  if (options.type === "epp") {
    autoTable(doc, {
      startY: currentY,
      margin: { top: 65, bottom: 45, left: marginX, right: marginX },
      theme: "plain",
      head: [],
      body: [
        [
          { content: "Fecha Entrega:", styles: { fontStyle: "bold" } },
          { content: options.date },
          { content: "Artículos:", styles: { fontStyle: "bold" } },
          { content: options.items?.map(i => i.name).join(", ") || "-" }
        ],
        [
          { content: "Centro Trabajo:", styles: { fontStyle: "bold" } },
          { content: options.workCenterName },
          { content: "Observaciones:", styles: { fontStyle: "bold" } },
          { content: options.observations || "-" }
        ]
      ],
      styles: { fontSize: 9, textColor: [50, 50, 50] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 60 },
        2: { cellWidth: 30 },
        3: { cellWidth: 'auto' }
      },
      didDrawPage: (data) => {
        addHeader(doc, header);
        addFooter(doc, header, data.pageNumber);
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  } else {
    // Generate the Training Boxes layout based on the template
    const trainType = options.trainingType?.toLowerCase() || '';
    const getCheck = (t: string) => trainType === t ? '[ X ]' : '[   ]';
    
    autoTable(doc, {
      startY: currentY,
      margin: { top: 65, bottom: 45, left: marginX, right: marginX },
      theme: "plain",
      body: [
        [
          `CAPACITACION ${getCheck('capacitacion')}`,
          `CHARLA ${getCheck('charla')}`,
          `INDUCCION ${getCheck('induccion')}`,
          `OTRO ${getCheck('otro')}`
        ]
      ],
      styles: { fontSize: 10, fontStyle: "bold", halign: "center", cellPadding: 3, textColor: [50, 50, 50] },
      didDrawPage: (data) => {
        addHeader(doc, header);
        addFooter(doc, header, data.pageNumber);
      }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 5;
    
    // DATOS DEL CURSO
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DATOS DEL CURSO", marginX, currentY);
    currentY += 3;
    
    autoTable(doc, {
      startY: currentY,
      margin: { top: 65, bottom: 45, left: marginX, right: marginX },
      theme: "grid",
      head: [],
      body: [
        [
          { content: "Relator", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } },
          options.instructor || "--",
          { content: "Tipo", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } },
          `Interno ${options.instructorType === 'interno' ? '[X]' : '[ ]'} / Externo ${options.instructorType === 'externo' ? '[X]' : '[ ]'}`
        ],
        [
          { content: "Tema Tratado", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } },
          { content: options.topic || "--", colSpan: 3 }
        ],
        [
          { content: "Fecha", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } },
          options.date,
          { content: "Horario", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } },
          `${options.startTime || '--'} a ${options.endTime || '--'}`
        ],
        [
          { content: "Duración", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } },
          { content: options.duration || "--", colSpan: 3 }
        ]
      ],
      styles: { fontSize: 9, cellPadding: 2, lineColor: [200, 200, 200] },
      columnStyles: { 0: { cellWidth: 35 },  2: { cellWidth: 25 } },
      didDrawPage: (data) => {
        // Only draw on new pages to avoid redrawing header
        if (data.pageNumber > 1) {
          addHeader(doc, header);
          addFooter(doc, header, data.pageNumber);
        }
      }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 5;
    
    // DATOS DE LA CAPACITACION
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DATOS DE LA CAPACITACION / CHARLA", marginX, currentY);
    currentY += 3;
    
    autoTable(doc, {
      startY: currentY,
      margin: { top: 65, bottom: 45, left: marginX, right: marginX },
      theme: "grid",
      head: [],
      body: [
        [
          { content: "Nombre solicitante", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } },
          options.requester || "--"
        ],
        [
          { content: "Material de Apoyo", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } },
          options.materials || "--"
        ],
        [
          { content: "Lugar / Centro", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } },
          options.location || options.workCenterName || "--"
        ]
      ],
      styles: { fontSize: 9, cellPadding: 2, lineColor: [200, 200, 200] },
      columnStyles: { 0: { cellWidth: 50 } },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addHeader(doc, header);
          addFooter(doc, header, data.pageNumber);
        }
      }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  const tableStartY = currentY;

  autoTable(doc, {
    startY: tableStartY,
    margin: { top: 80, bottom: 45, left: marginX, right: marginX }, // Increased top margin to definitively prevent overlap
    head: [
      [
        "Nº",
        "Nombre Completo",
        "RUT",
        "Cargo",
        "Firma Trabajador"
      ]
    ],
    body: options.affectedWorkers.map((w, index) => [
      index + 1,
      `${w.firstName} ${w.paternalLastName} ${w.maternalLastName || ''}`.trim(),
      w.rut,
      w.position || "-",
      "" // Empty column for signature
    ]),
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], textColor: [255, 255, 255], fontStyle: "bold" },
    bodyStyles: { minCellHeight: 15, valign: "middle" }, // Give height for signatures
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 60 },
      2: { cellWidth: 25 },
      3: { cellWidth: 40 },
      4: { cellWidth: "auto" }
    },
    didDrawPage: (data) => {
      // Draw header and footer on EVERY page here, because previous autoTables might not run on this page
      addHeader(doc, header);
      addFooter(doc, header, data.pageNumber);
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  
  if (finalY > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    addHeader(doc, header);
    addFooter(doc, header, (doc.internal as any).getNumberOfPages());
    finalY = 80; // Match the new margin top
  }
  
  doc.text("Declaro haber recibido conforme la inducción / elementos indicados en este registro según D.S. 44 y la legislación vigente.", marginX, finalY);

  if (options.type === "training") {
    if (finalY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      addHeader(doc, header);
      addFooter(doc, header, (doc.internal as any).getNumberOfPages());
      finalY = 80;
    } else {
      finalY += 15;
    }
    
    // TEMAS TRATADOS
    autoTable(doc, {
      startY: finalY,
      margin: { top: 80, bottom: 45, left: marginX, right: marginX },
      theme: "grid",
      head: [],
      body: [
        [
          { content: "Temas Tratados:", styles: { fontStyle: "bold", fillColor: [240, 240, 240], cellWidth: 35 } },
          options.observations || "--"
        ]
      ],
      styles: { fontSize: 9, cellPadding: 4, lineColor: [200, 200, 200] },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addHeader(doc, header);
          addFooter(doc, header, data.pageNumber);
        }
      }
    });
    
    finalY = (doc as any).lastAutoTable.finalY + 40;
    
    // FIRMA RELATOR
    if (finalY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      addHeader(doc, header);
      addFooter(doc, header, (doc.internal as any).getNumberOfPages());
      finalY = 80;
    }
    
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 30, finalY, pageWidth / 2 + 30, finalY);
    doc.setFont("helvetica", "bold");
    doc.text("FIRMA RELATOR / INSTRUCTOR", pageWidth / 2, finalY + 5, { align: "center" });
  } else if (options.type === "epp") {
    finalY += 40;
    if (finalY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      addHeader(doc, header);
      addFooter(doc, header, (doc.internal as any).getNumberOfPages());
      finalY = 80;
    }
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 30, finalY, pageWidth / 2 + 30, finalY);
    doc.setFont("helvetica", "bold");
    doc.text("FIRMA PROFESIONAL / SUPERVISOR", pageWidth / 2, finalY + 5, { align: "center" });
  }

  savePDFWithLimit(doc,
    `Registro_Masivo_${options.type}_${header.clientName.replace(/\s/g, "_")}_${new Date().getTime()}.pdf`
  );
};

export const generateInvestigationPDF = (data: any, header: PDFHeaderData) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  addHeader(doc, header);

  let currentY = 65;
  const marginX = 15;

  const checkPageBreak = (needed: number) => {
    if (currentY + needed > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      currentY = 65;
    }
  };

  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    head: [[
      "CENTRO DE TRABAJO: " + (data.workCenter || "--"),
      "LUGAR DEL ACCIDENTE: " + (data.location || "--"),
    ], [
      "FECHA ACCIDENTE: " + (data.accidentDate || "--") + " HORA: " + (data.accidentTime || "--"),
      "NOMBRE JEFATURA A CARGO: " + (data.managerName || "--")
    ], [
      "TRABAJADOR ACCIDENTADO: " + (data.workerName || "--"),
      "RUT: " + (data.workerRut || "--")
    ]],
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    head: [["DESCRIPCIÓN DEL ACCIDENTE (Cómo ocurrió)"]],
    body: [[data.description || "Sin descripción."]],
    theme: "grid",
    headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 45], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8, minCellHeight: 20 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  const whysBody = data.whys && data.whys.length ? data.whys.map((why: string, idx: number) => {
    let q = idx === 0 
      ? "1. Indique ¿Por qué ocurrió el accidente?"
      : `${idx + 1}. Indique ¿Por qué ocurrieron los hechos indicados en el cuadro anterior?`;
    return [q, why || "--"];
  }) : [["", ""]];

  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    head: [["Pregunta (5 Por Qués)", "Respuesta"]],
    body: whysBody,
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 70 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    head: [["SUGERENCIAS PARA EVITAR REPETICIÓN DEL ACCIDENTE", "Responsable", "Fecha Implementación"]],
    body: data.suggestions && data.suggestions.length > 0 
      ? data.suggestions.map((s: any) => [s.recommendation || "--", s.responsible || "--", s.implementationDate || "--"])
      : [["--", "--", "--"]],
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 100 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    head: [["SEGUIMIENTO A RECOMENDACIONES", "Realizada por", "Fecha"]],
    body: data.followUp && data.followUp.length > 0 
      ? data.followUp.map((f: any) => {
          const sug = data.suggestions && data.suggestions[f.recommendationIndex] ? data.suggestions[f.recommendationIndex].recommendation : "--";
          return [sug || "--", f.doneBy || "--", f.date || "--"];
        })
      : [["--", "--", "--"]],
    theme: "grid",
    headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 45], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 100 } }
  });

  doc.addPage();
  currentY = 60;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("ANEXO N°1 - RECOPILACIÓN DE INFORMACIÓN", marginX, currentY);
  currentY += 10;

  const fmtBool = (val: any) => val === true ? "Sí" : val === false ? "No" : "--";
  const tr = data.tarea || {};

  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    head: [["TAREA (Actividad que realizaba la persona accidentada en el momento del accidente)", "Respuesta"]],
    body: [
      ["1. ¿La tarea que desarrollaba en el momento del accidente era propia de su puesto de trabajo?", fmtBool(tr.propia)],
      ["2. ¿La tarea que desarrollaba era habitual?", fmtBool(tr.habitual)],
      ["2.1. ¿Se realizaba la tarea habitual de la misma manera?", fmtBool(tr.mismaManera)],
      ["2.2. Desarrollando la tarea de la forma habitual ¿era posible el accidente?", fmtBool(tr.posibleAccidenteMismaManera)],
      ["2.3. ¿Por qué realizaba la tarea de diferente manera?", tr.porQueDiferente || "--"],
      ["3. ¿Con qué frecuencia había desarrollado esta tarea?", tr.frecuenciaTodaVida || "--"],
      ["4. ¿Había recibido instrucciones sobre cómo realizar la tarea?", fmtBool(tr.instruccionesPrevias)],
      ["4.1. ¿Qué tipo de instrucciones?", tr.tipoInstrucciones || "--"],
      ["4.2. ¿De quién recibió las instrucciones?", tr.autorInstrucciones || "--"],
      ["4.3. ¿Estaba realizando la tarea de acuerdo con esas instrucciones?", fmtBool(tr.realizandoConInstrucciones)],
    ],
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 140 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;
  const ep = data.epp || {};
  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    head: [["EQUIPO DE PROTECCIÓN PERSONAL (EPP)", "Respuesta"]],
    body: [
      ["5. ¿La tarea se realiza habitualmente con EPP?", fmtBool(ep.requiere)],
      ["Cuáles EPP:", ep.cuales || "--"],
      ["5.1. ¿El EPP es adecuado al riesgo?", fmtBool(ep.adecuado)],
      ["5.2. ¿Utilizaba estos equipos en el momento?", fmtBool(ep.utilizaba)],
      ["5.3. ¿Hubiera evitado el accidente la utilización de otro EPP?", fmtBool(ep.otroHubieraEvitado)]
    ],
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 140 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;
  const lu = data.lugar || {};
  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    head: [["LUGAR (Espacio físico)", "Respuesta"]],
    body: [
      ["6. ¿La tarea se realizaba en el lugar habitual?", fmtBool(lu.habitual)],
      ["6.1. Desarrollando la tarea en el lugar habitual ¿era posible el accidente?", fmtBool(lu.posibleAccidenteLugarHabitual)],
      ["6.2. ¿Por qué no lo realizaba en el lugar habitual?", lu.porQueOtroLugar || "--"]
    ],
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 140 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;
  const ti = data.tiempo || {};
  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    head: [["TIEMPO (Momento en el que sucedió)", "Respuesta"]],
    body: [
      ["8. ¿La tarea se realizaba en el momento habitual?", fmtBool(ti.habitual)],
      ["8.1. Desarrollando la tarea en el momento habitual ¿era posible el accidente?", fmtBool(ti.posibleAccidenteTiempoHabitual)],
      ["8.2. ¿Por qué no la realizaba en el momento habitual?", ti.porQueOtroTiempo || "--"]
    ],
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 140 } }
  });

  doc.addPage();
  currentY = 60;
  const eq = data.equipo || {};
  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    head: [["EQUIPO DE TRABAJO", "Respuesta"]],
    body: [
      ["10. ¿Se utilizaban equipos de trabajo?", fmtBool(eq.utiliza)],
      ["10.1. ¿El equipo era el habitual?", fmtBool(eq.habitual)],
      ["10.2. ¿Utilizando equipo habitual era posible el accidente?", fmtBool(eq.posibleAccidenteEquipoHabitual)],
      ["10.3. ¿Por qué no utilizaba equipo habitual?", eq.porQueNoHabitual || "--"]
    ],
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 140 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;
  const ma = data.materiales || {};
  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    head: [["MATERIALES Y PRODUCTOS", "Respuesta"]],
    body: [
      ["12. ¿Involucrado algún material/sustancia?", fmtBool(ma.involucrado)],
      ["12.2. ¿Es habitual su utilización?", fmtBool(ma.habitual)],
      ["12.3. ¿Por qué se utilizaba una no habitual?", ma.porQueNoHabitual || "--"]
    ],
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 140 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;
  const am = data.ambiente || {};
  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    head: [["AMBIENTE DE TRABAJO", "Presencia en Accidente", "Presencia Habitual"]],
    body: am.factoresRi && am.factoresRi.length > 0 
      ? am.factoresRi.map((f: any) => [f.name, fmtBool(f.accidente), fmtBool(f.habitual)])
      : [["--", "--", "--"]],
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 100 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;
  const me = data.musculoEsqueletico || {};
  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    head: [["FACTORES MÚSCULO ESQUELÉTICOS", "Presencia en Accidente", "Presencia Habitual"]],
    body: me.factores && me.factores.length > 0 
      ? me.factores.map((f: any) => [f.name, fmtBool(f.accidente), fmtBool(f.habitual)])
      : [["--", "--", "--"]],
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 100 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;
  const og = data.organizacion || {};
  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, bottom: 45, left: marginX, right: marginX },
    head: [["ORGANIZACIÓN DEL TRABAJO", "Presencia en Accidente", "Presencia Habitual"]],
    body: og.condiciones && og.condiciones.length > 0
      ? og.condiciones.map((f: any) => [f.name, fmtBool(f.accidente), fmtBool(f.habitual)])
      : [["--", "--", "--"]],
    theme: "grid",
    headStyles: { fillColor: [40, 40, 45], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 100 } }
  });

  doc.addPage();
  currentY = 60;
  
  // Render declarations
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DECLARACIONES", marginX, currentY);
  currentY += 10;

  if (data.declarations && data.declarations.length > 0) {
    data.declarations.forEach((decl: any, idx: number) => {
      autoTable(doc, {
        startY: currentY,
        margin: { top: 65, bottom: 45, left: marginX, right: marginX },
        head: [[`DECLARACIÓN ${idx + 1} - ${decl.type}`]],
        body: [
          [`Nombre: ${decl.name} | RUT: ${decl.rut} | Cargo: ${decl.position}`],
          [`Declaración:\n${decl.statement || "Sin declaración"}`]
        ],
        theme: "grid",
        headStyles: { fillColor: [255, 110, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        styles: { fontSize: 8 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 5;
    });
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Sin declaraciones adjuntas.", marginX, currentY);
    currentY += 10;
  }

  // Signatures Space
  checkPageBreak(50);
  currentY += 30;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  if (data.declarations && data.declarations.length > 0) {
    let sigLineY = currentY;
    data.declarations.forEach((decl: any, i: number) => {
      if (i % 2 === 0 && i !== 0) {
        sigLineY += 30;
      }
      if (sigLineY > 230) {
        doc.addPage();
        sigLineY = 70;
      }
      const xOffset = i % 2 === 0 ? pageWidth / 4 : (pageWidth / 4) * 3;
      doc.setDrawColor(100);
      doc.setLineWidth(0.5);
      doc.line(xOffset - 25, sigLineY, xOffset + 25, sigLineY);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(decl.name || "Testigo", xOffset, sigLineY + 5, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.text(decl.type || "", xOffset, sigLineY + 9, { align: "center" });
    });
  } else {
    doc.setDrawColor(100);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 30, currentY, pageWidth / 2 + 30, currentY);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("FIRMA JEFATURA DIRECTA / TESTIGO", pageWidth / 2, currentY + 5, { align: "center" });
  }

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Draw header on all pages. Page 1 already has it, so we draw on pages > 1
    if (i > 1) {
      addHeader(doc, header);
    }
    // Draw footer on all pages
    addFooter(doc, header, i);
  }

  savePDFWithLimit(doc,
    `Investigacion_Accidente_${data.workerRut || "Trabajador"}_${new Date().getTime()}.pdf`
  );
};

export const generateParityCommitteePDF = (
  committee: any,
  header: PDFHeaderData
) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  addHeader(doc, header);

  let currentY = 65;
  const marginX = 15;

  const checkPageBreak = (needed: number) => {
    if (currentY + needed > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      currentY = 65;
    }
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(`INFORME DE COMITÉ PARITARIO: ${committee.name.toUpperCase()}`, marginX, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, marginX, currentY);
  currentY += 15;

  // Members
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setFillColor(240, 240, 240);
  doc.rect(marginX, currentY, doc.internal.pageSize.getWidth() - 2 * marginX, 8, "F");
  doc.text("MIEMBROS DEL COMITÉ", marginX + 2, currentY + 6);
  currentY += 12;

  const membersBody = (committee.members || []).map((m: any) => [
    m.name,
    m.rut || "--",
    m.role,
    m.email || "--"
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, left: marginX, right: marginX, bottom: 45 },
    head: [["Nombre", "RUT", "Rol", "Email"]],
    body: membersBody.length ? membersBody : [["No hay miembros registrados", "", "", ""]],
    theme: "grid",
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    didDrawPage: (data) => {
      // Don't add header/footer here, handled at the end
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;
  checkPageBreak(30);

  // Sessions
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setFillColor(240, 240, 240);
  doc.rect(marginX, currentY, doc.internal.pageSize.getWidth() - 2 * marginX, 8, "F");
  doc.text("SESIONES REGISTRADAS Y ACUERDOS", marginX + 2, currentY + 6);
  currentY += 12;

  const sessionsBody = (committee.sessions || []).map((s: any) => [
    s.date,
    s.topic,
    s.agreements,
    (s.attendees || []).join(", ")
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, left: marginX, right: marginX, bottom: 45 },
    head: [["Fecha", "Tema", "Acuerdos", "Asistentes"]],
    body: sessionsBody.length ? sessionsBody : [["No hay sesiones registradas", "", "", ""]],
    theme: "grid",
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;
  checkPageBreak(30);

  // History / Records
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setFillColor(240, 240, 240);
  doc.rect(marginX, currentY, doc.internal.pageSize.getWidth() - 2 * marginX, 8, "F");
  doc.text("HISTORIAL DE REGISTROS", marginX + 2, currentY + 6);
  currentY += 12;

  const recordsBody = (committee.history || []).map((r: any) => [
    r.date,
    r.type,
    r.description,
    r.status
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { top: 65, left: marginX, right: marginX, bottom: 45 },
    head: [["Fecha", "Tipo", "Descripción", "Estado"]],
    body: recordsBody.length ? recordsBody : [["No hay registros", "", "", ""]],
    theme: "grid",
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;
  checkPageBreak(30);

  // Gantt Tasks Summary
  if (committee.ganttTasks && committee.ganttTasks.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setFillColor(240, 240, 240);
    doc.rect(marginX, currentY, doc.internal.pageSize.getWidth() - 2 * marginX, 8, "F");
    doc.text("CARTA GANTT (RESUMEN)", marginX + 2, currentY + 6);
    currentY += 12;

    const ganttBody = committee.ganttTasks.map((t: any) => [
      t.text,
      t.start_date,
      t.duration ? t.duration + " días" : "--",
      Math.round((t.progress || 0) * 100) + "%"
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { top: 65, left: marginX, right: marginX, bottom: 45 },
      head: [["Actividad", "Inicio", "Duración", "Progreso"]],
      body: ganttBody,
      theme: "grid",
      headStyles: { fillColor: [60, 60, 60], textColor: 255, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  checkPageBreak(60);

  // Signatures
  currentY += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text("FIRMAS DE CONFORMIDAD - COMITÉ PARITARIO", marginX, currentY);
  currentY += 40;

  const membersToSign = (committee.members || []).slice(0, 4); // Take up to 4 for signatures
  // If no members, provide blank lines
  if (membersToSign.length === 0) {
    doc.setDrawColor(100);
    doc.line(marginX + 10, currentY, marginX + 70, currentY);
    doc.text("FIRMA", marginX + 35, currentY + 5, { align: "center" });

    doc.line(doc.internal.pageSize.getWidth() - marginX - 70, currentY, doc.internal.pageSize.getWidth() - marginX - 10, currentY);
    doc.text("FIRMA", doc.internal.pageSize.getWidth() - marginX - 40, currentY + 5, { align: "center" });
  } else {
     let xPos = 40;
     membersToSign.forEach((m: any, i: number) => {
        if (i > 0 && i % 2 === 0) {
          xPos = 40;
          currentY += 60;
          checkPageBreak(40);
        }
        
        doc.setDrawColor(100);
        doc.setLineWidth(0.5);
        doc.line(xPos - 25, currentY, xPos + 35, currentY);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(m.name, xPos + 5, currentY + 5, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.text(m.role || "Miembro", xPos + 5, currentY + 9, { align: "center" });
        
        xPos = doc.internal.pageSize.getWidth() - 50; // switch to right side
     });
  }

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // don't add header on page 1 here if it overlaps, but in other generators it does:
    if (i > 1) {
      addHeader(doc, header);
    }
    addFooter(doc, header, i);
  }

  savePDFWithLimit(doc,
    `Comite_Paritario_${committee.name.replace(/\\s+/g, '_')}_${new Date().getTime()}.pdf`
  );
};

export const generateParityCommitteeSessionPDF = (
  committee: any,
  session: any,
  header: PDFHeaderData
) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  addHeader(doc, header);

  let currentY = 65;
  const marginX = 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(`ACTA DE SESIÓN COMITÉ PARITARIO`, marginX, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Comité:`, marginX, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(committee.name.toUpperCase(), marginX + 25, currentY);
  currentY += 6;

  doc.setFont("helvetica", "bold");
  doc.text(`Fecha:`, marginX, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(session.date).toLocaleDateString(), marginX + 25, currentY);
  currentY += 8;

  doc.setFont("helvetica", "bold");
  doc.text(`Tema de Sesión:`, marginX, currentY);
  currentY += 5;
  doc.setFont("helvetica", "normal");
  const splitTopic = doc.splitTextToSize(session.topic || "--", doc.internal.pageSize.getWidth() - marginX * 2);
  doc.text(splitTopic, marginX, currentY);
  currentY += splitTopic.length * 5 + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setFillColor(240, 240, 240);
  doc.rect(marginX, currentY, doc.internal.pageSize.getWidth() - 2 * marginX, 8, "F");
  doc.text("ACUERDOS Y TEMAS TRATADOS", marginX + 2, currentY + 6);
  currentY += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const splitAgreements = doc.splitTextToSize(session.agreements || "Sin acuerdos registrados.", doc.internal.pageSize.getWidth() - marginX * 2);
  doc.text(splitAgreements, marginX, currentY);
  currentY += splitAgreements.length * 5 + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setFillColor(240, 240, 240);
  doc.rect(marginX, currentY, doc.internal.pageSize.getWidth() - 2 * marginX, 8, "F");
  doc.text("ASISTENTES", marginX + 2, currentY + 6);
  currentY += 12;

  const attendeesBody = (session.attendees || []).map((a: string) => [a]);

  if (attendeesBody.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [["Nombre del Asistente"]],
      body: attendeesBody,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 },
      margin: { left: marginX, right: marginX },
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("No se registraron asistentes.", marginX, currentY);
    currentY += 10;
  }

  // Footer for all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    if (i > 1) {
      addHeader(doc, header);
    }
    addFooter(doc, header, i);
  }

  savePDFWithLimit(doc, `Acta_Comite_${new Date(session.date).getTime()}.pdf`);
};

export const generateSafetyIncidentPDF = (
  incident: any,
  header: PDFHeaderData,
) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  addHeader(doc, header);

  let currentY = 65;
  const marginX = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("REPORTE DE INCIDENTE", marginX, currentY);
  currentY += 10;

  // General Config
  doc.setFontSize(10);
  const leftCol = marginX;
  const rightCol = pageWidth / 2 + 5;
  const colSpacing = 6;
  
  const drawLabelValue = (label: string, value: string, x: number, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    // limit value length for single line or split
    const split = doc.splitTextToSize(value || "N/A", (pageWidth / 2) - 20);
    doc.text(split, x, y + 5);
    return split.length * 5;
  };

  // Basic Info
  let leftY = currentY;
  let rightY = currentY;

  leftY += drawLabelValue("Fecha del Incidente:", incident.date || "-", leftCol, leftY) + colSpacing;
  rightY += drawLabelValue("Centro de Trabajo:", incident.workCenter || "-", rightCol, rightY) + colSpacing;

  leftY += drawLabelValue("Trabajador / Contratista:", incident.workerName || "-", leftCol, leftY) + colSpacing;
  rightY += drawLabelValue("Clasificación del Evento:", incident.classification || "-", rightCol, rightY) + colSpacing;

  leftY += drawLabelValue("Potencialidad del Riesgo:", incident.riskPotential || "-", leftCol, leftY) + colSpacing;
  
  if (incident.cost !== undefined && incident.cost !== null) {
    rightY += drawLabelValue("Costo Asociado:", `$${incident.cost.toLocaleString("es-CL")}`, rightCol, rightY) + colSpacing;
  } else {
    rightY += drawLabelValue("Costo Asociado:", "-", rightCol, rightY) + colSpacing;
  }

  currentY = Math.max(leftY, rightY) + 5;

  // Full width fields
  const drawFullWidthSection = (title: string, content: string) => {
    if (currentY > 240) {
      doc.addPage();
      addHeader(doc, header);
      currentY = 65;
    }
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(marginX, currentY, pageWidth - marginX * 2, 8, "F");
    doc.text(title, marginX + 2, currentY + 6);
    currentY += 12;

    doc.setFont("helvetica", "normal");
    const splitText = doc.splitTextToSize(content || "Sin información.", pageWidth - marginX * 2);
    doc.text(splitText, marginX, currentY);
    currentY += splitText.length * 5 + 8;
  };

  drawFullWidthSection("1. Lugar del Incidente", incident.location);
  drawFullWidthSection("2. Peligro Observado", incident.observedHazard);
  drawFullWidthSection("3. Acciones Correctivas Dadas", incident.correctiveActions);
  drawFullWidthSection("4. Medidas de Control a Implementar", incident.controlMeasures);

  // Footer for all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    if (i > 1) {
      addHeader(doc, header);
    }
    addFooter(doc, header, i);
  }

  savePDFWithLimit(doc, `Reporte_Incidente_${new Date(incident.date).getTime()}.pdf`);
};

export const generateProfessionalReportPDF = (data: any, header: PDFHeaderData) => {
  if (!checkPDFLimitEarly(header)) return;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  addHeader(doc, header);

  let currentY = header.workCenter ? 70 : 65;

  const sectionTitle = (title: string, bg: number[] = [240, 240, 240]) => {
    if (currentY > 230) {
      doc.addPage();
      addHeader(doc, header);
      currentY = header.workCenter ? 70 : 65;
    }
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(15, currentY, 185, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(title, 18, currentY + 6);
    currentY += 12;
  };

  sectionTitle("1. Resumen de Período", [200, 220, 240]);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Período de Evaluación: ${data.period}`, 15, currentY);
  currentY += 15;

  sectionTitle("2. Estadísticas de Gestión", [200, 240, 200]);

  // Framed Boxes for Stats
  const startX = 15;
  const boxWidth = 43;
  const boxHeight = 25;
  const gap = 4;

  const statBoxes = [
    { label: "Trabajadores", value: data.stats.workers },
    { label: "Obj. Gantt Logrados", value: data.stats.objectivesAchieved },
    { label: "Procedimientos", value: data.stats.procedures },
    { label: "Incidentes/Acc.", value: data.stats.accidents }
  ];

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);

  statBoxes.forEach((box, index) => {
     const bx = startX + (boxWidth + gap) * index;
     doc.setFillColor(250, 250, 250);
     doc.rect(bx, currentY, boxWidth, boxHeight, "FD");
     
     // text vertically and horizontally centered
     doc.setFont("helvetica", "bold");
     doc.setFontSize(16);
     doc.setTextColor(50, 50, 50);
     const vWidth = doc.getTextWidth(String(box.value));
     doc.text(String(box.value), bx + (boxWidth - vWidth) / 2, currentY + 12);

     doc.setFont("helvetica", "normal");
     doc.setFontSize(8);
     doc.setTextColor(100, 100, 100);
     const lWidth = doc.getTextWidth(box.label);
     doc.text(box.label, bx + (boxWidth - lWidth) / 2, currentY + 20);
  });
  
  currentY += boxHeight + 15;

          sectionTitle("3. Hallazgos / Observaciones");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);

  const renderCommentsBoxes = (comments: string[], defaultText: string) => {
    if (!comments || comments.length === 0) {
      if (currentY > 240) {
        doc.addPage();
        addHeader(doc, header);
        currentY = header.workCenter ? 70 : 65;
      }
      const splitText = doc.splitTextToSize(defaultText, 185);
      doc.text(splitText, 15, currentY);
      currentY += splitText.length * 5 + 15;
      return;
    }

    comments.forEach((comment, index) => {
      const splitComment = doc.splitTextToSize(comment, 175);
      const boxH = splitComment.length * 5 + 10;
      if (currentY + boxH > 240) {
        doc.addPage();
        addHeader(doc, header);
        currentY = header.workCenter ? 70 : 65;
      }

      // Draw box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(252, 252, 252);
      doc.rect(15, currentY, 185, boxH, "FD");

      // Number badge
      doc.setFillColor(230, 230, 230);
      doc.rect(15, currentY, 8, boxH, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(String(index + 1), 17, currentY + 6);

      // Text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text(splitComment, 26, currentY + 7);
      
      currentY += boxH + 4;
    });
    currentY += 10;
  };

  renderCommentsBoxes(data.findingsComments, "Sin observaciones ingresadas por el profesional sobre hallazgos estructurados.");

  sectionTitle("4. Medidas Correctivas");
  renderCommentsBoxes(data.correctiveMeasuresComments, "Sin medidas correctivas ingresadas.");

  sectionTitle("5. Declaración de Conformidad");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  const declaration = "Por la presente declaro que las acciones preventivas, inspecciones documentales y levantamientos registrados en este reporte reflejan la gestión realizada en representación del cliente de acuerdo con la información obtenida a través de la plataforma.";
  const splitDeclaration = doc.splitTextToSize(declaration, 185);
  
  if (currentY + splitDeclaration.length * 5 > 240) {
    doc.addPage();
    addHeader(doc, header);
    currentY = header.workCenter ? 70 : 65;
  }
  
  doc.text(splitDeclaration, 15, currentY);
  
  currentY += splitDeclaration.length * 5 + 15;

  // Footer for all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    if (i > 1) {
      addHeader(doc, header);
    }
    addFooter(doc, header, i);
  }

  savePDFWithLimit(doc, `Reporte_Profesional_${new Date().getTime()}.pdf`);
};

