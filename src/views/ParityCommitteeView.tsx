import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  query,
  onSnapshot,
  getDocs,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  fetchWithCache
} from "../services/firestore";
import { db } from "../services/firebase";
import {
  ArrowLeft,
  Users,
  CalendarDays,
  History,
  Kanban,
  Plus,
  Trash2,
  Edit2,
  FileDown,
  Check,
  X,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateParityCommitteePDF, generateParityCommitteeSessionPDF, generateGanttPDF } from "../services/pdfService";

export interface CommitteeMember {
  id: string;
  name: string;
  role: string;
  rut?: string;
  email?: string;
}

export interface CommitteeSession {
  id: string;
  date: string;
  topic: string;
  agreements: string;
  attendees: string[]; // member names
}

export interface CommitteeRecord {
  id: string;
  date: string;
  type: string;
  description: string;
  status: string;
  snapshot?: string;
}

export interface GanttTask {
  id: string;
  text: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface CommitteeTerm {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  members: CommitteeMember[];
}

export interface ParityCommittee {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  members: CommitteeMember[]; // Legacy active members
  terms?: CommitteeTerm[];
  sessions: CommitteeSession[];
  history: CommitteeRecord[];
  ganttTasks: GanttTask[];
  createdAt: any;
  updatedAt: any;
}

const cleanForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(cleanForFirestore);
  
  if (obj instanceof Date) return obj;
  if (obj.toDate && typeof obj.toDate === "function") return obj;
  if (obj.isEqual && typeof obj.isEqual === "function") return obj;
  
  const cleaned: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = cleanForFirestore(val);
    }
  }
  return cleaned;
};

// Error Handler compatible with rules
const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
  console.error("Firestore Error:", error, operationType, path);
};

export const ParityCommitteeView = ({
  onBack,
  selectedClientId,
  user,
  profile,
  clientData
}: {
  onBack: () => void;
  selectedClientId: string;
  user: any;
  profile: any;
  clientData: any;
}) => {
  const [committees, setCommittees] = useState<ParityCommittee[]>([]);
  const [activeCommitteeId, setActiveCommitteeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"members" | "sessions" | "history" | "gantt">("members");

  useEffect(() => {
    if (!selectedClientId) return;

    let isMounted = true;
    const fetchCommittees = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, `clients/${selectedClientId}/parity_committees`),
          orderBy("createdAt", "desc")
        );
        const snapshot = await fetchWithCache(
          `parity_committees_${selectedClientId}`,
          () => getDocs(q)
        );
        if (isMounted) {
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ParityCommittee));
          setCommittees(data);
          if (data.length === 0) {
            setActiveCommitteeId(null);
          }
        }
      } catch (e) {
        handleFirestoreError(e, "list", "parity_committees");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchCommittees();

    return () => { isMounted = false; };
  }, [selectedClientId]);

  const activeCommittee = committees.find(c => c.id === activeCommitteeId);

  const [isEditingCommittee, setIsEditingCommittee] = useState<{ id?: string, name: string, startDate?: string, endDate?: string } | null>(null);

  const saveCommittee = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isEditingCommittee || !isEditingCommittee.name.trim()) return;

    try {
      if (isEditingCommittee.id) {
         // Update
         await updateDoc(doc(db, `clients/${selectedClientId}/parity_committees/${isEditingCommittee.id}`), {
           name: isEditingCommittee.name,
           startDate: isEditingCommittee.startDate || null,
           endDate: isEditingCommittee.endDate || null,
           updatedAt: serverTimestamp()
         });
      } else {
         // Create
         const newCommittee = {
           name: isEditingCommittee.name,
           startDate: isEditingCommittee.startDate || null,
           endDate: isEditingCommittee.endDate || null,
           members: [],
           sessions: [],
           history: [],
           ganttTasks: [],
           createdAt: serverTimestamp(),
           updatedAt: serverTimestamp()
         };
         const docRef = await addDoc(
           collection(db, `clients/${selectedClientId}/parity_committees`), 
           cleanForFirestore(newCommittee)
         );
         setActiveCommitteeId(docRef.id);
      }
      setIsEditingCommittee(null);
    } catch (error) {
      handleFirestoreError(error, isEditingCommittee.id ? "update" : "create", "parity_committees");
      alert("Error al guardar comité");
    }
  };

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    id: string;
    type: "committee" | "member" | "session" | "record" | "task";
    title: string;
  } | null>(null);

  const executeDelete = async () => {
    if (!deleteConfirmation) return;
    const { id, type } = deleteConfirmation;
    setDeleteConfirmation(null);

    try {
      if (type === "committee") {
        await deleteDoc(doc(db, `clients/${selectedClientId}/parity_committees/${id}`));
        if (activeCommitteeId === id) setActiveCommitteeId(null);
      } else if (type === "member") {
        const newMembers = currentMembers.filter(m => m.id !== id);
        if (activeTermId === "current") {
          updateCommitteeField("members", newMembers);
        } else {
          const newTerms = (activeCommittee?.terms || []).map(t => 
            t.id === activeTermId ? { ...t, members: newMembers } : t
          );
          updateCommitteeField("terms", newTerms);
        }
      } else if (type === "session") {
        updateCommitteeField("sessions", (activeCommittee?.sessions||[]).filter(x => x.id !== id));
      } else if (type === "record") {
        updateCommitteeField("history", (activeCommittee?.history||[]).filter(x => x.id !== id));
      } else if (type === "task") {
        updateCommitteeField("ganttTasks", (activeCommittee?.ganttTasks||[]).filter(x => x.id !== id));
      }
    } catch (error) {
       handleFirestoreError(error, "delete", "parity_committees");
       alert(`Error al eliminar ${type}`);
    }
  };

  const deleteCommittee = (id: string) => {
    setDeleteConfirmation({ id, type: "committee", title: "este comité y toda su información" });
  };


  // TERMS / PERIODS MANAGE
  const [activeTermId, setActiveTermId] = useState<string>("current");
  const [isCreatingTerm, setIsCreatingTerm] = useState(false);
  
  const currentMembers = activeTermId === "current" 
    ? (activeCommittee?.members || []) 
    : (activeCommittee?.terms?.find(t => t.id === activeTermId)?.members || []);

  const createTerm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeCommittee) return;
    const fd = new FormData(e.currentTarget);
    const newTerm: CommitteeTerm = {
      id: Math.random().toString(36).substr(2, 9),
      name: fd.get("name") as string,
      startDate: fd.get("startDate") as string,
      endDate: fd.get("endDate") as string,
      members: [] // inherit from current? Let's start empty for a clean term
    };
    
    // Auto-inherit active members if requested
    if (fd.get("inheritMembers") === "on") {
      newTerm.members = [...(activeCommittee.members || [])].map(m => ({...m, id: Math.random().toString(36).substr(2, 9)})); // Deep copy with new IDs
    }

    const newTerms = [...(activeCommittee.terms || []), newTerm];
    updateCommitteeField("terms", newTerms);
    setIsCreatingTerm(false);
    setActiveTermId(newTerm.id);
  };

  const exportPDF = () => {
    if (!activeCommittee) return;
    try {
      // Create a cloned committee for the PDF based on the selected term
      const committeeForPdf = { ...activeCommittee };
      if (activeTermId !== "current") {
         const term = activeCommittee.terms?.find(t => t.id === activeTermId);
         if (term) {
           committeeForPdf.members = term.members || [];
           committeeForPdf.name = `${activeCommittee.name} (${term.name})`;
         }
      }

      generateParityCommitteePDF(committeeForPdf, {
        title: "INFORME COMITÉ PARITARIO",
        clientName: clientData?.name || "Cliente",
        clientRut: clientData?.rut || "",
        clientAddress: clientData?.address || "",
        authorName: profile?.displayName || "Asesor",
        license: profile?.license || "N/A",
        date: new Date().toLocaleDateString()
      });

      // Save to history
      const newRecord: CommitteeRecord = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        type: "Informe PDF",
        description: `Informe Comité Paritario - ${activeTermId === "current" ? "Periodo Base" : activeCommittee.terms?.find(t => t.id === activeTermId)?.name || ""}`,
        status: "Generado",
        snapshot: JSON.stringify({...committeeForPdf, history: []})
      };
      updateCommitteeField("history", [newRecord, ...(activeCommittee.history || [])]);

    } catch(err) {
      console.error(err);
      alert("Error generando el PDF");
    }
  };

  const exportArchivedPDF = (record: CommitteeRecord) => {
    try {
      let committeeForPdf = activeCommittee;
      if (record.snapshot) {
        committeeForPdf = JSON.parse(record.snapshot);
      }
      
      const isSession = record.type.includes("Acta") || record.type.includes("Reunión");
      const isGantt = record.type.includes("Gantt");
      
      if (isSession && committeeForPdf.sessions) {
         // It's a session PDF
         const session = committeeForPdf.sessions[0]; // the snapshot should only have this session to be safe, or we use the snapshot as the session itself if we store the session in the snapshot
         generateParityCommitteeSessionPDF(committeeForPdf as any, session, {
           title: "ACTA DE SESIÓN COMITÉ PARITARIO",
           clientName: clientData?.name || "Cliente",
           clientRut: clientData?.rut || "",
           clientAddress: clientData?.address || "",
           authorName: profile?.displayName || "Asesor",
           license: profile?.license || "N/A",
           date: new Date(record.date).toLocaleDateString()
         });
      } else if (isGantt) {
         const formattedTasks = (committeeForPdf.ganttTasks || []).map((t: any) => ({
           ...t,
           title: t.text
         }));
         generateGanttPDF(formattedTasks, {
           title: `CARTA GANTT DE PREVENCIÓN - COMITÉ ${committeeForPdf.name}`,
           clientName: clientData?.name || "Cliente",
           clientRut: clientData?.rut || "",
           clientAddress: clientData?.address || "",
           authorName: profile?.displayName || "Asesor",
           license: profile?.license || "N/A",
           date: new Date(record.date).toLocaleDateString()
         }, timeScale as "months" | "quarters" | "semesters" | "year");
      } else {
         generateParityCommitteePDF(committeeForPdf as any, {
           title: "INFORME COMITÉ PARITARIO",
           clientName: clientData?.name || "Cliente",
           clientRut: clientData?.rut || "",
           clientAddress: clientData?.address || "",
           authorName: profile?.displayName || "Asesor",
           license: profile?.license || "N/A",
           date: new Date(record.date).toLocaleDateString()
         });
      }
    } catch(err) {
      console.error(err);
      alert("Error exportando el PDF archivado");
    }
  };

  const exportSessionPDF = (session: CommitteeSession) => {
    if (!activeCommittee) return;
    try {
      generateParityCommitteeSessionPDF(activeCommittee as any, session, {
        title: "ACTA DE SESIÓN COMITÉ PARITARIO",
        clientName: clientData?.name || "Cliente",
        clientRut: clientData?.rut || "",
        clientAddress: clientData?.address || "",
        authorName: profile?.displayName || "Asesor",
        license: profile?.license || "N/A",
        date: new Date(session.date).toLocaleDateString()
      });

      // Save to history automatically
      const newRecord: CommitteeRecord = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        type: "Acta de Sesión",
        description: session.topic || "Reunión de Comité Paritario",
        status: "Generado",
        snapshot: JSON.stringify({...activeCommittee, sessions: [session], history: []})
      };
      updateCommitteeField("history", [newRecord, ...(activeCommittee.history || [])]);
    } catch(err) {
      console.error(err);
      alert("Error generando el PDF");
    }
  };

  const exportGanttPDF = () => {
    if (!activeCommittee) return;
    try {
      const formattedTasks = (activeCommittee.ganttTasks || []).map(t => ({
        ...t,
        title: t.text
      }));
      generateGanttPDF(formattedTasks, {
        title: `CARTA GANTT DE PREVENCIÓN - COMITÉ ${activeCommittee.name}`,
        clientName: clientData?.name || "Cliente",
        clientRut: clientData?.rut || "",
        clientAddress: clientData?.address || "",
        authorName: profile?.displayName || "Asesor",
        license: profile?.license || "N/A",
        date: new Date().toLocaleDateString()
      }, timeScale as "months" | "quarters" | "semesters" | "year");
      
      const newRecord: CommitteeRecord = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        type: "Carta Gantt PDF",
        description: `Exportación de Carta Gantt del Comité`,
        status: "Generado",
        snapshot: JSON.stringify({...activeCommittee, history: []})
      };
      updateCommitteeField("history", [newRecord, ...(activeCommittee.history || [])]);
    } catch(err) {
      console.error(err);
      alert("Error exportando Carta Gantt");
    }
  };

  const updateCommitteeField = async (field: keyof ParityCommittee, value: any) => {
    if (!activeCommitteeId) return;
    try {
      await updateDoc(doc(db, `clients/${selectedClientId}/parity_committees/${activeCommitteeId}`), {
        [field]: cleanForFirestore(value),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
       handleFirestoreError(error, "update", "parity_committees");
       alert("Error al actualizar información");
    }
  };

  // MEMBERS MANAGE
  const [editingMember, setEditingMember] = useState<CommitteeMember | null>(null);
  const saveMember = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeCommittee) return;
    const fd = new FormData(e.currentTarget);
    const m: CommitteeMember = {
      id: editingMember?.id || Math.random().toString(36).substr(2, 9),
      name: fd.get("name") as string,
      role: fd.get("role") as string,
      rut: fd.get("rut") as string,
      email: fd.get("email") as string,
    };
    
    let newMembers = [...currentMembers];
    if (editingMember?.id) {
       newMembers = newMembers.map(x => x.id === m.id ? m : x);
    } else {
       newMembers.push(m);
    }

    if (activeTermId === "current") {
      updateCommitteeField("members", newMembers);
    } else {
      const newTerms = (activeCommittee.terms || []).map(t => 
        t.id === activeTermId ? { ...t, members: newMembers } : t
      );
      updateCommitteeField("terms", newTerms);
    }
    setEditingMember(null);
  };
  const deleteMember = (id: string) => {
    setDeleteConfirmation({ id, type: "member", title: "este miembro del comité" });
  };


  // SESSIONS MANAGE
  const [editingSession, setEditingSession] = useState<CommitteeSession | null>(null);
  const saveSession = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeCommittee) return;
    const fd = new FormData(e.currentTarget);
    
    // Attenddes checkbox manually handled here
    const formOptions = Array.from(e.currentTarget.elements) as HTMLInputElement[];
    const attendees = formOptions.filter(el => el.type === "checkbox" && el.checked && el.name === "attendees").map(el => el.value);

    const s: CommitteeSession = {
      id: editingSession?.id || Math.random().toString(36).substr(2, 9),
      date: fd.get("date") as string,
      topic: fd.get("topic") as string,
      agreements: fd.get("agreements") as string,
      attendees
    };
    let newSessions = [...(activeCommittee.sessions||[])];
    if (editingSession?.id) {
       newSessions = newSessions.map(x => x.id === s.id ? s : x);
    } else {
       newSessions.push(s);
    }
    updateCommitteeField("sessions", newSessions);
    setEditingSession(null);
  };
  const deleteSession = (id: string) => {
     setDeleteConfirmation({ id, type: "session", title: "esta sesión/acta" });
  };


  // HISTORY / DOCUMENT CENTER MANAGE
  const [editingRecord, setEditingRecord] = useState<CommitteeRecord | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  
  const saveRecord = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeCommittee) return;
    const fd = new FormData(e.currentTarget);
    const r: CommitteeRecord = {
      id: editingRecord?.id || Math.random().toString(36).substr(2, 9),
      date: fd.get("date") as string,
      type: fd.get("type") as string,
      description: fd.get("description") as string,
      status: fd.get("status") as string
    };
    let newHistory = [...(activeCommittee.history||[])];
    if (editingRecord?.id) {
       newHistory = newHistory.map(x => x.id === r.id ? r : x);
    } else {
       newHistory.push(r);
    }
    updateCommitteeField("history", newHistory);
    setEditingRecord(null);
  };
  const deleteRecord = (id: string) => {
     setDeleteConfirmation({ id, type: "record", title: "este registro del historial" });
  };


  // GANTT MANAGE
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);
  const [timeScale, setTimeScale] = useState("months");

  const saveTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeCommittee) return;
    const fd = new FormData(e.currentTarget);
    const t: GanttTask = {
      id: editingTask?.id || Math.random().toString(36).substr(2, 9),
      text: fd.get("text") as string,
      startDate: fd.get("startDate") as string,
      endDate: fd.get("endDate") as string,
      status: fd.get("status") as string || "Pendiente"
    };
    let newTasks = [...(activeCommittee.ganttTasks||[])];
    if (editingTask?.id) {
       newTasks = newTasks.map(x => x.id === t.id ? t : x);
    } else {
       newTasks.push(t);
    }
    updateCommitteeField("ganttTasks", newTasks);
    setEditingTask(null);
  };
  const deleteTask = (id: string) => {
     setDeleteConfirmation({ id, type: "task", title: "esta actividad de la carta gantt" });
  };

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

  let scaleCols: string[] = [];
  if (timeScale === "months")
    scaleCols = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];
  if (timeScale === "quarters")
    scaleCols = ["Q1 (Ene-Mar)", "Q2 (Abr-Jun)", "Q3 (Jul-Sep)", "Q4 (Oct-Dic)"];
  if (timeScale === "semesters")
    scaleCols = ["1° Sem (Ene-Jun)", "2° Sem (Jul-Dic)"];
  if (timeScale === "year") scaleCols = ["Año Completo"];

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
         <div>
            <button
               onClick={onBack}
               className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-2 text-sm font-bold uppercase tracking-widest"
            >
               <ArrowLeft size={16} /> Volver a la Ficha
            </button>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">
               Comités Paritarios
            </h2>
         </div>
         <button
            onClick={() => setIsEditingCommittee({ name: "", startDate: new Date().toISOString().split("T")[0] })}
            className="bg-purple-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-purple-500 transition-all shadow-xl shadow-purple-600/20 flex items-center justify-center gap-2"
         >
            <Plus size={16} /> Crear Comité
         </button>
      </div>

      {isEditingCommittee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                  {isEditingCommittee.id ? "Editar Comité" : "Nuevo Comité"}
                </h3>
                <button
                  onClick={() => setIsEditingCommittee(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={saveCommittee}>
                <div className="mb-4">
                  <label className="block text-[10px] font-black tracking-widest uppercase text-slate-500 mb-2">
                    Nombre del Comité Paritario
                  </label>
                  <input
                    type="text"
                    required
                    value={isEditingCommittee.name}
                    onChange={(e) => setIsEditingCommittee({ ...isEditingCommittee, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-purple-500 transition-colors"
                    placeholder="Ej: Comité Planta Principal"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-[10px] font-black tracking-widest uppercase text-slate-500 mb-2">
                      Fecha de Creación
                    </label>
                    <input
                      type="date"
                      value={isEditingCommittee.startDate || ""}
                      onChange={(e) => setIsEditingCommittee({ ...isEditingCommittee, startDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  {isEditingCommittee.id && (
                    <div>
                      <label className="block text-[10px] font-black tracking-widest uppercase text-slate-500 mb-2">
                        Fecha de Término
                      </label>
                      <input
                        type="date"
                        value={isEditingCommittee.endDate || ""}
                        onChange={(e) => setIsEditingCommittee({ ...isEditingCommittee, endDate: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingCommittee(null)}
                    className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-purple-500 transition-all shadow-md flex items-center gap-2"
                  >
                    <Check size={16} /> Guardar
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">
                Confirmar Eliminación
              </h3>
              <p className="text-sm text-slate-500 mb-8">
                ¿Está seguro que desea eliminar <span className="font-bold">{deleteConfirmation.title}</span>? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 bg-red-600 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-sm">
          Cargando comités...
        </div>
      ) : committees.length === 0 ? (
        <div className="bg-white p-12 rounded-[2rem] border border-slate-200 text-center">
          <Users size={48} className="mx-auto text-purple-200 mb-6" />
          <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Sin Comités Paritarios</h3>
          <p className="text-slate-500 max-w-sm mx-auto text-sm">
            Esta empresa aún no tiene comités paritarios registrados. 
            Crea uno para comenzar la gestión de sus miembros, actas y carta gantt.
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
           {/* Sidebar of Committees */}
           <div className={`w-full shrink-0 flex-col gap-3 ${activeCommitteeId ? 'hidden lg:flex lg:w-64' : 'flex'}`}>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">Seleccionar Comité</h4>
              <div className={`w-full ${activeCommitteeId ? 'flex flex-col gap-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}`}>
              {committees.map((c) => (
                <div 
                  key={c.id}
                  onClick={() => setActiveCommitteeId(c.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${activeCommitteeId === c.id ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-white border-slate-200 hover:border-purple-300'}`}
                >
                   <div>
                      <h5 className={`font-black uppercase tracking-tight text-sm ${activeCommitteeId === c.id ? 'text-purple-700' : 'text-slate-700'}`}>
                         {c.name}
                      </h5>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                         {((c.terms && c.terms.length > 0) ? c.terms[c.terms.length - 1].members?.length : c.members?.length) || 0} Miembros
                      </span>
                   </div>
                   <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsEditingCommittee({ id: c.id, name: c.name, startDate: c.startDate, endDate: c.endDate }); }}
                        className="text-slate-300 hover:text-blue-500 p-2 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteCommittee(c.id); }}
                        className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                   </div>
                </div>
              ))}
              </div>
           </div>

           {/* Active Committee Workspace */}
           {activeCommittee && (
             <div className={`flex-1 bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm ${!activeCommitteeId ? 'hidden lg:block' : 'block'}`}>
                <div className="bg-slate-50/50 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100">
                   <div>
                      <button onClick={() => setActiveCommitteeId(null)} className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:text-slate-800 mb-4 bg-white border border-slate-200 px-3 py-1.5 rounded-lg w-max shadow-sm"><ArrowLeft size={14}/> Volver a Comités</button>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2 italic">
                         {activeCommittee.name}
                      </h3>
                      <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-slate-500">
                         <span className="flex items-center gap-1.5"><Users size={14}/> {currentMembers.length || 0} Miembros</span>
                         <span className="flex items-center gap-1.5"><CalendarDays size={14}/> {activeCommittee.sessions?.length || 0} Actas</span>
                         <span className="flex items-center gap-1.5"><Kanban size={14}/> Gantt {activeCommittee.ganttTasks?.length || 0} Act.</span>
                      </div>
                   </div>
                   <button
                      onClick={exportPDF}
                      className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-purple-600 transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-xl shadow-slate-900/10"
                   >
                      <FileDown size={16} /> Generar PDF 
                   </button>
                </div>

                <div className="p-4 md:p-8">
                   {/* Tabs */}
                   <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 mb-8">
                     <button
                        onClick={() => setActiveTab("members")}
                        className={`px-3 py-3 md:py-2.5 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all text-center ${activeTab === 'members' ? 'bg-purple-50 text-purple-700 border-2 border-purple-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-2 border-transparent'}`}
                     >Miembros</button>
                     <button
                        onClick={() => setActiveTab("sessions")}
                        className={`px-3 py-3 md:py-2.5 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all text-center ${activeTab === 'sessions' ? 'bg-purple-50 text-purple-700 border-2 border-purple-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-2 border-transparent'}`}
                     >Actas y Sesiones</button>
                     <button
                        onClick={() => setActiveTab("history")}
                        className={`px-3 py-3 md:py-2.5 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all text-center ${activeTab === 'history' ? 'bg-purple-50 text-purple-700 border-2 border-purple-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-2 border-transparent'}`}
                     >Historial</button>
                     <button
                        onClick={() => setActiveTab("gantt")}
                        className={`px-3 py-3 md:py-2.5 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all text-center ${activeTab === 'gantt' ? 'bg-purple-50 text-purple-700 border-2 border-purple-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-2 border-transparent'}`}
                     >Carta Gantt</button>
                   </div>

                   {/* Render Content Based on Tab */}
                   <AnimatePresence mode="wait">
                     <motion.div
                       key={activeTab}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="min-h-[400px]"
                     >
                       {activeTab === "members" && (
                          <div className="space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                               <div className="flex items-center gap-4">
                                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Miembros</h3>
                                  <select 
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-purple-700 outline-none cursor-pointer"
                                    value={activeTermId}
                                    onChange={(e) => setActiveTermId(e.target.value)}
                                  >
                                     <option value="current">Periodo Base</option>
                                     {(activeCommittee.terms || []).map(t => (
                                       <option key={t.id} value={t.id}>{t.name} ({new Date(t.startDate).getFullYear()})</option>
                                     ))}
                                  </select>
                               </div>
                               <div className="flex gap-2">
                                  <button onClick={() => setIsCreatingTerm(true)} className="text-xs font-black text-slate-500 hover:text-slate-800 flex items-center gap-1 uppercase tracking-widest px-3 py-1.5 rounded-lg border border-slate-200 bg-white"><Plus size={14}/> Mandato</button>
                                  <button onClick={() => setEditingMember({ id: "", name: "", role: "Representante Empresa" })} className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-1.5 text-xs font-black rounded-lg flex items-center gap-1 uppercase tracking-widest transition-all"><Plus size={14}/> Añadir Miembro</button>
                               </div>
                            </div>
                            
                            {isCreatingTerm && (
                               <form onSubmit={createTerm} className="bg-purple-50 p-6 rounded-2xl border border-purple-100 grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                                 <button type="button" onClick={() => setIsCreatingTerm(false)} className="absolute top-4 right-4 text-purple-400 hover:text-purple-600"><X size={16}/></button>
                                 <div className="md:col-span-3">
                                    <h4 className="text-xs font-black text-purple-800 uppercase tracking-widest mb-1">Nuevo Periodo / Mandato</h4>
                                    <p className="text-[10px] text-purple-600">Guarda el historial de miembros para periodos anteriores o futuros.</p>
                                 </div>
                                 <div>
                                   <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Nombre (Ej: Periodo 2024-2026)</label>
                                   <input name="name" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-purple-500" />
                                 </div>
                                 <div>
                                   <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Fecha Inicio</label>
                                   <input name="startDate" type="date" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-purple-500" />
                                 </div>
                                 <div>
                                   <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Fecha Fin (Opcional)</label>
                                   <input name="endDate" type="date" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-purple-500" />
                                 </div>
                                 <div className="md:col-span-3 flex items-center gap-2 mt-2">
                                   <input type="checkbox" name="inheritMembers" defaultChecked id="inheritMembers" className="accent-purple-600 w-4 h-4" />
                                   <label htmlFor="inheritMembers" className="text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">Copiar miembros del periodo actual al nuevo mandato</label>
                                 </div>
                                 <div className="md:col-span-3 pt-2">
                                   <button type="submit" className="bg-purple-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-purple-500 transition-all flex items-center gap-2"><Check size={16}/> Guardar Periodo</button>
                                 </div>
                               </form>
                            )}

                            {editingMember && (
                              <form onSubmit={saveMember} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                                <button type="button" onClick={() => setEditingMember(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={16}/></button>
                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Nombre Completo</label>
                                  <input name="name" defaultValue={editingMember.name} required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-purple-500" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Rol en el Comité</label>
                                  <select name="role" defaultValue={editingMember.role} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-purple-500">
                                    <option>Presidente</option>
                                    <option>Secretario</option>
                                    <option>Representante Empresa</option>
                                    <option>Representante Trabajadores</option>
                                    <option>Asesor Especialista</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">RUT (Opcional)</label>
                                  <input name="rut" defaultValue={editingMember.rut} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-purple-500" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Email (Opcional)</label>
                                  <input name="email" type="email" defaultValue={editingMember.email} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-purple-500" />
                                </div>
                                <div className="md:col-span-2 pt-2">
                                  <button type="submit" className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-purple-600 transition-all flex items-center gap-2"><Check size={16}/> Guardar Miembro</button>
                                </div>
                              </form>
                            )}

                            <div className="flex flex-col gap-3">
                              {currentMembers.map(m => (
                                <div key={m.id} className="bg-white border text-sm border-slate-200 p-4 rounded-xl group hover:border-purple-200 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                   <div className="flex flex-col gap-1 w-full md:w-1/3">
                                     <h4 className="font-bold text-slate-900">{m.name}</h4>
                                     <span className="inline-block bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest w-max">{m.role}</span>
                                   </div>
                                   <div className="flex flex-col gap-1 w-full md:w-1/3 text-xs text-slate-500">
                                     {m.rut && <p><span className="font-black uppercase tracking-widest text-slate-400">RUT:</span> {m.rut}</p>}
                                     {m.email && <p><span className="font-black uppercase tracking-widest text-slate-400">EMAIL:</span> {m.email}</p>}
                                   </div>
                                   <div className="flex items-center justify-end w-full md:w-auto gap-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all pt-3 md:pt-0 border-t md:border-0 border-slate-100">
                                      <button onClick={() => setEditingMember(m)} className="text-slate-400 hover:text-blue-500 flex items-center gap-1 font-bold text-[10px] uppercase tracking-widest"><Edit2 size={14}/> Editar</button>
                                      <button onClick={() => deleteMember(m.id)} className="text-slate-400 hover:text-red-500 flex items-center gap-1 font-bold text-[10px] uppercase tracking-widest"><Trash2 size={14}/> Eliminar</button>
                                   </div>
                                </div>
                              ))}
                              {currentMembers.length === 0 && !editingMember && (
                                <div className="py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-2xl">
                                  No hay miembros registrados en este periodo
                                </div>
                              )}
                            </div>
                          </div>
                       )}

                       {activeTab === "sessions" && (
                          <div className="space-y-6">
                            <div className="flex justify-between items-center">
                               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Actas de Sesión</h3>
                               <button onClick={() => setEditingSession({ id: "", date: new Date().toISOString().split('T')[0], topic: "", agreements: "", attendees: [] })} className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-1.5 text-xs font-black rounded-lg flex items-center gap-1 uppercase tracking-widest transition-all"><Plus size={14}/> Añadir Acta</button>
                            </div>

                            {editingSession && (
                              <form onSubmit={saveSession} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                                <button type="button" onClick={() => setEditingSession(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={16}/></button>
                                
                                <div className="md:col-span-2">
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Tema Principal</label>
                                  <input name="topic" defaultValue={editingSession.topic} required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-purple-500" />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Fecha</label>
                                  <input name="date" type="date" defaultValue={editingSession.date} required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-purple-500" />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Acuerdos de la Sesión</label>
                                  <textarea name="agreements" defaultValue={editingSession.agreements} required rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-purple-500 resize-none" />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Asistentes</label>
                                  <div className="flex flex-wrap gap-3">
                                    {currentMembers.map(m => (
                                      <label key={m.id} className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-lg cursor-pointer">
                                        <input type="checkbox" name="attendees" value={m.name} defaultChecked={(editingSession.attendees||[]).includes(m.name)} className="accent-purple-600 rounded text-purple-600" />
                                        <span className="text-xs font-bold text-slate-700">{m.name}</span>
                                      </label>
                                    ))}
                                    {currentMembers.length === 0 && <span className="text-xs text-slate-400">Debe registrar miembros primero en este periodo.</span>}
                                  </div>
                                </div>

                                <div className="md:col-span-2 pt-2">
                                  <button type="submit" className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-purple-600 transition-all flex items-center gap-2"><Check size={16}/> Guardar Sesión</button>
                                </div>
                              </form>
                            )}

                            <div className="flex flex-col gap-3">
                              {(activeCommittee.sessions||[]).sort((a,b) => b.date.localeCompare(a.date)).map(s => (
                                <div key={s.id} className="bg-white border border-slate-200 p-4 rounded-xl group hover:border-purple-200 transition-all shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4">
                                   <div className="flex flex-col gap-2 w-full md:w-3/5">
                                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-600">
                                         <CalendarDays size={14} /> {new Date(s.date).toLocaleDateString()}
                                      </div>
                                      <h4 className="text-base font-bold text-slate-900 leading-tight">{s.topic}</h4>
                                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line line-clamp-3">{s.agreements}</p>
                                      
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest py-1">ASISTENTES:</span>
                                        {s.attendees?.map(a => <span key={a} className="bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest">{a}</span>)}
                                      </div>
                                   </div>
                                    
                                   <div className="flex items-center justify-end w-full md:w-auto gap-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all pt-3 md:pt-0 border-t md:border-0 border-slate-100 md:pt-2">
                                      <button onClick={() => exportSessionPDF(s)} className="text-slate-400 hover:text-purple-600 flex items-center gap-1 font-bold text-[10px] uppercase tracking-widest"><FileDown size={14}/> PDF</button>
                                      <button onClick={() => setEditingSession(s)} className="text-slate-400 hover:text-blue-500 flex items-center gap-1 font-bold text-[10px] uppercase tracking-widest"><Edit2 size={14}/> Editar</button>
                                      <button onClick={() => deleteSession(s.id)} className="text-slate-400 hover:text-red-500 flex items-center gap-1 font-bold text-[10px] uppercase tracking-widest"><Trash2 size={14}/> Eliminar</button>
                                   </div>
                                </div>
                              ))}
                              {(!activeCommittee.sessions || activeCommittee.sessions.length === 0) && !editingSession && (
                                <div className="py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-2xl">
                                  No hay sesiones anotadas
                                </div>
                              )}
                            </div>
                          </div>
                       )}

                       {activeTab === "history" && (
                          <div className="space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Central de Documentos</h3>
                               <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                  <input 
                                    type="text" 
                                    placeholder="Buscar por título..." 
                                    value={historySearchTerm}
                                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                                    className="bg-white border w-full md:w-48 border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-purple-500"
                                  />
                                  <input 
                                    type="date" 
                                    value={historyStartDate}
                                    onChange={(e) => setHistoryStartDate(e.target.value)}
                                    className="bg-white border flex-1 md:flex-none border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-purple-500"
                                  />
                                  <span className="text-slate-400 hidden md:block">-</span>
                                  <input 
                                    type="date" 
                                    value={historyEndDate}
                                    onChange={(e) => setHistoryEndDate(e.target.value)}
                                    className="bg-white border flex-1 md:flex-none border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-purple-500"
                                  />
                               </div>
                            </div>

                            <div className="flex flex-col gap-3">
                              {(activeCommittee.history||[])
                                .filter(r => r.description.toLowerCase().includes(historySearchTerm.toLowerCase()) || r.type.toLowerCase().includes(historySearchTerm.toLowerCase()))
                                .filter(r => !historyStartDate || r.date >= historyStartDate)
                                .filter(r => !historyEndDate || r.date <= historyEndDate)
                                .sort((a,b) => b.date.localeCompare(a.date))
                                .map(record => (
                                <div key={record.id} className="bg-white border border-slate-200 p-4 rounded-xl group hover:border-purple-200 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                   <div className="flex flex-col gap-1 w-full md:w-1/2">
                                     <h4 className="font-bold text-slate-900">{record.description}</h4>
                                     <span className="inline-block bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest w-max">{record.type}</span>
                                   </div>
                                   <div className="flex flex-col gap-1 w-full md:w-1/4 text-xs text-slate-500">
                                     <p className="flex items-center gap-1.5 font-bold text-slate-400"><CalendarDays size={14}/> {new Date(record.date).toLocaleDateString()}</p>
                                     <p className="flex items-center gap-1.5"><FileText size={14}/> Guardado</p>
                                   </div>
                                   <div className="flex items-center justify-end w-full md:w-auto gap-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all pt-3 md:pt-0 border-t md:border-0 border-slate-100 pb-2 md:pb-0">
                                      <button onClick={() => exportArchivedPDF(record)} className="text-slate-400 hover:text-purple-600 flex items-center gap-1 font-bold text-[10px] uppercase tracking-widest bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100"><FileDown size={14}/> PDF</button>
                                      <button onClick={() => deleteRecord(record.id)} className="text-slate-400 hover:text-red-500 flex items-center gap-1 font-bold text-[10px] uppercase tracking-widest px-2"><Trash2 size={14}/> Eliminar</button>
                                   </div>
                                </div>
                              ))}
                              {(!activeCommittee.history || activeCommittee.history.length === 0) && (
                                <div className="col-span-full py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-2xl">
                                  Sin Documentos en el Historial
                                </div>
                              )}
                            </div>
                          </div>
                       )}

                       {activeTab === "gantt" && (
                          <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Planificador Carta Gantt</h3>
                               <div className="flex flex-wrap items-center gap-3">
                                  <select
                                    value={timeScale}
                                    onChange={(e: any) => setTimeScale(e.target.value)}
                                    className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 uppercase tracking-widest outline-none appearance-none hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                                  >
                                    <option value="months">12 Meses</option>
                                    <option value="quarters">4 Trimestres</option>
                                    <option value="semesters">2 Semestres</option>
                                    <option value="year">Anual</option>
                                  </select>
                                  <button onClick={exportGanttPDF} className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 text-xs font-black rounded-xl flex items-center gap-2 uppercase tracking-widest transition-all shadow-sm"><FileDown size={14}/> PDF Gantt</button>
                                  <button onClick={() => setEditingTask({ id: "", text: "", startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], status: "Pendiente" })} className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-2 text-xs font-black rounded-xl flex items-center gap-2 uppercase tracking-widest transition-all"><Plus size={14}/> Nueva Actividad</button>
                               </div>
                            </div>

                            {editingTask && (
                              <form onSubmit={saveTask} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                                <button type="button" onClick={() => setEditingTask(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={16}/></button>
                                
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Descripción de la Actividad</label>
                                  <input name="text" defaultValue={editingTask.text} required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-purple-500" />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Fecha de Inicio</label>
                                  <input name="startDate" type="date" defaultValue={editingTask.startDate} required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-purple-500" />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Fecha de Término</label>
                                  <input name="endDate" type="date" defaultValue={editingTask.endDate} required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-purple-500" />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Estado</label>
                                  <select name="status" defaultValue={editingTask.status} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-purple-500">
                                    <option>Pendiente</option>
                                    <option>Completado</option>
                                  </select>
                                </div>

                                <div className="sm:col-span-2 pt-2">
                                  <button type="submit" className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-purple-600 transition-all flex items-center gap-2 w-full justify-center"><Check size={16}/> Guardar Actividad</button>
                                </div>
                              </form>
                            )}

                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mt-4">
                              <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                    Planificador Anual del Comité Paritario
                                  </h4>
                                  <p className="md:hidden text-[9px] text-purple-500 font-black uppercase mt-1 animate-pulse">
                                    ⬅️ Deslizar horizontal para ver calendario ➡️
                                  </p>
                                </div>
                                <div className="flex gap-4">
                                  <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                    <span className="w-2.5 h-2.5 shadow-sm rounded-full bg-slate-200" /> Pendiente
                                  </span>
                                  <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                    <span className="w-2.5 h-2.5 shadow-sm rounded-full bg-green-500" /> Completado
                                  </span>
                                </div>
                              </div>

                              <div className="overflow-x-auto custom-scrollbar">
                                <div className="min-w-[1200px]">
                                  {/* Header Columns */}
                                  <div className="grid grid-cols-[450px_1fr] bg-slate-100 border-b border-slate-200 shadow-sm">
                                    <div className="grid grid-cols-[100px_200px_75px_75px] gap-0 border-r border-slate-200 bg-slate-200/50">
                                      <div className="p-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center border-r border-slate-200 flex items-center justify-center">Acciones</div>
                                      <div className="p-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-left border-r border-slate-200 flex items-center">Descripción de Actividad</div>
                                      <div className="p-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center border-r border-slate-200 flex items-center justify-center">Inicio</div>
                                      <div className="p-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center flex items-center justify-center">Término</div>
                                    </div>
                                    <div className="grid gap-0 bg-slate-100" style={{ gridTemplateColumns: `repeat(${scaleCols.length}, minmax(0, 1fr))` }}>
                                      {scaleCols.map((col, idx) => (
                                        <div key={`inc-${idx}`} className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-r border-slate-200 last:border-r-0 flex items-center justify-center">{col}</div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Body Rows */}
                                  <div className="divide-y divide-slate-100 bg-white">
                                    {(!activeCommittee.ganttTasks || activeCommittee.ganttTasks.length === 0) && (
                                      <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No hay actividades en Gantt</div>
                                    )}
                                    {(activeCommittee.ganttTasks||[]).sort((a,b) => (a.startDate||"").localeCompare(b.startDate||"")).map(task => {
                                      const spans = getTaskSpanForScale(task.startDate, task.endDate, timeScale);
                                      return (
                                        <div key={task.id} className="grid grid-cols-[450px_1fr] group border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                          <div className="grid grid-cols-[100px_200px_75px_75px] gap-0 border-r border-slate-200 items-center">
                                            <div className="p-2 flex items-center justify-center gap-2 border-r border-slate-100 text-center">
                                              <button
                                                onClick={async () => {
                                                  const newTasks = (activeCommittee.ganttTasks||[]).map(t => t.id === task.id ? { ...t, status: t.status === "Completado" ? "Pendiente" : "Completado" } : t);
                                                  updateCommitteeField("ganttTasks", newTasks);
                                                }}
                                                className={`p-1.5 rounded-md hover:scale-110 transition-all ${task.status === "Completado" ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                                              >
                                                <div className="w-4 h-4 rounded border flex items-center justify-center">
                                                  <Check size={12} className={task.status === "Completado" ? "opacity-100 text-green-600" : "opacity-0"} />
                                                </div>
                                              </button>
                                              <button onClick={() => setEditingTask(task)} className="p-1.5 text-blue-500 bg-blue-50 rounded-md hover:bg-blue-100 hover:scale-110 transition-all"><Edit2 size={14} /></button>
                                              <button onClick={() => deleteTask(task.id)} className="p-1.5 text-red-500 bg-red-50 rounded-md hover:bg-red-100 hover:scale-110 transition-all"><Trash2 size={14} /></button>
                                            </div>
                                            <div className="p-3 text-[10px] font-black text-slate-800 uppercase tracking-tighter truncate border-r border-slate-100">
                                              {task.text}
                                            </div>
                                            <div className="p-3 text-[10px] font-bold text-slate-400 border-r border-slate-100 text-center tracking-tighter">
                                              {task.startDate ? task.startDate.substring(5) : "--"}
                                            </div>
                                            <div className="p-3 text-[10px] font-bold text-slate-400 text-center tracking-tighter">
                                              {task.endDate ? task.endDate.substring(5) : "--"}
                                            </div>
                                          </div>
                                          <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${scaleCols.length}, minmax(0, 1fr))` }}>
                                            {spans.map((isActive, idx) => (
                                              <div key={`span-${task.id}-${idx}`} className={`border-r border-slate-100 last:border-r-0 relative p-1.5 flex items-center justify-center ${isActive ? "" : ""}`}>
                                                {isActive && (
                                                  <div className={`w-full h-8 sm:h-6 rounded-md shadow-sm ${task.status === "Completado" ? "bg-green-400" : "bg-purple-200"}`} />
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                       )}
                     </motion.div>
                   </AnimatePresence>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};
