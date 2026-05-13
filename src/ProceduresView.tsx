import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Search,
  X,
  Building2,
  Calendar,
  Save,
  Check,
  Edit3,
  AlertTriangle,
} from "lucide-react";
import {
  collection,
  query,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "./services/firebase";
import { fetchWithCache, clearAppCache } from "./services/firestore";
import { getPlanLimits } from "./utils/planLimits";
import { handleFirestoreError } from "./App";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { ClientSelector } from "./App";
import { generateProcedurePDF, generateGeneralProceduresPDF } from "./services/pdfService";
import { getReportHeader } from "./App";

export const ProceduresView = ({
  user,
  clients,
  selectedClientId,
  onClientSelect,
  userPlan,
  profile,
}: any) => {
  const [clientsList, setClientsList] = useState<any[]>(clients || []);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [procToEditId, setProcToEditId] = useState<string | null>(null);
  const [procToDelete, setProcToDelete] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    objetivo: "",
    alcance: "",
    definiciones: "",
    responsables: "",
    procedimiento: "",
    riesgos: "",
    epp: "",
    documentosRelacionados: "",
    revision: {
      fechaElaboracion: "",
      responsable: "",
      fechaModificacion: "",
      descripcionCambio: "",
    },
  });

  useEffect(() => {
    let isMounted = true;
    if (!profile?.corporateAdminId && !user?.uid) return;
    const fetchClients = async () => {
      const targetOwnerId = profile?.corporateAdminId || user?.uid;
      try {
        const fetchFn = async () => {
          const q = query(
            collection(db, "clients"),
            where("ownerId", "==", targetOwnerId),
          );
          const snap = await getDocs(q);
          return snap.docs.map((doc) => ({ id: doc.id, name: doc.data().name }));
        };
        const cList = await fetchWithCache(
          `dashboard_clients_list_${targetOwnerId}`,
          fetchFn,
        );
        if (isMounted) setClientsList(cList);
      } catch (err) {}
    };
    fetchClients();
    return () => { isMounted = false; };
  }, [user?.uid, profile?.corporateAdminId]);

  const selectedClient = clientsList.find((c: any) => c.id === selectedClientId);

  useEffect(() => {
    let isMounted = true;
    const fetchProcs = async () => {
      if (!selectedClientId) return;
      setLoading(true);
      try {
        const fetchFn = () => getDocs(
          query(
            collection(db, `clients/${selectedClientId}/procedures`),
            orderBy("createdAt", "desc")
          )
        );
        const snapshot = await fetchWithCache(
          `library_procedures_${selectedClientId}`,
          fetchFn
        );
        if (isMounted) {
          setProcedures(snapshot.docs.map((d: any) => ({ ...d.data(), id: d.id })));
        }
      } catch (err) {
        handleFirestoreError(err, "list", `clients/${selectedClientId}/procedures`);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProcs();
    return () => {
      isMounted = false;
    };
  }, [selectedClientId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    try {
      if (procToEditId) {
        const pRef = doc(db, `clients/${selectedClientId}/procedures`, procToEditId);
        await setDoc(pRef, {
          ...formData,
        }, { merge: true });
        
        setProcedures(procedures.map(p => p.id === procToEditId ? { ...p, ...formData } : p));
        alert("Procedimiento actualizado con éxito.");
      } else {
        const pRef = doc(collection(db, `clients/${selectedClientId}/procedures`));
        await setDoc(pRef, {
          id: pRef.id,
          ...formData,
          createdAt: serverTimestamp(),
        });
        setProcedures([{ id: pRef.id, ...formData, createdAt: new Date() }, ...procedures]);
        alert("Procedimiento guardado con éxito.");
      }
      
      clearAppCache(`library_procedures_${selectedClientId}`);
      setIsModalOpen(false);
      setProcToEditId(null);
      setFormData({
        title: "",
        objetivo: "",
        alcance: "",
        definiciones: "",
        responsables: "",
        procedimiento: "",
        riesgos: "",
        epp: "",
        documentosRelacionados: "",
        revision: {
          fechaElaboracion: "",
          responsable: "",
          fechaModificacion: "",
          descripcionCambio: "",
        },
      });
    } catch (err) {
      handleFirestoreError(err, procToEditId ? "update" : "create", `clients/${selectedClientId}/procedures`);
      alert("Error al guardar el procedimiento.");
    }
  };

  const confirmDelete = async () => {
    if (!selectedClientId || !procToDelete) return;
    try {
      await deleteDoc(doc(db, `clients/${selectedClientId}/procedures`, procToDelete.id));
      setProcedures(procedures.filter((p) => p.id !== procToDelete.id));
      clearAppCache(`library_procedures_${selectedClientId}`);
      setProcToDelete(null);
    } catch (err) {
      handleFirestoreError(err, "delete", `clients/${selectedClientId}/procedures`);
    }
  };

  const handleGenerateGeneralReport = async () => {
    if (!selectedClientId) return;
    
    if (procedures.length === 0) {
      alert("No hay procedimientos registrados para generar el informe.");
      return;
    }

    try {
      setLoading(true);
      const header = await getReportHeader(
        profile,
        user,
        selectedClient?.name || "Desconocido",
        "Informe General PTS",
        new Date().toLocaleDateString()
      );

      const reportRef = doc(
        collection(db, `clients/${selectedClientId}/reports`)
      );
      
      await setDoc(reportRef, {
        id: reportRef.id,
        clientId: selectedClientId,
        title: "Informe General PTS",
        type: "procedures_report",
        createdAt: serverTimestamp(),
        authorName: header.authorName,
        pdfName: `Informe_General_PTS_${selectedClient?.name?.replace(/\s+/g, "_") || "Empresa"}.pdf`,
        dataSnapshot: procedures,
        headerSnapshot: header,
      });

      clearAppCache(`library_reports_${selectedClientId}`);
      clearAppCache(`library_data_${selectedClientId}`);
      clearAppCache(`library_reports_all_${selectedClientId}`);

      generateGeneralProceduresPDF(procedures, header);
      
      alert("Informe general generado y guardado en el Archivo Técnico Digital.");
    } catch (err) {
      handleFirestoreError(err, "create", `clients/${selectedClientId}/reports`);
      alert("Error al generar el informe general.");
    } finally {
      setLoading(false);
    }
  };

  const filteredProcedures = procedures.filter((p) =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!selectedClientId) {
    return (
      <ClientSelector
        user={user}
        profile={profile}
        onSelect={onClientSelect}
        loading={false}
        subtitle="Selecciona una empresa para gestionar Procedimientos de Trabajo Seguro (PTS)."
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <FileText className="text-orange-500" size={28} />
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">
              Procedimientos
            </h2>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-1 ml-10">
            EMPRESA: <span className="text-slate-900">{selectedClient?.name || "NINGUNA"}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleGenerateGeneralReport}
            disabled={procedures.length === 0 || loading}
            className="bg-orange-500 text-white px-6 py-4 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-orange-600 transition-colors flex items-center justify-center gap-3 shadow-xl shadow-orange-500/20 disabled:opacity-50"
          >
            <FileText size={16} /> Informe General PTS
          </button>
          <button
            onClick={() => {
              if (userPlan && !userPlan.isTrialActive) {
                if (procedures.length >= getPlanLimits(userPlan).maxReports) {
                  alert("Límite de procedimientos alcanzado para tu plan actual. Actualiza tu plan para crear ilimitados.");
                  return;
                }
              }
              setIsModalOpen(true);
            }}
            disabled={userPlan && !userPlan.isTrialActive && (procedures.length >= getPlanLimits(userPlan).maxReports)}
            className="bg-slate-900 text-white px-6 py-4 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-800 transition-colors flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:bg-slate-400"
          >
            {userPlan && !userPlan.isTrialActive && (procedures.length >= getPlanLimits(userPlan).maxReports) ? (
               <>Bloqueado por Plan</>
            ) : (
               <><Plus size={16} /> Crear PTS</>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar procedimiento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-orange-500 transition-all uppercase"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProcedures.map((proc) => (
          <div
            key={proc.id}
            className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-orange-500 transition-all"
          >
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => {
                  setFormData({
                    title: proc.title || "",
                    objetivo: proc.objetivo || "",
                    alcance: proc.alcance || "",
                    definiciones: proc.definiciones || "",
                    responsables: proc.responsables || "",
                    procedimiento: proc.procedimiento || "",
                    riesgos: proc.riesgos || "",
                    epp: proc.epp || "",
                    documentosRelacionados: proc.documentosRelacionados || "",
                    revision: proc.revision || {
                      fechaElaboracion: "",
                      responsable: "",
                      fechaModificacion: "",
                      descripcionCambio: "",
                    },
                  });
                  setProcToEditId(proc.id);
                  setIsModalOpen(true);
                }}
                className="w-8 h-8 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
                title="Editar"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => {
                  const header = getReportHeader(
                    profile,
                    user,
                    selectedClient?.name || "Desconocido",
                    proc.title || "Procedimiento",
                    new Date().toLocaleDateString(),
                    userPlan
                  );
                  generateProcedurePDF(proc, header);
                }}
                className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors"
                title="Descargar PDF"
              >
                <Download size={14} />
              </button>
              <button
                onClick={() => setProcToDelete(proc)}
                className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500 mb-6">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase">
              {proc.title}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-2 line-clamp-3">
              {proc.objetivo}
            </p>
          </div>
        ))}
        {filteredProcedures.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">
            No hay procedimientos creados
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full h-full md:h-auto md:max-w-4xl bg-white md:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[100dvh] md:max-h-[90vh]">
            <div className="px-5 md:px-8 py-5 md:py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center md:rounded-t-[2.5rem]">
              <div className="flex items-center gap-3">
                <FileText className="text-orange-500" size={24} />
                <h3 className="text-xl font-black text-slate-900 uppercase italic">
                  {procToEditId ? "Editar Procedimiento (PTS)" : "Nuevo Procedimiento (PTS)"}
                </h3>
              </div>
              <button type="button" onClick={() => { setIsModalOpen(false); setProcToEditId(null); }} className="text-slate-400 hover:text-slate-900 bg-white shadow-sm p-2 rounded-full border border-slate-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 md:p-8 overflow-y-auto custom-scrollbar flex-1">
              <form id="ptsForm" onSubmit={handleSave} className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6 opacity-75 cursor-not-allowed">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Empresa Asignada</label>
                  <select
                    required
                    disabled
                    value={selectedClientId || ""}
                    onChange={(e) => onClientSelect(e.target.value)}
                    className="w-full bg-white p-4 rounded-xl border border-slate-200 outline-none focus:border-slate-500 text-slate-900 font-bold"
                  >
                    <option value="" disabled>SELECCIONAR EMPRESA...</option>
                    {clientsList.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedClientId && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Título del PTS</label>
                      <input
                        required
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none focus:border-red-500"
                        placeholder="ejemplo: PTS para Limpieza"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">1. Objetivo</label>
                      <textarea
                        required
                        value={formData.objetivo}
                        onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                        className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none focus:border-red-500 min-h-[100px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">2. AlcANCE</label>
                      <textarea
                        required
                        value={formData.alcance}
                        onChange={(e) => setFormData({ ...formData, alcance: e.target.value })}
                        className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none focus:border-red-500 min-h-[80px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">3. DEFINICIONES Y ABREVIACIONES</label>
                      <textarea
                        required
                        value={formData.definiciones}
                        onChange={(e) => setFormData({ ...formData, definiciones: e.target.value })}
                        className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none focus:border-red-500 min-h-[100px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">4. RESPONSABLES DE APLICAR Y CUMPLIR EL PTS</label>
                      <textarea
                        required
                        value={formData.responsables}
                        onChange={(e) => setFormData({ ...formData, responsables: e.target.value })}
                        className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none focus:border-red-500 min-h-[100px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">5. PROCEDIMIENTO</label>
                      <textarea
                        required
                        value={formData.procedimiento}
                        onChange={(e) => setFormData({ ...formData, procedimiento: e.target.value })}
                        className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none focus:border-red-500 min-h-[150px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">6. RIESGOS ASOCIADOS A LA ACTIVIDAD</label>
                      <textarea
                        required
                        value={formData.riesgos}
                        onChange={(e) => setFormData({ ...formData, riesgos: e.target.value })}
                        className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none focus:border-red-500 min-h-[100px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">7. ELEMENTOS DE PROTECCIÓN PERSONAL</label>
                      <textarea
                        required
                        value={formData.epp}
                        onChange={(e) => setFormData({ ...formData, epp: e.target.value })}
                        className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none focus:border-red-500 min-h-[100px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">8. DOCUMENTOS RELACIONADOS</label>
                      <textarea
                        value={formData.documentosRelacionados}
                        onChange={(e) => setFormData({ ...formData, documentosRelacionados: e.target.value })}
                        className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none focus:border-red-500 min-h-[80px]"
                        placeholder="Ej. Normativa aplicable, manuales del fabricante, etc."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">9. REVISIÓN Y CONTROL DE CAMBIOS</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fecha de Elaboración</label>
                          <input
                            type="date"
                            value={formData.revision.fechaElaboracion}
                            onChange={(e) => setFormData({ ...formData, revision: { ...formData.revision, fechaElaboracion: e.target.value } })}
                            className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none focus:border-red-500 text-sm font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Responsable</label>
                          <input
                            type="text"
                            value={formData.revision.responsable}
                            onChange={(e) => setFormData({ ...formData, revision: { ...formData.revision, responsable: e.target.value } })}
                            className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none focus:border-red-500 text-sm font-medium"
                            placeholder="Nombre del responsable de la revisión"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fecha de Modificación</label>
                          <input
                            type="date"
                            value={formData.revision.fechaModificacion}
                            onChange={(e) => setFormData({ ...formData, revision: { ...formData.revision, fechaModificacion: e.target.value } })}
                            className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none focus:border-red-500 text-sm font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Descripción del Cambio</label>
                          <input
                            type="text"
                            value={formData.revision.descripcionCambio}
                            onChange={(e) => setFormData({ ...formData, revision: { ...formData.revision, descripcionCambio: e.target.value } })}
                            className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none focus:border-red-500 text-sm font-medium"
                            placeholder="Ej. Actualización de EPP requeridos"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
            <div className="p-5 md:p-6 border-t border-slate-100 bg-slate-50 md:rounded-b-[2.5rem] flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-4">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setProcToEditId(null); }}
                className="w-full md:w-auto bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="ptsForm"
                disabled={!selectedClientId}
                className="w-full md:w-auto bg-green-500 text-white px-8 py-4 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-green-600 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {procToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setProcToDelete(null)} />
          <div className="relative bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic mb-2">¿Eliminar Procedimiento?</h3>
            <p className="text-slate-500 mb-8 font-medium">Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar este PTS?</p>
            <div className="flex gap-4">
              <button
                onClick={() => setProcToDelete(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
