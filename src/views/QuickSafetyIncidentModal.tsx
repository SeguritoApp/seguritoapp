import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { doc, setDoc, collection, serverTimestamp, getDocs, query, where, increment, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { fetchPredictiveWorkers } from "../lib/workerSearch";
import { getReportHeader } from "../App";
import { generateSafetyIncidentPDF } from "../services/pdfService";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Plus, Search, X } from "lucide-react";
import { Client, UserProfile, cleanForFirestore, handleFirestoreError } from "../App";

// For now we'll put the inline cleanForFirestore to avoid import issues
const cleanForFS = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(cleanForFS);
  if (obj instanceof Date) return obj;
  if (obj.toDate && typeof obj.toDate === "function") return obj;
  if (obj.isEqual && typeof obj.isEqual === "function") return obj; 
  const cleaned: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = cleanForFS(val);
    }
  }
  return cleaned;
};

export const QuickSafetyIncidentModal = ({
  user,
  profile,
  userPlan,
  initialClientId,
  isOpen,
  onClose,
  updateClientStats
}: {
  user: User | null;
  profile: UserProfile | null;
  userPlan?: any;
  initialClientId?: string;
  isOpen: boolean;
  onClose: () => void;
  updateClientStats?: (clientId: string, updates: any) => Promise<void>;
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [localClients, setLocalClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);

  // Searches
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorkerName, setSelectedWorkerName] = useState<string>("");

  const [incidentData, setIncidentData] = useState({
    date: new Date().toISOString().split("T")[0],
    workCenter: "",
    location: "",
    observedHazard: "",
    cost: "",
    classification: "Seguridad",
    riskPotential: "Medio",
    correctiveActions: "",
    controlMeasures: ""
  });

  useEffect(() => {
    if (isOpen) {
      if (user?.uid) {
        const fetchClients = async () => {
          const snap = await getDocs(query(collection(db, "clients"), where("ownerId", "==", profile?.corporateAdminId || user?.uid)));
          setLocalClients(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client)));
        };
        fetchClients();
      }
      setSelectedClientId(initialClientId || "");
    }
  }, [isOpen, initialClientId, user?.uid, profile?.corporateAdminId]);

  useEffect(() => {
    let isMounted = true;
    const doSearch = async () => {
      if (searchQuery.length < 3 || !selectedClientId) {
        if (isMounted) setWorkers([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await fetchPredictiveWorkers(selectedClientId, searchQuery, 5);
        if (isMounted) setWorkers(results);
      } catch (error) {
        console.error("Search error", error);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(doSearch, 300);
    return () => {

      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [searchQuery, selectedClientId]);

  const selectedClientData = localClients.find(c => c.id === selectedClientId);

  const handleSave = async () => {
    if (!selectedClientId) return alert("Seleccione una empresa.");
    if (!selectedWorkerName && !searchQuery) return alert("Seleccione o ingrese un nombre de trabajador/contratista.");
    if (!incidentData.date) return alert("Ingrese fecha.");
    if (!incidentData.location || !incidentData.observedHazard) return alert("Lugar y Peligro son obligatorios.");

    setSaving(true);
    try {
      const finalWorkerName = selectedWorkerName || searchQuery;

      const incidentPayload = {
        id: Math.random().toString(36).substr(2, 9),
        date: incidentData.date,
        workCenter: incidentData.workCenter,
        workerName: finalWorkerName,
        location: incidentData.location,
        observedHazard: incidentData.observedHazard,
        cost: incidentData.cost ? parseFloat(incidentData.cost) : 0,
        classification: incidentData.classification,
        riskPotential: incidentData.riskPotential,
        correctiveActions: incidentData.correctiveActions,
        controlMeasures: incidentData.controlMeasures
      };

      const selectedClient = localClients.find(c => c.id === selectedClientId);
      const reportHeader = getReportHeader(
        profile,
        user,
        selectedClient?.name || "Cliente",
        "REPORTE DE INCIDENTE",
        new Date(incidentPayload.date).toLocaleDateString(),
        userPlan
      );

      const reportRef = doc(collection(db, `clients/${selectedClientId}/reports`));
      
      const payloadClean = cleanForFS({
        ...incidentPayload,
        clientId: selectedClientId,
      });

      await setDoc(reportRef, cleanForFS({
        id: reportRef.id,
        clientId: selectedClientId,
        title: `Incidente: ${incidentPayload.classification} - ${finalWorkerName}`,
        type: "incident",
        createdAt: serverTimestamp(),
        authorName: reportHeader.authorName,
        pdfName: `Incidente_${new Date().getTime()}.pdf`,
        dataSnapshot: payloadClean,
        headerSnapshot: reportHeader
      }));

      // Update basic client stats if function provided
      if (updateClientStats) {
        await updateClientStats(selectedClientId, {
          "metadata.incidentCount": increment(1)
        });
      } else {
        // Fallback update
        const clientRef = doc(db, "clients", selectedClientId);
        await updateDoc(clientRef, { "metadata.incidentCount": increment(1) });
      }

      generateSafetyIncidentPDF(payloadClean, reportHeader);

      alert("Incidente registrado con éxito.");
      onClose();
    } catch (e) {
      console.error(e);
      alert("Hubo un error guardando el incidente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
          >
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic leading-none">
                    Nuevo Incidente
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Registra un incidente general
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto w-full custom-scrollbar flex-1 bg-white">
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Empresa Cliente
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700"
                    >
                      <option value="">Seleccione Cliente</option>
                      {localClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Centro de Trabajo
                    </label>
                    <input
                      type="text"
                      value={incidentData.workCenter}
                      onChange={(e) => setIncidentData({ ...incidentData, workCenter: e.target.value })}
                      placeholder="Ej. Faena Norte"
                      list="workcenter-options"
                      className="w-full bg-slate-50 border border-slate-200 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700"
                    />
                    <datalist id="workcenter-options">
                      {(Array.isArray(selectedClientData?.workCenters) ? selectedClientData.workCenters : []).map((wc: any, idx: number) => (
                        <option key={wc?.id || idx} value={wc?.name || (typeof wc === 'string' ? wc : '')} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Trabajador / Contratista Externo
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 text-sm font-bold pl-12 pr-4 py-3 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700"
                      placeholder="Buscar trabajador o escribir nombre nuevo"
                      value={selectedWorkerName || searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelectedWorkerName("");
                      }}
                    />
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                  </div>

                  {workers.length > 0 && !selectedWorkerName && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {workers.map((w) => (
                        <button
                          key={w.id}
                          onClick={() => {
                            setSelectedWorkerName(`${w.firstName} ${w.paternalLastName}`);
                            setSearchQuery("");
                            setWorkers([]);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        >
                          <div className="text-sm font-bold text-slate-900">
                            {w.firstName} {w.paternalLastName}
                          </div>
                          <div className="text-xs text-slate-500">{w.rut}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Fecha del Incidente
                    </label>
                    <input
                      type="date"
                      value={incidentData.date}
                      onChange={(e) => setIncidentData({ ...incidentData, date: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Lugar Exacto
                    </label>
                    <input
                      type="text"
                      value={incidentData.location}
                      onChange={(e) => setIncidentData({ ...incidentData, location: e.target.value })}
                      placeholder="Ej. Taller B"
                      className="w-full bg-slate-50 border border-slate-200 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Peligro Observado
                  </label>
                  <input
                    type="text"
                    value={incidentData.observedHazard}
                    onChange={(e) => setIncidentData({ ...incidentData, observedHazard: e.target.value })}
                    placeholder="Ej. Piso mojado sin señalizar"
                    className="w-full bg-slate-50 border border-slate-200 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-transparent">
                      Costo (Opcional)
                    </label>
                    <input
                      type="number"
                      value={incidentData.cost}
                      onChange={(e) => setIncidentData({ ...incidentData, cost: e.target.value })}
                      placeholder="$ 0"
                      className="w-full bg-slate-50 border border-slate-200 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Clasificación
                    </label>
                    <select
                      value={incidentData.classification}
                      onChange={(e) => setIncidentData({ ...incidentData, classification: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:border-blue-500 transition-all text-slate-700"
                    >
                      <option value="Seguridad">Seguridad</option>
                      <option value="Salud">Salud</option>
                      <option value="Medioambiente">Medioambiente</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Potencialidad
                    </label>
                    <select
                      value={incidentData.riskPotential}
                      onChange={(e) => setIncidentData({ ...incidentData, riskPotential: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:border-blue-500 transition-all text-slate-700"
                    >
                      <option value="Bajo">Bajo</option>
                      <option value="Medio">Medio</option>
                      <option value="Alto">Alto</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Acciones Correctivas Dadas
                  </label>
                  <textarea
                    value={incidentData.correctiveActions}
                    onChange={(e) => setIncidentData({ ...incidentData, correctiveActions: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-sm font-medium px-4 py-3 rounded-xl outline-none min-h-[80px]"
                    placeholder="Acciones tomadas en el momento..."
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Medidas de Control a Implementar
                  </label>
                  <textarea
                    value={incidentData.controlMeasures}
                    onChange={(e) => setIncidentData({ ...incidentData, controlMeasures: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-sm font-medium px-4 py-3 rounded-xl outline-none min-h-[80px]"
                    placeholder="Prevención futura..."
                  />
                </div>

              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {saving ? "Generando..." : "Guardar & Descargar"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
