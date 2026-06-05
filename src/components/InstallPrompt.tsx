import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone } from 'lucide-react';

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the install banner after a short delay
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowBanner(false);
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // We can't use the prompt again, discard it
    setDeferredPrompt(null);
  };

  const handleClose = () => {
    setShowBanner(false);
  };

  if (isStandalone || !deferredPrompt) return null;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[9999]"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 md:p-5 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
            
            <button 
              onClick={handleClose}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex gap-4 items-start pr-6">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                <Smartphone size={24} />
              </div>
              
              <div className="flex-1">
                <h3 className="font-black text-slate-800 text-sm md:text-base leading-tight mb-1">
                  Instala SeguritoApp
                </h3>
                <p className="text-xs text-slate-500 font-medium mb-3 leading-relaxed">
                  Para una experiencia más rápida y acceso directo desde el escritorio o pantalla de inicio de tu móvil.
                </p>
                
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors uppercase tracking-widest"
                >
                  <Download size={16} />
                  Instalar Aplicación
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
