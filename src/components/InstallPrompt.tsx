import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Smartphone, Share, X } from 'lucide-react';

export const InstallAppButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIOSDevice);

    if (!isIOSDevice) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handler);

      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }

      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIos) {
         alert("Para instalar en iOS, toca el botón de 'Compartir' en Safari y selecciona 'Agregar a inicio'.");
      } else {
         alert("Para tener la mejor experiencia en tu móvil o tablet, toca los 3 puntos ⋮ en tu navegador y selecciona 'Instalar aplicación' o 'Añadir a inicio'.");
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
       setIsStandalone(true);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="w-full sm:w-auto flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-widest hover:from-orange-600 hover:to-orange-700 transition-all shadow-xl shadow-orange-500/30 flex justify-center items-center gap-3 active:scale-95 group"
    >
      <Download size={20} className="group-hover:translate-y-1 transition-transform duration-300" />
      Instalar App
    </button>
  );
};
export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsIos(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    if (isIOSDevice) {
      setShowBanner(true);
    } else {
      // For android or others, we want to show banner anyway so they understand how to install if native prompt fails
      setShowBanner(true);
      
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handler);

      // Si ya está listo el prompt antes de que monte (a veces pasa intermitentemente)
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowBanner(false);
      setIsStandalone(true);
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
  };

  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
          className="mb-8"
        >
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-lg border border-orange-400 p-5 md:p-6 text-white relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            
            <button 
              onClick={() => setShowBanner(false)}
              className="absolute top-2 right-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors z-20"
            >
              <X size={18} />
            </button>

            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center justify-between mt-2">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 text-white rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/30">
                  <Smartphone size={28} />
                </div>
                
                <div>
                  <h3 className="font-black text-white text-lg md:text-xl tracking-tight leading-tight mb-1">
                    Lleva SeguritoApp en tu móvil
                  </h3>
                  <p className="text-orange-100 text-sm md:text-base font-medium max-w-xl">
                    {isIos ? (
                      <>Para instalar, toca el botón de <strong className="text-white">Compartir</strong> en Safari y selecciona <strong className="text-white">"Agregar a inicio"</strong>.</>
                    ) : (
                      <>Para la mejor experiencia, instala la aplicación tocando los <strong className="text-white">3 puntos ⋮</strong> de tu navegador y luego <strong className="text-white">Instalar aplicación</strong> o <strong className="text-white">Añadir a inicio</strong>.</>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="w-full md:w-auto shrink-0">
                {isIos ? (
                  <div className="flex items-center justify-center gap-3 bg-white/20 px-4 py-3 rounded-xl border border-white/30 backdrop-blur-sm w-full">
                    <Share size={20} className="text-white" />
                    <span className="text-sm text-white font-bold uppercase tracking-wider">Compartir &rarr; Agregar a inicio</span>
                  </div>
                ) : deferredPrompt ? (
                  <button
                    onClick={handleInstallClick}
                    className="w-full md:w-auto bg-white text-orange-600 hover:bg-orange-50 font-black py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-2 transition-all uppercase tracking-widest shadow-xl shadow-orange-900/20 active:scale-95"
                  >
                    <Download size={18} />
                    Instalar ahora
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-3 bg-white/20 px-4 py-3 rounded-xl border border-white/30 backdrop-blur-sm w-full">
                    <span className="text-xl">⋮</span>
                    <span className="text-sm text-white font-bold uppercase tracking-wider">Menú &rarr; Instalar</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
