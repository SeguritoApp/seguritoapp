import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  collection,
  doc,
  query,
  getDocs,
  serverTimestamp,
  addDoc,
  setDoc
} from "../services/firestore";
import { db } from "../services/firebase";
import {
  ArrowLeft,
  FileText,
  Search,
  Save,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateInvestigationPDF } from "../services/pdfService";
import { fetchPredictiveWorkers } from "../lib/workerSearch";

// Helper function to simulate cleanForFirestore (can receive it via props or reimplement)
const cleanForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(cleanForFirestore);
  
  // Date handling
  if (obj instanceof Date) return obj;
  if (obj.toDate && typeof obj.toDate === "function") return obj;
  if (obj.isEqual && typeof obj.isEqual === "function") return obj; // Preserve FieldValues
  
  const cleaned: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = cleanForFirestore(val);
    }
  }
  return cleaned;
};

export const AccidentInvestigationForm = ({
  onBack,
  selectedClientId,
  user,
  profile,
  clients
}: {
  onBack: () => void;
  selectedClientId: string;
  user: any;
  profile: any;
  clients: any[];
}) => {
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    workCenter: "",
    location: "",
    accidentDate: new Date().toISOString().split("T")[0],
    accidentTime: "12:00",
    managerName: "",
    description: "",
    whys: ["", "", "", ""],
    suggestions: [{ recommendation: "", responsible: "", implementationDate: "" }],
    followUp: [{ recommendationIndex: 0, doneBy: "", date: "" }],
    
    // Anexo 1
    tarea: {
      propia: null as boolean | null,
      habitual: null as boolean | null,
      mismaManera: null as boolean | null,
      posibleAccidenteMismaManera: null as boolean | null,
      porQueDiferente: "",
      frecuenciaTodaVida: "" as "Primera vez" | "Esporádica" | "Frecuente" | "",
      instruccionesPrevias: null as boolean | null,
      tipoInstrucciones: "" as "Escritas" | "Verbales" | "Ambas" | "",
      autorInstrucciones: "" as "Empleador" | "Jefe" | "Encargado" | "Compañeros" | "",
      realizandoConInstrucciones: null as boolean | null,
    },
    epp: {
      requiere: null as boolean | null,
      cuales: "",
      adecuado: null as boolean | null,
      utilizaba: null as boolean | null,
      otroHubieraEvitado: null as boolean | null,
    },
    lugar: {
      habitual: null as boolean | null,
      posibleAccidenteLugarHabitual: null as boolean | null,
      porQueOtroLugar: "",
      circunstancias: [] as string[],
    },
    tiempo: {
      habitual: null as boolean | null,
      posibleAccidenteTiempoHabitual: null as boolean | null,
      porQueOtroTiempo: "",
      circunstancias: [] as string[],
    },
    equipo: {
      utiliza: null as boolean | null,
      cuales: "",
      habitual: null as boolean | null,
      posibleAccidenteEquipoHabitual: null as boolean | null,
      porQueNoHabitual: "",
      circunstancias: [] as string[],
    },
    materiales: {
      involucrado: null as boolean | null,
      tipo: [] as string[],
      habitual: null as boolean | null,
      porQueNoHabitual: "",
      circunstancias: [] as string[],
    },
    ambiente: {
      factoresRi: [
        { name: "Agresión térmica por frío/calor", accidente: null, habitual: null },
        { name: "Nivel de ruido elevado", accidente: null, habitual: null },
        { name: "Iluminación incorrecta", accidente: null, habitual: null },
        { name: "Nivel de vibración", accidente: null, habitual: null },
        { name: "Exposición ambiental a sustancias / productos", accidente: null, habitual: null },
        { name: "Exposición a contaminantes biológicos", accidente: null, habitual: null },
        { name: "Agresiones por seres vivos", accidente: null, habitual: null }
      ] as { name: string; accidente: boolean | null; habitual: boolean | null }[],
    },
    musculoEsqueletico: {
      factores: [
        { name: "Exceso de esfuerzo físico", accidente: null, habitual: null },
        { name: "Manipulación de cargas", accidente: null, habitual: null },
        { name: "Posturas forzadas", accidente: null, habitual: null },
        { name: "Movimientos repetitivos", accidente: null, habitual: null }
      ] as { name: string; accidente: boolean | null; habitual: boolean | null }[],
    },
    organizacion: {
      condiciones: [
        { name: "Simultaneidad de tareas por el mismo operario", accidente: null, habitual: null },
        { name: "Trabajo a velocidad o ritmo elevado", accidente: null, habitual: null },
        { name: "Primas por productividad", accidente: null, habitual: null },
        { name: "Trabajo monótono", accidente: null, habitual: null },
        { name: "Trabajo aislado/solitario", accidente: null, habitual: null },
        { name: "Falta de supervisión", accidente: null, habitual: null },
        { name: "Trabajo a turnos", accidente: null, habitual: null },
        { name: "Trabajo nocturno", accidente: null, habitual: null },
        { name: "Trabajo temporal", accidente: null, habitual: null },
        { name: "Exceso de horas de trabajo", accidente: null, habitual: null },
        { name: "Exceso de esfuerzo mental", accidente: null, habitual: null },
      ] as { name: string; accidente: boolean | null; habitual: boolean | null }[],
    },
    
    declarations: [] as any[]
  });

  // Load workers
  useEffect(() => {
    let isMounted = true;
    const fetchPredictive = async () => {
      if (searchQuery.length < 3) {
        if (isMounted) setWorkers([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await fetchPredictiveWorkers(selectedClientId, searchQuery, 15, { hasIncidentsOnly: true });
        if (isMounted) {
          // Worker search library now filters for incidents before slicing!
          setWorkers(results);
        }
      } catch (error) {
        console.error("Predictive search error", error);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    };
    
    const timeoutId = setTimeout(fetchPredictive, 300);
    return () => { isMounted = false; clearTimeout(timeoutId); };
  }, [searchQuery, selectedClientId]);

  // Search logic
  const filteredWorkers = workers;

  const selectWorker = (w: any) => {
    setSelectedWorker(w);
    setSearchQuery(`${w.firstName} ${w.paternalLastName}`);
    setShowSuggestions(false);
    setSelectedIncident(null);
    
    const clientObj = clients.find(c => c.id === selectedClientId);
    const wcName = clientObj?.workCenters?.find((wc: any) => wc.id === w.workCenterId)?.name || "";
      
    setFormData(prev => ({
      ...prev,
      workCenter: wcName || prev.workCenter,
    }));
  };

  const handleSave = async () => {
    if (!selectedWorker || !selectedIncident) {
      alert("Por favor seleccione un trabajador y un siniestro.");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        ...formData,
        workerId: selectedWorker.id,
        workerName: `${selectedWorker.firstName} ${selectedWorker.paternalLastName}`,
        workerRut: selectedWorker.rut,
        incidentId: selectedIncident.id,
        incidentTitle: selectedIncident.title,
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(
        collection(db, `clients/${selectedClientId}/investigations`),
        cleanForFirestore({ ...payload, id: undefined })
      );
      
      const reportRef = doc(collection(db, `clients/${selectedClientId}/reports`));
      
      const selectedClient = clients.find(c => c.id === selectedClientId);
      const userPlan = profile?.subscriptionType || "free";

      const headerData = {
        title: "INFORME INVESTIGACIÓN DE ACCIDENTES",
        clientName: selectedClient?.name || "Cliente",
        authorName: profile?.displayName || user?.displayName || "Profesional",
        license: profile?.professionalLicense || profile?.seremiNumber || "",
        signatureURL: profile?.signatureURL || profile?.signature || "",
        date: new Date().toLocaleDateString(),
        userPlan: { subscriptionType: userPlan }
      };

      await setDoc(reportRef, cleanForFirestore({
        id: reportRef.id,
        clientId: selectedClientId,
        title: `Investigación de Accidente - ${selectedWorker.firstName} ${selectedWorker.paternalLastName}`,
        type: "investigation_report",
        createdAt: serverTimestamp(),
        authorName: headerData.authorName,
        pdfName: `Investigacion_Accidente_${selectedWorker.rut}_${new Date().getTime()}.pdf`,
        headerSnapshot: headerData,
        dataSnapshot: payload,
      }));

      generateInvestigationPDF(payload, headerData);

      alert("Investigación guardada y PDF generado exitosamente.");
      onBack();
    } catch (e) {
      console.error(e);
      alert("Error al guardar la investigación");
    } finally {
      setLoading(false);
    }
  };

  // Environment checks constants
  const ambientFactorsList = [
    "Agresión térmica por frío/calor",
    "Nivel de ruido elevado",
    "Iluminación incorrecta",
    "Nivel de vibración",
    "Exposición a sustancias tóxicas",
    "Exposición a contaminantes biológicos",
    "Agresiones por seres vivos"
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-32">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-widest mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Volver a Selección
      </button>

      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none mb-2">
          Investigación de Accidentes
        </h1>
        <p className="text-slate-500 text-sm font-medium">
          Diligencie el formulario de investigación según la metodología de Árbol de Causas y 5 Por Qués.
        </p>
      </div>

      {/* Worker / Incident Context */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm mb-8 relative z-50">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
          1. Identificación del Siniestro
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          <div className="relative z-50">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
              Buscar Trabajador (Predictivo)
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Escriba nombre o RUT..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-blue-500 outline-none"
              />
              {showSuggestions && searchQuery.length >= 3 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
                  {filteredWorkers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      {isSearching ? "Buscando..." : "No se encontraron trabajadores con siniestros reportados."}
                    </div>
                  ) : (
                    filteredWorkers.map(w => (
                      <button
                        key={w.id}
                        onClick={() => selectWorker(w)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        <div className="text-sm font-bold text-slate-900">{w.firstName} {w.paternalLastName}</div>
                        <div className="text-xs text-slate-500">{w.rut} • {(w.incidents?.length || 0)} siniestro(s)</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="relative z-40">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
              Seleccionar Siniestro
            </label>
            <select
              value={selectedIncident?.id || ""}
              onChange={(e) => {
                const inc = selectedWorker?.incidents?.find((inc: any) => inc.id === e.target.value);
                setSelectedIncident(inc);
                if (inc) {
                  setFormData(prev => ({
                    ...prev,
                    location: inc.location || prev.location,
                    accidentDate: inc.date ? inc.date.split("T")[0] : prev.accidentDate,
                    accidentTime: inc.time || prev.accidentTime,
                    description: inc.description || prev.description,
                  }));
                }
              }}
              disabled={!selectedWorker}
              className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold disabled:opacity-50"
            >
              <option value="">Seleccione un registro...</option>
              {selectedWorker?.incidents?.map((inc: any) => (
                <option key={inc.id} value={inc.id}>{inc.date} - {inc.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Form Body */}
      {selectedWorker && selectedIncident && (
        <div className="space-y-8 relative z-10">
          {/* Box 1 */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              2. Datos Iniciales del Evento
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Centro de Trabajo</label>
                <input type="text" value={formData.workCenter} onChange={e => setFormData({...formData, workCenter: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Lugar del Accidente</label>
                <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Fecha Accidente</label>
                <input type="date" value={formData.accidentDate} onChange={e => setFormData({...formData, accidentDate: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Hora</label>
                <input type="time" value={formData.accidentTime} onChange={e => setFormData({...formData, accidentTime: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-medium" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">Nombre Jefatura a Cargo</label>
                <input type="text" value={formData.managerName} onChange={e => setFormData({...formData, managerName: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-medium" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">Descripción del Accidente (Cómo ocurrió)</label>
                <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-medium resize-none" />
              </div>
            </div>
          </div>

          {/* 5 Whys */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              3. Análisis Casual (5 Por Qués)
            </h2>
            <div className="space-y-4">
              {formData.whys.map((why, idx) => (
                <div key={idx} className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">
                    {idx === 0 ? "1. Indique ¿Por qué ocurrió el accidente?" : `${idx + 1}. Indique ¿Por qué ocurrieron los hechos indicados en el cuadro anterior?`}
                  </label>
                  <input type="text" value={why} onChange={e => {
                    const newWhys = [...formData.whys] as any;
                    newWhys[idx] = e.target.value;
                    setFormData({...formData, whys: newWhys});
                  }} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-medium" />
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          {/* Sugerencias Section */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                4. Sugerencias para Evitar Repetición
              </h2>
              <button 
                onClick={() => setFormData({...formData, suggestions: [...formData.suggestions, { recommendation: "", responsible: "", implementationDate: "" }]})}
                className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-2"
              >
                <Plus size={14}/> Agregar Sugerencia
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.suggestions.map((sug, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="md:col-span-5">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Recomendación</label>
                    <input type="text" value={sug.recommendation} onChange={e => {
                      const s = [...formData.suggestions]; s[idx].recommendation = e.target.value; setFormData({...formData, suggestions: s});
                    }} className="w-full bg-white p-2.5 rounded-lg border border-slate-200 text-xs" />
                  </div>
                  <div className="md:col-span-4">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Responsable</label>
                    <input type="text" value={sug.responsible} onChange={e => {
                      const s = [...formData.suggestions]; s[idx].responsible = e.target.value; setFormData({...formData, suggestions: s});
                    }} className="w-full bg-white p-2.5 rounded-lg border border-slate-200 text-xs" />
                  </div>
                  <div className="md:col-span-3 pb-1 flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Fecha Implementación</label>
                      <input type="date" value={sug.implementationDate} onChange={e => {
                        const s = [...formData.suggestions]; s[idx].implementationDate = e.target.value; setFormData({...formData, suggestions: s});
                      }} className="w-full bg-white p-2.5 rounded-lg border border-slate-200 text-xs" />
                    </div>
                    {idx > 0 && (
                      <button onClick={() => {
                        const s = [...formData.suggestions]; s.splice(idx, 1); setFormData({...formData, suggestions: s});
                      }} className="p-2.5 bg-red-50 text-red-500 rounded-lg shrink-0">
                        <Trash2 size={16}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                5. Seguimiento a Recomendaciones
              </h2>
              <button 
                onClick={() => setFormData({...formData, followUp: [...formData.followUp, { recommendationIndex: 0, doneBy: "", date: "" }]})}
                className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-2"
              >
                <Plus size={14}/> Agregar Seguimiento
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.followUp.map((flw, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="md:col-span-5">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Sugerencia Recomendada</label>
                    <select value={flw.recommendationIndex} onChange={e => {
                      const f = [...formData.followUp]; f[idx].recommendationIndex = parseInt(e.target.value); setFormData({...formData, followUp: f});
                    }} className="w-full bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                      {formData.suggestions.map((s, idx2) => (
                        <option key={idx2} value={idx2}>{s.recommendation || `Sugerencia ${idx2 + 1}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-4">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Realizada por</label>
                    <input type="text" value={flw.doneBy} onChange={e => {
                      const f = [...formData.followUp]; f[idx].doneBy = e.target.value; setFormData({...formData, followUp: f});
                    }} className="w-full bg-white p-2.5 rounded-lg border border-slate-200 text-xs" />
                  </div>
                  <div className="md:col-span-3 pb-1 flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Fecha</label>
                      <input type="date" value={flw.date} onChange={e => {
                        const f = [...formData.followUp]; f[idx].date = e.target.value; setFormData({...formData, followUp: f});
                      }} className="w-full bg-white p-2.5 rounded-lg border border-slate-200 text-xs" />
                    </div>
                    {idx > 0 && (
                      <button onClick={() => {
                        const f = [...formData.followUp]; f.splice(idx, 1); setFormData({...formData, followUp: f});
                      }} className="p-2.5 bg-red-50 text-red-500 rounded-lg shrink-0">
                        <Trash2 size={16}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="h-4" /> {/* Space before anexo */}
          
          <div className="text-center">
            <h2 className="text-xl font-black text-slate-900 uppercase italic">ANEXO N°1</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">FORMULARIO A UTILIZAR PARA LA RECOPILACIÓN DE INFORMACIÓN</p>
          </div>
          
          {/* Rest of the form based on Anexo 1 */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
             <h3 className="text-sm font-black text-slate-900 uppercase italic border-b border-slate-100 pb-2">TAREA</h3>
             <div className="space-y-4 text-sm font-medium text-slate-700">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>1. ¿La tarea que desarrollaba en el momento del accidente era propia de su puesto de trabajo?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tarea.propia === true} onChange={() => setFormData({...formData, tarea: {...formData.tarea, propia: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tarea.propia === false} onChange={() => setFormData({...formData, tarea: {...formData.tarea, propia: false}})}/> No</label>
                 </div>
               </div>
               
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>2. ¿La tarea que desarrollaba era habitual?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tarea.habitual === true} onChange={() => setFormData({...formData, tarea: {...formData.tarea, habitual: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tarea.habitual === false} onChange={() => setFormData({...formData, tarea: {...formData.tarea, habitual: false}})}/> No</label>
                 </div>
               </div>

               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>2.1. ¿Se realizaba la tarea habitual de la misma manera?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tarea.mismaManera === true} onChange={() => setFormData({...formData, tarea: {...formData.tarea, mismaManera: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tarea.mismaManera === false} onChange={() => setFormData({...formData, tarea: {...formData.tarea, mismaManera: false}})}/> No</label>
                 </div>
               </div>

               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>2.2. Desarrollando la tarea de la forma habitual ¿era posible el accidente?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tarea.posibleAccidenteMismaManera === true} onChange={() => setFormData({...formData, tarea: {...formData.tarea, posibleAccidenteMismaManera: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tarea.posibleAccidenteMismaManera === false} onChange={() => setFormData({...formData, tarea: {...formData.tarea, posibleAccidenteMismaManera: false}})}/> No</label>
                 </div>
               </div>

               <div className="space-y-1 p-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase">2.3. ¿Por qué realizaba la tarea de diferente manera?</label>
                 <input type="text" value={formData.tarea.porQueDiferente} onChange={e => setFormData({...formData, tarea: {...formData.tarea, porQueDiferente: e.target.value}})} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-medium" />
               </div>

               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>3. ¿Con qué frecuencia el trabajador había desarrollado esta tarea?</span>
                 <select value={formData.tarea.frecuenciaTodaVida} onChange={e => setFormData({...formData, tarea: {...formData.tarea, frecuenciaTodaVida: e.target.value as any}})} className="bg-white p-2 rounded-lg border border-slate-200 outline-none">
                   <option value="">Seleccione...</option>
                   <option value="Primera vez">Primera vez</option>
                   <option value="Esporádica">Esporádica</option>
                   <option value="Frecuente">Frecuente</option>
                 </select>
               </div>

               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>4. ¿Había recibido instrucciones sobre cómo realizar la tarea?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tarea.instruccionesPrevias === true} onChange={() => setFormData({...formData, tarea: {...formData.tarea, instruccionesPrevias: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tarea.instruccionesPrevias === false} onChange={() => setFormData({...formData, tarea: {...formData.tarea, instruccionesPrevias: false}})}/> No</label>
                 </div>
               </div>
               
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>4.1. ¿Qué tipo de instrucciones?</span>
                 <select value={formData.tarea.tipoInstrucciones} onChange={e => setFormData({...formData, tarea: {...formData.tarea, tipoInstrucciones: e.target.value as any}})} className="bg-white p-2 rounded-lg border border-slate-200 outline-none">
                   <option value="">Seleccione...</option>
                   <option value="Escritas">Escritas</option>
                   <option value="Verbales">Verbales</option>
                   <option value="Ambas">Ambas</option>
                 </select>
               </div>
               
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>4.2. ¿De quién recibió las instrucciones?</span>
                 <select value={formData.tarea.autorInstrucciones} onChange={e => setFormData({...formData, tarea: {...formData.tarea, autorInstrucciones: e.target.value as any}})} className="bg-white p-2 rounded-lg border border-slate-200 outline-none">
                   <option value="">Seleccione...</option>
                   <option value="Empleador">Empleador</option>
                   <option value="Jefe">Jefe</option>
                   <option value="Encargado">Encargado</option>
                   <option value="Compañeros">Compañeros</option>
                 </select>
               </div>
               
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>4.3. ¿Estaba realizando la tarea de acuerdo con esas instrucciones?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tarea.realizandoConInstrucciones === true} onChange={() => setFormData({...formData, tarea: {...formData.tarea, realizandoConInstrucciones: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tarea.realizandoConInstrucciones === false} onChange={() => setFormData({...formData, tarea: {...formData.tarea, realizandoConInstrucciones: false}})}/> No</label>
                 </div>
               </div>
             </div>

             <h3 className="text-sm font-black text-slate-900 uppercase italic border-b border-slate-100 pb-2 mt-8">EQUIPO DE PROTECCIÓN PERSONAL (EPP)</h3>
             <div className="space-y-4 text-sm font-medium text-slate-700">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>5. ¿La tarea se realiza habitualmente con EPP?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.epp.requiere === true} onChange={() => setFormData({...formData, epp: {...formData.epp, requiere: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.epp.requiere === false} onChange={() => setFormData({...formData, epp: {...formData.epp, requiere: false}})}/> No</label>
                 </div>
               </div>
               <div className="space-y-1 p-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase">Si es sí, indique cuáles:</label>
                 <input type="text" value={formData.epp.cuales} onChange={e => setFormData({...formData, epp: {...formData.epp, cuales: e.target.value}})} className="w-full bg-white p-3 rounded-xl border border-slate-200 text-sm font-medium" />
               </div>
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>5.1. ¿El EPP es adecuado al riesgo?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.epp.adecuado === true} onChange={() => setFormData({...formData, epp: {...formData.epp, adecuado: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.epp.adecuado === false} onChange={() => setFormData({...formData, epp: {...formData.epp, adecuado: false}})}/> No</label>
                 </div>
               </div>
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>5.2. ¿Utilizaba estos equipos en el momento?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.epp.utilizaba === true} onChange={() => setFormData({...formData, epp: {...formData.epp, utilizaba: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.epp.utilizaba === false} onChange={() => setFormData({...formData, epp: {...formData.epp, utilizaba: false}})}/> No</label>
                 </div>
               </div>
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>5.3. ¿Hubiera evitado el accidente la utilización de otro EPP?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.epp.otroHubieraEvitado === true} onChange={() => setFormData({...formData, epp: {...formData.epp, otroHubieraEvitado: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.epp.otroHubieraEvitado === false} onChange={() => setFormData({...formData, epp: {...formData.epp, otroHubieraEvitado: false}})}/> No</label>
                 </div>
               </div>
             </div>

             <h3 className="text-sm font-black text-slate-900 uppercase italic border-b border-slate-100 pb-2 mt-8">LUGAR</h3>
             <div className="space-y-4 text-sm font-medium text-slate-700">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>6. ¿La tarea se realizaba en el lugar habitual?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.lugar.habitual === true} onChange={() => setFormData({...formData, lugar: {...formData.lugar, habitual: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.lugar.habitual === false} onChange={() => setFormData({...formData, lugar: {...formData.lugar, habitual: false}})}/> No</label>
                 </div>
               </div>
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>6.1. Desarrollando la tarea en el lugar habitual ¿era posible el accidente?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.lugar.posibleAccidenteLugarHabitual === true} onChange={() => setFormData({...formData, lugar: {...formData.lugar, posibleAccidenteLugarHabitual: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.lugar.posibleAccidenteLugarHabitual === false} onChange={() => setFormData({...formData, lugar: {...formData.lugar, posibleAccidenteLugarHabitual: false}})}/> No</label>
                 </div>
               </div>
               <div className="space-y-1 p-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase">6.2. ¿Por qué no lo realizaba en el lugar habitual?</label>
                 <input type="text" value={formData.lugar.porQueOtroLugar} onChange={e => setFormData({...formData, lugar: {...formData.lugar, porQueOtroLugar: e.target.value}})} className="w-full bg-white p-3 rounded-xl border border-slate-200 text-sm font-medium" />
               </div>
             </div>

             <h3 className="text-sm font-black text-slate-900 uppercase italic border-b border-slate-100 pb-2 mt-8">TIEMPO</h3>
             <div className="space-y-4 text-sm font-medium text-slate-700">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>8. ¿La tarea se realizaba en el momento habitual?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tiempo.habitual === true} onChange={() => setFormData({...formData, tiempo: {...formData.tiempo, habitual: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tiempo.habitual === false} onChange={() => setFormData({...formData, tiempo: {...formData.tiempo, habitual: false}})}/> No</label>
                 </div>
               </div>
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>8.1. Desarrollando la tarea en el momento habitual ¿era posible el accidente?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tiempo.posibleAccidenteTiempoHabitual === true} onChange={() => setFormData({...formData, tiempo: {...formData.tiempo, posibleAccidenteTiempoHabitual: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.tiempo.posibleAccidenteTiempoHabitual === false} onChange={() => setFormData({...formData, tiempo: {...formData.tiempo, posibleAccidenteTiempoHabitual: false}})}/> No</label>
                 </div>
               </div>
               <div className="space-y-1 p-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase">8.2. ¿Por qué no la realizaba en el momento habitual?</label>
                 <input type="text" value={formData.tiempo.porQueOtroTiempo} onChange={e => setFormData({...formData, tiempo: {...formData.tiempo, porQueOtroTiempo: e.target.value}})} className="w-full bg-white p-3 rounded-xl border border-slate-200 text-sm font-medium" />
               </div>
             </div>

             <h3 className="text-sm font-black text-slate-900 uppercase italic border-b border-slate-100 pb-2 mt-8">EQUIPO DE TRABAJO</h3>
             <div className="space-y-4 text-sm font-medium text-slate-700">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>10. ¿Se utilizaban equipos de trabajo?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.equipo.utiliza === true} onChange={() => setFormData({...formData, equipo: {...formData.equipo, utiliza: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.equipo.utiliza === false} onChange={() => setFormData({...formData, equipo: {...formData.equipo, utiliza: false}})}/> No</label>
                 </div>
               </div>
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>10.1. ¿El equipo era el habitual?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.equipo.habitual === true} onChange={() => setFormData({...formData, equipo: {...formData.equipo, habitual: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.equipo.habitual === false} onChange={() => setFormData({...formData, equipo: {...formData.equipo, habitual: false}})}/> No</label>
                 </div>
               </div>
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>10.2. ¿Utilizando equipo habitual era posible el accidente?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.equipo.posibleAccidenteEquipoHabitual === true} onChange={() => setFormData({...formData, equipo: {...formData.equipo, posibleAccidenteEquipoHabitual: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.equipo.posibleAccidenteEquipoHabitual === false} onChange={() => setFormData({...formData, equipo: {...formData.equipo, posibleAccidenteEquipoHabitual: false}})}/> No</label>
                 </div>
               </div>
               <div className="space-y-1 p-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase">10.3. ¿Por qué no utilizaba equipo habitual?</label>
                 <input type="text" value={formData.equipo.porQueNoHabitual} onChange={e => setFormData({...formData, equipo: {...formData.equipo, porQueNoHabitual: e.target.value}})} className="w-full bg-white p-3 rounded-xl border border-slate-200 text-sm font-medium" />
               </div>
             </div>

             <h3 className="text-sm font-black text-slate-900 uppercase italic border-b border-slate-100 pb-2 mt-8">MATERIALES Y PRODUCTOS</h3>
             <div className="space-y-4 text-sm font-medium text-slate-700">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>12. ¿Involucrado algún material/sustancia?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.materiales.involucrado === true} onChange={() => setFormData({...formData, materiales: {...formData.materiales, involucrado: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.materiales.involucrado === false} onChange={() => setFormData({...formData, materiales: {...formData.materiales, involucrado: false}})}/> No</label>
                 </div>
               </div>
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                 <span>12.2. ¿Es habitual su utilización?</span>
                 <div className="flex gap-4 shrink-0">
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.materiales.habitual === true} onChange={() => setFormData({...formData, materiales: {...formData.materiales, habitual: true}})}/> Sí</label>
                   <label className="flex items-center gap-2"><input type="radio" checked={formData.materiales.habitual === false} onChange={() => setFormData({...formData, materiales: {...formData.materiales, habitual: false}})}/> No</label>
                 </div>
               </div>
               <div className="space-y-1 p-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase">12.3. ¿Por qué se utilizaba una no habitual?</label>
                 <input type="text" value={formData.materiales.porQueNoHabitual} onChange={e => setFormData({...formData, materiales: {...formData.materiales, porQueNoHabitual: e.target.value}})} className="w-full bg-white p-3 rounded-xl border border-slate-200 text-sm font-medium" />
               </div>
             </div>

             <h3 className="text-sm font-black text-slate-900 uppercase italic border-b border-slate-100 pb-2 mt-8">AMBIENTE DE TRABAJO</h3>
             <div className="space-y-2 text-sm font-medium text-slate-700">
               {formData.ambiente.factoresRi.map((f, i) => (
                 <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-slate-50 rounded-xl">
                   <span className="flex-1">{f.name}</span>
                   <div className="flex gap-6 shrink-0 text-xs">
                     <div className="flex flex-col gap-1 items-center">
                       <span className="text-[10px] font-bold text-slate-400">Accidente</span>
                       <div className="flex gap-2">
                         <label className="flex items-center gap-1"><input type="radio" checked={f.accidente === true} onChange={() => { const nf = [...formData.ambiente.factoresRi]; nf[i].accidente = true; setFormData({...formData, ambiente: {...formData.ambiente, factoresRi: nf}}) }}/> Sí</label>
                         <label className="flex items-center gap-1"><input type="radio" checked={f.accidente === false} onChange={() => { const nf = [...formData.ambiente.factoresRi]; nf[i].accidente = false; setFormData({...formData, ambiente: {...formData.ambiente, factoresRi: nf}}) }}/> No</label>
                       </div>
                     </div>
                     <div className="flex flex-col gap-1 items-center">
                       <span className="text-[10px] font-bold text-slate-400">Habitual</span>
                       <div className="flex gap-2">
                         <label className="flex items-center gap-1"><input type="radio" checked={f.habitual === true} onChange={() => { const nf = [...formData.ambiente.factoresRi]; nf[i].habitual = true; setFormData({...formData, ambiente: {...formData.ambiente, factoresRi: nf}}) }}/> Sí</label>
                         <label className="flex items-center gap-1"><input type="radio" checked={f.habitual === false} onChange={() => { const nf = [...formData.ambiente.factoresRi]; nf[i].habitual = false; setFormData({...formData, ambiente: {...formData.ambiente, factoresRi: nf}}) }}/> No</label>
                       </div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>

             <h3 className="text-sm font-black text-slate-900 uppercase italic border-b border-slate-100 pb-2 mt-8">FACTORES MÚSCULO ESQUELÉTICOS</h3>
             <div className="space-y-2 text-sm font-medium text-slate-700">
               {formData.musculoEsqueletico.factores.map((f, i) => (
                 <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-slate-50 rounded-xl">
                   <span className="flex-1">{f.name}</span>
                   <div className="flex gap-6 shrink-0 text-xs">
                     <div className="flex flex-col gap-1 items-center">
                       <span className="text-[10px] font-bold text-slate-400">Accidente</span>
                       <div className="flex gap-2">
                         <label className="flex items-center gap-1"><input type="radio" checked={f.accidente === true} onChange={() => { const nf = [...formData.musculoEsqueletico.factores]; nf[i].accidente = true; setFormData({...formData, musculoEsqueletico: {...formData.musculoEsqueletico, factores: nf}}) }}/> Sí</label>
                         <label className="flex items-center gap-1"><input type="radio" checked={f.accidente === false} onChange={() => { const nf = [...formData.musculoEsqueletico.factores]; nf[i].accidente = false; setFormData({...formData, musculoEsqueletico: {...formData.musculoEsqueletico, factores: nf}}) }}/> No</label>
                       </div>
                     </div>
                     <div className="flex flex-col gap-1 items-center">
                       <span className="text-[10px] font-bold text-slate-400">Habitual</span>
                       <div className="flex gap-2">
                         <label className="flex items-center gap-1"><input type="radio" checked={f.habitual === true} onChange={() => { const nf = [...formData.musculoEsqueletico.factores]; nf[i].habitual = true; setFormData({...formData, musculoEsqueletico: {...formData.musculoEsqueletico, factores: nf}}) }}/> Sí</label>
                         <label className="flex items-center gap-1"><input type="radio" checked={f.habitual === false} onChange={() => { const nf = [...formData.musculoEsqueletico.factores]; nf[i].habitual = false; setFormData({...formData, musculoEsqueletico: {...formData.musculoEsqueletico, factores: nf}}) }}/> No</label>
                       </div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>

             <h3 className="text-sm font-black text-slate-900 uppercase italic border-b border-slate-100 pb-2 mt-8">ORGANIZACIÓN DEL TRABAJO</h3>
             <div className="space-y-2 text-sm font-medium text-slate-700">
               {formData.organizacion.condiciones.map((f, i) => (
                 <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-slate-50 rounded-xl">
                   <span className="flex-1">{f.name}</span>
                   <div className="flex gap-6 shrink-0 text-xs">
                     <div className="flex flex-col gap-1 items-center">
                       <span className="text-[10px] font-bold text-slate-400">Accidente</span>
                       <div className="flex gap-2">
                         <label className="flex items-center gap-1"><input type="radio" checked={f.accidente === true} onChange={() => { const nf = [...formData.organizacion.condiciones]; nf[i].accidente = true; setFormData({...formData, organizacion: {...formData.organizacion, condiciones: nf}}) }}/> Sí</label>
                         <label className="flex items-center gap-1"><input type="radio" checked={f.accidente === false} onChange={() => { const nf = [...formData.organizacion.condiciones]; nf[i].accidente = false; setFormData({...formData, organizacion: {...formData.organizacion, condiciones: nf}}) }}/> No</label>
                       </div>
                     </div>
                     <div className="flex flex-col gap-1 items-center">
                       <span className="text-[10px] font-bold text-slate-400">Habitual</span>
                       <div className="flex gap-2">
                         <label className="flex items-center gap-1"><input type="radio" checked={f.habitual === true} onChange={() => { const nf = [...formData.organizacion.condiciones]; nf[i].habitual = true; setFormData({...formData, organizacion: {...formData.organizacion, condiciones: nf}}) }}/> Sí</label>
                         <label className="flex items-center gap-1"><input type="radio" checked={f.habitual === false} onChange={() => { const nf = [...formData.organizacion.condiciones]; nf[i].habitual = false; setFormData({...formData, organizacion: {...formData.organizacion, condiciones: nf}}) }}/> No</label>
                       </div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
          
          {/* Declarations Feature */}
          <div className="bg-orange-50 border-2 border-orange-200 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase italic">5. Declaraciones</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Registra hasta 5 declaraciones</p>
              </div>
              <button 
                onClick={() => {
                  if (formData.declarations.length >= 5) {
                    alert("Máximo 5 declaraciones permitidas.");
                    return;
                  }
                  setFormData({...formData, declarations: [...formData.declarations, {
                    id: Math.random().toString(),
                    type: "Accidentado",
                    name: "",
                    rut: "",
                    address: "",
                    position: "",
                    workCenter: "",
                    interviewer: "",
                    date: new Date().toISOString().split("T")[0],
                    statement: ""
                  }]})
                }}
                className="bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-orange-700 transition"
              >
                + Agregar
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.declarations.map((decl, idx) => (
                <div key={decl.id} className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm relative">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => {
                      const d = [...formData.declarations]; d.splice(idx, 1); setFormData({...formData, declarations: d});
                    }} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4 pr-8">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Tipo Peticionario</label>
                      <select value={decl.type} onChange={e => {const d=[...formData.declarations]; d[idx].type = e.target.value; setFormData({...formData, declarations: d})}} className="w-full bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                        <option>Jefe Directo</option>
                        <option>Accidentado</option>
                        <option>Testigo Presencial</option>
                        <option>Testigo a Oídas</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Nombre</label>
                      <input type="text" value={decl.name} onChange={e => {const d=[...formData.declarations]; d[idx].name = e.target.value; setFormData({...formData, declarations: d})}} className="w-full bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">RUT</label>
                      <input type="text" value={decl.rut} onChange={e => {const d=[...formData.declarations]; d[idx].rut = e.target.value; setFormData({...formData, declarations: d})}} className="w-full bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Cargo/Ocupación</label>
                      <input type="text" value={decl.position} onChange={e => {const d=[...formData.declarations]; d[idx].position = e.target.value; setFormData({...formData, declarations: d})}} className="w-full bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Declaración</label>
                    <textarea rows={3} value={decl.statement} onChange={e => {const d=[...formData.declarations]; d[idx].statement = e.target.value; setFormData({...formData, declarations: d})}} className="w-full bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs resize-none" placeholder="Escriba la declaración..." />
                  </div>
                </div>
              ))}
              
              {formData.declarations.length === 0 && (
                <div className="text-center py-10 bg-white/50 rounded-2xl border border-dashed border-orange-200">
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">No hay declaraciones agregadas.</p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      )}
      
      {/* Floating Action Button */}
      <AnimatePresence>
        {selectedWorker && selectedIncident && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none"
          >
            <div className="pointer-events-auto bg-slate-900 shadow-2xl shadow-slate-900/50 p-2 rounded-full border border-slate-800 flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-blue-500 transition-all flex items-center gap-3 disabled:opacity-50"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                Guardar y Exportar PDF
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
