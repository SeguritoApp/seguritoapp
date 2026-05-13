import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Database, Zap, RefreshCw, X, ChevronUp, ChevronDown } from "lucide-react";
import { addCacheListener, CacheEvent } from "../services/firestore";

interface LogEntry {
  id: string;
  timestamp: Date;
  event: CacheEvent;
  key: string;
}

export const CacheDebugger = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const removeListener = addCacheListener((event, key) => {
      setLogs((prevLogs) => {
        const newLog: LogEntry = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          event,
          key,
        };
        // Keep last 50 logs to avoid memory issues
        return [newLog, ...prevLogs].slice(0, 50);
      });
      
      // Auto pulse on hit/miss
      if (event === "hit" || event === "miss") {
        const icon = document.getElementById("cache-debugger-icon");
        if (icon) {
          icon.classList.remove("animate-ping");
          // Trigger reflow
          void icon.offsetWidth;
          icon.classList.add("animate-ping");
          setTimeout(() => icon.classList.remove("animate-ping"), 1000);
        }
      }
    });

    return () => removeListener();
  }, []);

  const stats = {
    hits: logs.filter((l) => l.event === "hit").length,
    misses: logs.filter((l) => l.event === "miss").length,
  };

  const hitRate =
    stats.hits + stats.misses > 0
      ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100)
      : 0;

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-mono select-none">
      <motion.div
        layout
        className="bg-slate-900 text-slate-300 rounded-lg shadow-2xl overflow-hidden border border-slate-700/50 flex flex-col w-72"
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800 transition-colors bg-slate-900 border-b border-slate-800 relative"
          onClick={() => setExpanded(!expanded)}
        >
           <div className="flex items-center gap-2">
             <div className="relative">
               <Database size={16} className="text-blue-400" />
               <div id="cache-debugger-icon" className="absolute inset-0 rounded-full border-blue-400 opacity-0 pointer-events-none" />
             </div>
             <span className="text-xs font-bold text-white tracking-wider">CACHE DEVTOOLS</span>
           </div>
           
           <div className="flex items-center gap-2 text-slate-400">
             <div className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800" title="Hit Rate">
               <Zap size={10} className={hitRate > 50 ? "text-green-400" : "text-orange-400"} />
               {hitRate}%
             </div>
             {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
             <button 
               onClick={(e) => { e.stopPropagation(); setVisible(false); }}
               className="hover:text-red-400 focus:outline-none transition-colors"
               title="Cerrar devtools"
             >
               <X size={14} />
             </button>
           </div>
        </div>

        {/* Extended Body */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden bg-slate-950 flex flex-col max-h-80"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-2 text-[10px] border-b border-slate-800 bg-slate-900 shadow-inner">
                 <div className="flex gap-3">
                   <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"/>Hits: {stats.hits}</span>
                   <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"/>Misses: {stats.misses}</span>
                 </div>
                 <button 
                   onClick={() => setLogs([])}
                   className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
                 >
                   <RefreshCw size={10} /> Limpiar
                 </button>
              </div>
              
              <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar min-h-[150px]">
                {logs.length === 0 ? (
                  <div className="text-center text-slate-600 text-xs py-4 italic">
                    Sin actividad de cache aún...
                  </div>
                ) : (
                  logs.map((log) => (
                    <motion.div 
                      key={log.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[10px] flex items-start gap-2 group hover:bg-slate-800 p-1 rounded transition-colors"
                    >
                      <span className="text-slate-600">{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit', fractionalSecondDigits: 2 })}</span>
                      <span className={`px-1 py-0.5 rounded leading-none font-bold uppercase tracking-wider text-[8px] ${
                        log.event === 'hit' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                        log.event === 'miss' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                     }`}>
                        {log.event}
                      </span>
                      <span className="text-slate-400 break-all leading-tight group-hover:text-slate-200 transition-colors">
                        {log.key}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
