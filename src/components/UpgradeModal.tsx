import React from "react";
import { motion } from "motion/react";
import { Lock, Crown, ChevronRight } from "lucide-react";

interface UpgradeModalProps {
  onClose: () => void;
  onUpgrade: () => void;
  limit: number;
  current: number;
  type: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  onClose,
  onUpgrade,
  limit,
  current,
  type,
}) => {
  const translations: any = {
    client: "Empresas/clientes",
    worker: "Trabajadores",
    pdf: "PDFs diarios",
  };
  const typeText = translations[type] || type;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2rem] p-8 max-w-sm w-full relative z-10 shadow-2xl border border-slate-100 flex flex-col items-center text-center overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500" />
        
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-6 border-4 border-white shadow-lg relative">
          <Lock size={32} />
          <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1 border-2 border-white">
            <Crown size={12} className="text-white" />
          </div>
        </div>
        
        <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight">
          Límite Alcanzado
        </h3>
        
        <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
          Has alcanzado el límite de <strong className="text-slate-800 font-black">{limit} {typeText}</strong> en tu plan actual. Para seguir creciendo, mejora tu plan.
        </p>

        <div className="w-full bg-slate-50 rounded-xl p-4 mb-8 flex items-center justify-between border border-slate-100">
           <span className="text-xs font-black text-slate-500 uppercase">Uso Actual</span>
           <span className="text-sm font-black text-slate-900">{current} / {limit}</span>
        </div>
        
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onUpgrade}
            className="w-full px-6 py-4 rounded-xl font-black text-white bg-slate-900 hover:bg-orange-500 transition-all shadow-lg hover:shadow-orange-500/25 flex items-center justify-center gap-2 group"
          >
            Ver Planes <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={onClose}
            className="w-full px-6 py-4 rounded-xl font-black text-slate-500 bg-white hover:bg-slate-50 transition-all text-xs uppercase tracking-widest border border-slate-200"
          >
            Cerrar para Eliminar Datos
          </button>
        </div>
      </motion.div>
    </div>
  );
};
