import React from "react";
import { motion } from "motion/react";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";

interface PaymentStatusModalProps {
  status: "success" | "pending" | "failed" | null;
  onClose: () => void;
}

export const PaymentStatusModal: React.FC<PaymentStatusModalProps> = ({ status, onClose }) => {
  if (!status || status === "pending") return null;

  const isSuccess = status === "success";

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
        <div className={`absolute top-0 left-0 w-full h-1 ${isSuccess ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`} />
        
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-lg relative ${isSuccess ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
          {isSuccess ? <CheckCircle size={32} /> : <XCircle size={32} />}
        </div>
        
        <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight">
          {isSuccess ? "¡Suscripción Activada!" : "Pago Fallido"}
        </h3>
        
        <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
          {isSuccess 
            ? "Tu pago se procesó correctamente. Ya puedes disfrutar de todas las funcionalidades de tu nuevo plan." 
            : "No pudimos procesar tu pago. Por favor intenta nuevamente con otro medio de pago."}
        </p>
        
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onClose}
            className={`w-full px-6 py-4 rounded-xl font-black text-white transition-all shadow-lg flex items-center justify-center gap-2 group ${isSuccess ? 'bg-green-500 hover:bg-green-600 hover:shadow-green-500/25' : 'bg-slate-900 hover:bg-red-500 hover:shadow-red-500/25'}`}
          >
            {isSuccess ? "Empezar a usar" : "Cerrar y reintentar"} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
