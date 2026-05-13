import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Database, 
  Users, 
  Activity, 
  CreditCard,
  Zap,
  Server,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  FileText
} from "lucide-react";
// Added recharts imports
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

import { collection, query, getDocs, orderBy, where, getCountFromServer, doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { appCache, clearAppCache } from "../services/firestore";

interface UserData {
  id: string;
  email: string;
  displayName: string;
  subscriptionType: string;
  pdfCount: number;
  dailyPdfs: number;
  isPremium: boolean;
  createdAt?: any;
  lastPdfDate?: string;
}

export const SuperAdminView = ({ user }: { user: any }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "cache" | "users" | "financials">("overview");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [cacheKeys, setCacheKeys] = useState<string[]>([]);
  const [searchUser, setSearchUser] = useState("");
  
  // Variables de simulación financiera
  const [costPerPdf, setCostPerPdf] = useState<number>(5);
  const [costPerUser, setCostPerUser] = useState<number>(45);

  interface AuditMetrics {
    clientsCount: number;
    workersCount: number;
    inspectionsCount: number;
    tasksCount: number;
    reportsCount: number;
    formsCount: number;
    totalDocs: number;
    loading: boolean;
    audited: boolean;
  }

  const [auditData, setAuditData] = useState<Record<string, AuditMetrics>>({});

  const handleUpdatePlan = async (userId: string, targetPlan: string) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        subscriptionType: targetPlan,
        isPremium: targetPlan !== "free"
      });
      // update local state
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, subscriptionType: targetPlan, isPremium: targetPlan !== "free" } 
          : u
      ));
    } catch(e) {
      console.error("Error updating plan", e);
      alert("Error al actualizar el plan del usuario");
    }
  };

  const handleAuditUser = async (userId: string) => {
    setAuditData(prev => ({ ...prev, [userId]: { ...prev[userId], loading: true, audited: false } }));
    
    try {
      // Get all clients owned by this user
      const clientsQuery = query(collection(db, "clients"), where("ownerId", "==", userId));
      const clientsSnap = await getDocs(clientsQuery);
      const clientsCount = clientsSnap.size;
      
      let workersCount = 0;
      let inspectionsCount = 0;
      let tasksCount = 0;
      let reportsCount = 0;
      let formsCount = 0;
      let totalDocs = clientsCount + 1; // Clients + 1 User doc

      // Count subcollections for each client
      const clientPromises = clientsSnap.docs.map(async (clientDoc) => {
        const refs = [
          collection(db, `clients/${clientDoc.id}/workers`),
          collection(db, `clients/${clientDoc.id}/inspections`),
          collection(db, `clients/${clientDoc.id}/gantt_tasks`),
          collection(db, `clients/${clientDoc.id}/reports`),
          collection(db, `clients/${clientDoc.id}/diep_records`),
          collection(db, `clients/${clientDoc.id}/diat_records`),
          collection(db, `clients/${clientDoc.id}/irl_records`),
          collection(db, `clients/${clientDoc.id}/minsal_audits`),
          collection(db, `clients/${clientDoc.id}/grd_inspections`),
          collection(db, `clients/${clientDoc.id}/miper_risks`),
          collection(db, `clients/${clientDoc.id}/procedures`),
        ];

        const counts = await Promise.all(refs.map(r => getCountFromServer(r)));
        return {
          workers: counts[0].data().count,
          inspections: counts[1].data().count,
          tasks: counts[2].data().count,
          reports: counts[3].data().count,
          forms: counts[4].data().count + counts[5].data().count + counts[6].data().count + counts[7].data().count + counts[8].data().count + counts[9].data().count + counts[10].data().count,
        };
      });
      
      const clientStats = await Promise.all(clientPromises);
      workersCount = clientStats.reduce((acc, curr) => acc + curr.workers, 0);
      inspectionsCount = clientStats.reduce((acc, curr) => acc + curr.inspections, 0);
      tasksCount = clientStats.reduce((acc, curr) => acc + curr.tasks, 0);
      reportsCount = clientStats.reduce((acc, curr) => acc + curr.reports, 0);
      formsCount = clientStats.reduce((acc, curr) => acc + curr.forms, 0);
      
      totalDocs += workersCount + inspectionsCount + tasksCount + reportsCount + formsCount;

      setAuditData(prev => ({
        ...prev,
        [userId]: {
          clientsCount,
          workersCount,
          inspectionsCount,
          tasksCount,
          reportsCount,
          formsCount,
          totalDocs,
          loading: false,
          audited: true
        }
      }));

    } catch (error) {
      console.error("Error auditing user:", error);
      setAuditData(prev => ({
        ...prev,
        [userId]: { ...prev[userId], loading: false, audited: false }
      }));
      // Need to inform user of error?
    }
  };

  const [auditingAll, setAuditingAll] = useState(false);

  const handleAuditAll = async () => {
    setAuditingAll(true);
    // Execute sequentially or in small chunks so we don't spam 100 getDocs concurrently
    for (const u of filteredUsers) {
      if (!auditData[u.id]?.audited) {
        await handleAuditUser(u.id);
      }
    }
    setAuditingAll(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const fetchedUsers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
      setUsers(fetchedUsers);
      updateCacheKeys();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const updateCacheKeys = () => {
    if (typeof appCache !== "undefined") {
      setCacheKeys(Array.from(appCache.keys()));
    }
  };

  useEffect(() => {
    loadData();
    // Set up cache key polling while in cache tab
    let interval: any;
    if (activeTab === "cache") {
      interval = setInterval(updateCacheKeys, 2000);
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleClearCache = (key?: string) => {
    if (key) {
      appCache.delete(key);
    } else {
      clearAppCache();
    }
    updateCacheKeys();
  };

  const auditedUsersIds = Object.keys(auditData).filter(id => auditData[id].audited);
  const totalAuditedDocs = auditedUsersIds.reduce((acc, id) => acc + auditData[id].totalDocs, 0);

  const stats = {
    totalUsers: users.length,
    premiumUsers: users.filter(u => u.isPremium).length,
    freeUsers: users.filter(u => !u.isPremium).length,
    totalPdfs: users.reduce((acc, u) => acc + (u.pdfCount || 0), 0),
    cacheSize: cacheKeys.length,
    estimatedMonthlyRevenue: users.reduce((acc, u) => {
      if (u.subscriptionType === "basico") return acc + 9800;
      if (u.subscriptionType === "avanzado") return acc + 14900;
      if (u.subscriptionType === "profesional") return acc + 21650;
      if (u.subscriptionType === "corporativo") return acc + 38850;
      return acc;
    }, 0),
    auditedDocs: totalAuditedDocs,
    auditedCoverage: auditedUsersIds.length
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 rounded-xl text-white shadow-lg">
              <Server size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Control / System</h1>
              <p className="text-slate-500 text-sm">Monitor de sistema e infraestructura</p>
            </div>
          </div>
          <button 
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2">
          {([
            { id: "overview", label: "Overview General", icon: Activity },
            { id: "cache", label: "Cache & Devtools", icon: Database },
            { id: "users", label: "Usuarios & Consumo", icon: Users },
            { id: "financials", label: "Costos Operativos", icon: CreditCard }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
        >
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Métricas Principales</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border border-slate-100 bg-slate-50 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Usuarios Totales</div>
                    <Users size={16} className="text-blue-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-800 mt-2">{stats.totalUsers}</div>
                </div>
                
                <div className="p-4 border border-slate-100 bg-slate-50 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Usuarios Premium</div>
                    <Zap size={16} className="text-orange-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-800 mt-2">{stats.premiumUsers}</div>
                  <div className="text-xs text-slate-400 mt-1">{((stats.premiumUsers / Math.max(stats.totalUsers, 1)) * 100).toFixed(1)}% conversión</div>
                </div>
                
                <div className="p-4 border border-slate-100 bg-slate-50 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">PDFs Generados</div>
                    <FileText size={16} className="text-green-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-800 mt-2">{stats.totalPdfs}</div>
                </div>

                <div className="p-4 border border-slate-100 bg-slate-50 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Objetos en Cache</div>
                    <Database size={16} className="text-purple-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-800 mt-2">{stats.cacheSize}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "cache" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Database size={20} className="text-slate-400" />
                    Estado de Cache en Memoria
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Gestión manual de la memoria caché para optimizar llamadas a Firestore.
                  </p>
                </div>
                <button
                  onClick={() => handleClearCache()}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors rounded-xl font-medium text-sm"
                >
                  <Trash2 size={16} />
                  Limpiar Toda la Caché
                </button>
              </div>

              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden font-mono text-sm shadow-inner">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                  <span className="text-slate-400 font-semibold tracking-wider text-xs uppercase">Claves en Memoria ({cacheKeys.length})</span>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Live Sync
                  </span>
                </div>
                <div className="p-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {cacheKeys.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic text-xs">La caché está vacía.</div>
                  ) : (
                    <ul className="space-y-1">
                      {cacheKeys.map(key => (
                        <li key={key} className="flex items-center justify-between p-2 hover:bg-slate-800 rounded group transition-colors">
                          <span className="text-slate-300 break-all text-xs">{key}</span>
                          <button
                            onClick={() => handleClearCache(key)}
                            className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 bg-slate-800 rounded"
                            title="Eliminar llave"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-6">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div>
                   <h2 className="text-lg font-bold text-slate-900">Usuarios & Consumo</h2>
                   <p className="text-slate-500 text-sm mt-1">
                     Listado de cuentas registradas y uso de plataforma.
                   </p>
                 </div>
                 <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                   <button
                     onClick={handleAuditAll}
                     disabled={auditingAll}
                     className="whitespace-nowrap px-4 py-2 bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 text-sm font-medium rounded-xl flex items-center gap-2 transition-colors focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 disabled:opacity-50"
                   >
                     {auditingAll ? (
                       <>
                         <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                         Escaneando Platforma...
                       </>
                     ) : (
                       <>
                         <Database size={16} />
                         Escanear Todos
                       </>
                     )}
                   </button>
                   <div className="relative w-full md:w-64">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Search className="h-4 w-4 text-slate-400" />
                     </div>
                     <input
                       type="text"
                       placeholder="Buscar usuario..."
                       value={searchUser}
                       onChange={(e) => setSearchUser(e.target.value)}
                       className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                     />
                   </div>
                 </div>
               </div>

               <div className="overflow-x-auto border border-slate-200 rounded-xl">
                 <table className="min-w-full divide-y divide-slate-200">
                   <thead className="bg-slate-50">
                     <tr>
                       <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                       <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                       <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Storage & DB (Docs)</th>
                       <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">PDFs & Exportables</th>
                       <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Gestión Plan</th>
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-slate-100">
                     {filteredUsers.length === 0 ? (
                       <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm italic">No se encontraron usuarios.</td></tr>
                     ) : filteredUsers.map((u) => (
                       <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex flex-col">
                             <span className="text-sm font-medium text-slate-900">{u.displayName || "Sin nombre"}</span>
                             <span className="text-xs text-slate-500">{u.email}</span>
                             <span className="text-[10px] text-slate-400 font-mono mt-1" title="User ID">{u.id}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                             u.subscriptionType === 'basico' ? 'bg-blue-100 text-blue-800' :
                             u.subscriptionType === 'avanzado' ? 'bg-orange-100 text-orange-800' :
                             u.subscriptionType === 'profesional' ? 'bg-indigo-100 text-indigo-800' :
                             u.subscriptionType === 'corporativo' ? 'bg-purple-100 text-purple-800' :
                             'bg-slate-100 text-slate-800'
                           }`}>
                             {u.subscriptionType || "free"}
                           </span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                            {auditData[u.id]?.audited ? (
                              <div className="flex flex-col gap-1 w-56">
                                <div className="flex items-center gap-2 mb-1">
                                  <Database size={14} className="text-slate-600" />
                                  <span className="text-xs font-bold text-slate-800">{auditData[u.id].totalDocs} Documentos Vivos</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-600">
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded"><b>{auditData[u.id].clientsCount}</b> Clientes</span>
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded"><b>{auditData[u.id].workersCount}</b> Trabs</span>
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded"><b>{auditData[u.id].tasksCount}</b> Tareas (G)</span>
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded"><b>{auditData[u.id].reportsCount}</b> Reportes</span>
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded"><b>{auditData[u.id].inspectionsCount}</b> Chklst</span>
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded"><b>{auditData[u.id].formsCount}</b> Docs</span>
                                </div>
                                <span className="text-[10px] font-mono text-blue-600 font-bold mt-1.5 bg-blue-50 px-2 py-0.5 border border-blue-100 inline-block rounded w-fit">
                                  {auditData[u.id].clientsCount > 0 ? `~${auditData[u.id].totalDocs * 12} reads/mes est.` : "Sin uso detectado"}
                                </span>
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleAuditUser(u.id)}
                                disabled={auditData[u.id]?.loading}
                                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                              >
                                {auditData[u.id]?.loading ? (
                                  <>
                                    <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                    Calculando...
                                  </>
                                ) : (
                                  <>
                                    <Database size={14} className="text-slate-500" />
                                    Auditar Storage
                                  </>
                                )}
                              </button>
                            )}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1.5 pt-1 w-36">
                              <div className="flex justify-between items-center bg-slate-50 border border-slate-100 px-2 py-1 rounded">
                                <span className="text-[10px] uppercase font-bold text-slate-500">Histórico</span>
                                <span className="text-sm font-bold text-slate-800">{u.pdfCount || 0}</span>
                              </div>
                              <div className="flex justify-between items-center bg-slate-50 border border-slate-100 px-2 py-1 rounded">
                                <span className="text-[10px] uppercase font-bold text-slate-500">Hoy</span>
                                <span className="text-sm font-bold text-slate-800">{u.dailyPdfs || 0}</span>
                              </div>
                              <span className="text-[9px] text-slate-400 text-right mt-0.5">
                                {u.lastPdfDate ? `Última exp: ${u.lastPdfDate}` : "Ninguna exportación"}
                              </span>
                            </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                           {user?.email === "estudiofjc@gmail.com" ? (
                             <select
                                value={u.subscriptionType || "free"}
                                onChange={(e) => handleUpdatePlan(u.id, e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-2 rounded-lg outline-none focus:border-blue-500 cursor-pointer text-slate-700"
                              >
                                <option value="free">Free</option>
                                <option value="basico">Básico</option>
                                <option value="avanzado">Avanzado</option>
                                <option value="profesional">Profesional</option>
                                <option value="corporativo">Corporativo</option>
                              </select>
                           ) : (
                             <div className="flex items-center gap-2">
                               {u.isPremium ? (
                                 <CheckCircle size={16} className="text-green-500" />
                               ) : (
                                 <XCircle size={16} className="text-slate-300" />
                               )}
                               <span className="text-xs">{u.isPremium ? 'Premium' : 'Gratis'}</span>
                             </div>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === "financials" && (
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                 <h2 className="text-lg font-bold text-slate-900">Análisis Financiero de Suscripciones</h2>
                 <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-full">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                   Flow.cl Automatizado
                 </span>
               </div>
               
               {/* KPI Ribbon */}
               <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                 <div className="p-4 border border-slate-200 bg-white rounded-xl shadow-sm">
                   <div className="flex justify-between items-start">
                     <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">MRR (Mensual)</div>
                     <CreditCard size={16} className="text-blue-500" />
                   </div>
                   <div className="text-2xl font-black text-slate-800 mt-2">${stats.estimatedMonthlyRevenue.toLocaleString("es-CL")}</div>
                 </div>
                 
                 <div className="p-4 border border-slate-200 bg-white rounded-xl shadow-sm">
                   <div className="flex justify-between items-start">
                     <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">ARR (Anualizado)</div>
                     <Activity size={16} className="text-purple-500" />
                   </div>
                   <div className="text-2xl font-black text-slate-800 mt-2">${(stats.estimatedMonthlyRevenue * 12).toLocaleString("es-CL")}</div>
                 </div>

                 <div className="p-4 border border-slate-200 bg-white rounded-xl shadow-sm">
                   <div className="flex justify-between items-start">
                     <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Plan Básico</div>
                     <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">$9.800</div>
                   </div>
                   <div className="text-2xl font-black text-slate-800 mt-2">{users.filter(u => u.subscriptionType === 'basico').length} <span className="text-sm font-medium text-slate-500">suscriptores</span></div>
                 </div>

                 <div className="p-4 border border-slate-200 bg-white rounded-xl shadow-sm">
                   <div className="flex justify-between items-start">
                     <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Plan Avanzado</div>
                     <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">$14.900</div>
                   </div>
                   <div className="text-2xl font-black text-slate-800 mt-2">{users.filter(u => u.subscriptionType === 'avanzado').length} <span className="text-sm font-medium text-slate-500">suscriptores</span></div>
                 </div>

                 <div className="p-4 border border-slate-200 bg-white rounded-xl shadow-sm">
                   <div className="flex justify-between items-start">
                     <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Profesional</div>
                     <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">$21.650</div>
                   </div>
                   <div className="text-2xl font-black text-slate-800 mt-2">{users.filter(u => u.subscriptionType === 'profesional').length} <span className="text-sm font-medium text-slate-500">suscriptores</span></div>
                 </div>

                 <div className="p-4 border border-slate-200 bg-white rounded-xl shadow-sm">
                   <div className="flex justify-between items-start">
                     <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Corporativo</div>
                     <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">$38.850</div>
                   </div>
                   <div className="text-2xl font-black text-slate-800 mt-2">{users.filter(u => u.subscriptionType === 'corporativo').length} <span className="text-sm font-medium text-slate-500">suscriptores</span></div>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 
                 {/* Revenue Distribution Chart */}
                 <div className="p-6 border border-slate-200 bg-white rounded-xl shadow-sm">
                   <h3 className="font-bold uppercase text-xs tracking-wider text-slate-500 mb-4">Distribución de Ingresos (MRR)</h3>
                   <div className="h-64">
                     {stats.estimatedMonthlyRevenue === 0 ? (
                       <div className="flex h-full items-center justify-center text-slate-400 text-sm italic">Sin ingresos activos para graficar.</div>
                     ) : (
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={[
                                { name: 'Básico', value: users.filter(u => u.subscriptionType === 'basico').length * 9800 },
                                { name: 'Avanzado', value: users.filter(u => u.subscriptionType === 'avanzado').length * 14900 },
                                { name: 'Profesional', value: users.filter(u => u.subscriptionType === 'profesional').length * 21650 },
                                { name: 'Corporativo', value: users.filter(u => u.subscriptionType === 'corporativo').length * 38850 }
                              ]}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={80}
                             paddingAngle={5}
                             dataKey="value"
                           >
                             <Cell fill="#0ea5e9" />
                              <Cell fill="#f97316" />
                              <Cell fill="#6366f1" />
                              <Cell fill="#8b5cf6" />
                           </Pie>
                           <RechartsTooltip formatter={(value: number) => `$${value.toLocaleString("es-CL")} CLP`} />
                         </PieChart>
                       </ResponsiveContainer>
                     )}
                   </div>
                   <div className="flex justify-center gap-6 mt-2">
                     <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#0ea5e9]"></div><span className="text-xs text-slate-600 font-medium">Pro</span></div>
                     <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div><span className="text-xs text-slate-600 font-medium">Full</span></div>
                   </div>
                 </div>

                 {/* Cost Estimation */}
                 <div className="p-6 border border-slate-200 bg-white rounded-xl shadow-sm flex flex-col justify-between">
                   <div>
                     <h3 className="font-bold uppercase text-xs tracking-wider text-slate-500 mb-4 flex items-center justify-between">
                       <span className="flex items-center gap-2">
                         <Zap size={14} className="text-orange-500" />
                         Estimación de Costos
                       </span>
                     </h3>
                     <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                       Evaluación basada en <strong>lecturas Firestore</strong> y consultas a <strong>Gemini AI</strong>. La generación de PDFs funciona de forma 100% local (jsPDF) con costo $0.
                     </p>
                     
                     <div className="mb-6 space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                       <div className="flex items-center justify-between">
                         <label className="text-xs font-semibold text-slate-600">Costo Unitario IA / PDF ($CLP)</label>
                         <input 
                           type="number" 
                           value={costPerPdf}
                           onChange={(e) => setCostPerPdf(Number(e.target.value))}
                           className="w-20 px-2 py-1 text-sm border border-slate-200 rounded text-right"
                         />
                       </div>
                       <div className="flex items-center justify-between">
                         <label className="text-xs font-semibold text-slate-600">Costo Unitario Base DB (x 1,000 requests)</label>
                         <input 
                           type="number" 
                           value={costPerUser}
                           onChange={(e) => setCostPerUser(Number(e.target.value))}
                           className="w-20 px-2 py-1 text-sm border border-slate-200 rounded text-right"
                         />
                       </div>
                     </div>

                     <div className="space-y-4">
                       <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                         <div className="flex justify-between items-center text-sm">
                           <span className="font-medium text-slate-700">Costos jsPDF (Local)</span>
                           <span className="font-bold text-green-600">$0</span>
                         </div>
                         <p className="text-[10px] text-slate-500 text-right">{stats.totalPdfs} PDFs generados localmente</p>
                       </div>
                       <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                         <div className="flex justify-between items-center text-sm">
                           <span className="font-medium text-slate-700">Costo Gemini Est.</span>
                           <span className="font-bold text-slate-900">~${(stats.totalUsers * costPerPdf * 0.5).toLocaleString("es-CL")}</span>
                         </div>
                         <p className="text-[10px] text-slate-500 text-right">~{stats.totalUsers * 2} llamadas diarias est. a Gemini 1.5</p>
                       </div>
                       <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                         <div className="flex justify-between items-center text-sm">
                           <span className="font-medium text-slate-900 flex items-center gap-2">
                             Costo Firestore Est. 
                             {stats.auditedCoverage < stats.totalUsers && (
                               <span className="bg-yellow-100 text-yellow-800 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">
                                 Auditoría Incompleta ({stats.auditedCoverage}/{stats.totalUsers})
                               </span>
                             )}
                           </span>
                           <span className="font-bold text-slate-900">~${(Math.ceil((stats.auditedDocs || 1) / 1000) * costPerUser).toLocaleString("es-CL")}</span>
                         </div>
                         <p className="text-[10px] text-slate-500 text-right">{stats.auditedDocs} documentos detectados, costo x cada 1.000 operaciones</p>
                       </div>
                       <div className="flex justify-between items-center pt-2">
                         <span className="text-sm font-bold text-slate-900">Margen Bruto Mensual (Proyección)</span>
                         <span className={`text-xl font-black ${(stats.estimatedMonthlyRevenue - (stats.totalUsers * costPerPdf * 0.5) - (Math.ceil((stats.auditedDocs || 1) / 1000) * costPerUser)) >= 0 ? "text-green-600" : "text-red-500"}`}>
                           ${(stats.estimatedMonthlyRevenue - (stats.totalUsers * costPerPdf * 0.5) - (Math.ceil((stats.auditedDocs || 1) / 1000) * costPerUser)).toLocaleString("es-CL")}
                         </span>
                       </div>
                     </div>
                   </div>
                   
                   <div className="mt-6 p-4 border border-blue-100 bg-blue-50/50 rounded-xl">
                      <p className="text-xs text-blue-800/80 leading-relaxed">
                      <strong>Aviso Operativo:</strong> El webhook nativo de la aplicación (<code>/api/flow/confirm</code>) gestiona las altas de suscripción de forma 100% automática tras el pago en Flow, minimizando el costo humano administrativo a $0.
                      </p>
                   </div>
                 </div>
               </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
