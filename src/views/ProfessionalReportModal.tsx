import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  FileText,
  Calendar,
  PenTool,
  Download,
  AlertTriangle,
  Plus,
  Trash2,
} from "lucide-react";
import { generateProfessionalReportPDF } from "../services/pdfService";
import { Client, UserProfile } from "../App";
import { db } from "../services/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { User } from "firebase/auth";

interface ProfessionalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  profile: UserProfile | null;
}

export const ProfessionalReportModal: React.FC<ProfessionalReportModalProps> = ({
  isOpen,
  onClose,
  user,
  profile,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedWorkCenterId, setSelectedWorkCenterId] = useState<string>("");
  const [period, setPeriod] = useState("Mensual");
  const [findingsComments, setFindingsComments] = useState<string[]>([""]);
  const [correctiveMeasuresComments, setCorrectiveMeasuresComments] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [localClients, setLocalClients] = useState<{id: string, name: string, workCenters?: any[]}[]>([]);

  // Stats to calculate
  const [stats, setStats] = useState({
    workers: 0,
    visits: 0,
    objectivesAchieved: 0,
    procedures: 0,
    accidents: 0,
  });

  useEffect(() => {
    if (!isOpen) return;

    const fetchClients = async () => {
      const targetOwnerId = profile?.corporateAdminId || user?.uid;
      if (!targetOwnerId) return;
      const q = query(collection(db, "clients"), where("ownerId", "==", targetOwnerId));
      const snap = await getDocs(q);
      const fetchedClients = snap.docs.map(d => ({
         id: d.id,
         name: d.data().name,
         workCenters: d.data().workCenters || []
      })).sort((a, b) => a.name.localeCompare(b.name));
      setLocalClients(fetchedClients);
    };

    fetchClients();
  }, [isOpen, user, profile]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!selectedClientId) {
        setStats({ workers: 0, Visits: 0, objectivesAchieved: 0, procedures: 0, accidents: 0 } as any);
        return;
      }
      try {
        const fetchCollectionCount = async (colName: string) => {
          const q = query(
            collection(db, "clients", selectedClientId, colName)
          );
          const snap = await getDocs(q);
          return snap.size;
        };

        const [workersCount, proceduresCount, accidentsCount] = await Promise.all([
          fetchCollectionCount("workers"),
          fetchCollectionCount("procedures"),
          fetchCollectionCount("accidents")
        ]);

        const clientDoc = await getDocs(query(collection(db, "clients"), where("__name__", "==", selectedClientId)));
        let ganttCount = 0;
        if (!clientDoc.empty) {
            const data = clientDoc.docs[0].data();
            ganttCount = (data.ganttTasks || []).filter((t: any) => t.status === "completed").length;
        }

        setStats({
          workers: workersCount,
          visits: 0,
          objectivesAchieved: ganttCount,
          procedures: proceduresCount,
          accidents: accidentsCount,
        });

      } catch (error) {
         console.error("Error fetching stats:", error)
      }
    };
    if (isOpen) {
      // resetting
      setPeriod("Mensual");
      setFindingsComments([""]);
      setCorrectiveMeasuresComments([""]);
      fetchStats();
    }
  }, [selectedClientId, isOpen]);

  const handleGenerate = async () => {
    if (!selectedClientId) return alert("Seleccione un cliente");
    const clientFile = localClients.find((c) => c.id === selectedClientId);
    const clientName = clientFile?.name || "Cliente";
    
    // Attempt to match ID or exact name
    const wcMatch = clientFile?.workCenters?.find((wc: any) => wc.id === selectedWorkCenterId || wc.name === selectedWorkCenterId);
    const workCenterName = wcMatch ? wcMatch.name : selectedWorkCenterId; // fallback to typed text

    setLoading(true);
    try {
      const reportData = {
        clientName,
        period,
        findingsComments: findingsComments.filter(c => c.trim().length > 0),
        correctiveMeasuresComments: correctiveMeasuresComments.filter(c => c.trim().length > 0),
        stats,
        professionalName: profile?.displayName || user?.displayName || user?.email || "Profesional"
      };

      const header = {
        title: "Informe general de Prevención",
        clientName: clientName,
        workCenter: workCenterName,
        authorName: profile?.displayName || user?.displayName || user?.email || "Profesional",
        license: profile?.professionalLicense || "N/A",
        signatureURL: profile?.signatureURL,
        date: new Date().toLocaleDateString("es-CL")
      };

      generateProfessionalReportPDF(reportData, header as any);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al generar el reporte");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden flex flex-col"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
        >
          <div className="bg-slate-900 border-b border-slate-800 p-6 flex justify-between items-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <FileText size={100} />
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Reporte Profesional
                </h2>
                <p className="text-[10px] text-blue-200 uppercase tracking-widest font-black">
                  Informe General de Prevención
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[70vh]">
            <div className="space-y-6">
              <div className="space-y-1.5 focus-within:z-10 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Cliente a Reportar
                </label>
                <select
                   value={selectedClientId}
                   onChange={(e) => {
                     setSelectedClientId(e.target.value);
                     setSelectedWorkCenterId("");
                   }}
                   className="w-full bg-slate-50 border border-slate-200 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:border-blue-500 transition-all text-slate-700"
                >
                   <option value="">Seleccione Cliente...</option>
                   {localClients.map(c => (
                       <option key={c.id} value={c.id}>{c.name}</option>
                   ))}
                </select>
              </div>

              {selectedClientId && (
                <div className="space-y-1.5 focus-within:z-10 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Centro de Trabajo (Opcional)
                  </label>
                  <input
                    type="text"
                    list="wc-options"
                    value={selectedWorkCenterId}
                    onChange={(e) => setSelectedWorkCenterId(e.target.value)}
                    placeholder="Ej: Casa Matriz, Faena..."
                    className="w-full bg-slate-50 border border-slate-200 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:border-blue-500 transition-all text-slate-700"
                  />
                  <datalist id="wc-options">
                    {localClients.find(c => c.id === selectedClientId)?.workCenters?.map((wc: any, idx: number) => (
                      <option key={`${wc.id || wc.name}-${idx}`} value={wc.name} />
                    ))}
                  </datalist>
                </div>
              )}

               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Período del Reporte
                  </label>
                  <select
                     value={period}
                     onChange={(e) => setPeriod(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:border-blue-500 transition-all text-slate-700"
                  >
                     <option value="Semanal">Semanal</option>
                     <option value="Mensual">Mensual</option>
                     <option value="Semestral">Semestral</option>
                     <option value="Anual">Anual</option>
                  </select>
              </div>

               <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-4">
                 <div className="text-blue-500">
                    <Calendar size={20} />
                 </div>
                 <div>
                    <h3 className="text-xs font-bold text-blue-900 uppercase tracking-tight">Estadísticas Detectadas</h3>
                    <p className="text-[10px] text-blue-700">Se pre-cargarán en el reporte las gestiones y datos registrados en la plataforma: Trabajadores ({stats.workers}), Objetivos Gantt ({stats.objectivesAchieved}), Procedimientos ({stats.procedures}), Incidentes ({stats.accidents}).</p>
                 </div>
               </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Hallazgos / Observaciones (Opcional)
                  </label>
                  <button
                    onClick={() => setFindingsComments([...findingsComments, ""])}
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors"
                  >
                    <Plus size={12} /> Agregar Hallazgo
                  </button>
                </div>
                {findingsComments.map((comment, idx) => (
                  <div key={idx} className="relative group">
                    <textarea
                      value={comment}
                      onChange={(e) => {
                        const newComments = [...findingsComments];
                        newComments[idx] = e.target.value;
                        setFindingsComments(newComments);
                      }}
                      placeholder="Ej: Se observa una disminución del 15% en la accidentabilidad respecto al semestre anterior..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 text-sm font-medium p-4 pr-10 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none text-slate-700"
                    />
                    {findingsComments.length > 1 && (
                      <button
                        onClick={() => {
                          const newComments = findingsComments.filter((_, i) => i !== idx);
                          setFindingsComments(newComments);
                        }}
                        className="absolute right-3 top-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Medidas Correctivas (Opcional)
                  </label>
                  <button
                    onClick={() => setCorrectiveMeasuresComments([...correctiveMeasuresComments, ""])}
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors"
                  >
                    <Plus size={12} /> Agregar Medida
                  </button>
                </div>
                {correctiveMeasuresComments.map((comment, idx) => (
                  <div key={idx} className="relative group">
                    <textarea
                      value={comment}
                      onChange={(e) => {
                        const newComments = [...correctiveMeasuresComments];
                        newComments[idx] = e.target.value;
                        setCorrectiveMeasuresComments(newComments);
                      }}
                      placeholder="Ej: Se requiere programar revisiones adicionales en tableros eléctricos..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 text-sm font-medium p-4 pr-10 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none text-slate-700"
                    />
                    {correctiveMeasuresComments.length > 1 && (
                      <button
                        onClick={() => {
                          const newComments = correctiveMeasuresComments.filter((_, i) => i !== idx);
                          setCorrectiveMeasuresComments(newComments);
                        }}
                        className="absolute right-3 top-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

            </div>
          </div>

          <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl shrink-0">
             <button
              onClick={onClose}
              className="text-xs font-bold text-slate-500 px-6 py-2.5 rounded-xl hover:bg-slate-200 hover:text-slate-700 transition-colors uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
               disabled={!selectedClientId || loading}
               onClick={handleGenerate}
               className="bg-blue-600 outline-none text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 flex items-center gap-2 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                 <span className="animate-pulse">Generando...</span>
              ) : (
                <>
                   <Download size={16} /> Descargar Reporte
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
