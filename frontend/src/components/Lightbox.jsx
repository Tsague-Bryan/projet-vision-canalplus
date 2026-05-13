import React, { useEffect } from 'react';

const Lightbox = ({ src, onClose }) => {
  // Fermer avec la touche Échap
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!src) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 transition-all"
      onClick={onClose}
    >
      <div className="relative max-w-5xl w-full flex flex-col items-center">
        {/* Bouton de fermeture (Croix) */}
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors p-2"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Conteneur de l'image */}
        <div 
          className="bg-white p-1 rounded-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <img 
            src={src} 
            alt="Capture de transaction" 
            className="max-h-[85vh] max-w-full object-contain cursor-zoom-out"
            onClick={onClose}
          />
        </div>
        
        <p className="text-white/50 text-xs mt-4 font-medium uppercase tracking-widest">Cliquer n'importe où pour fermer</p>
      </div>
    </div>
  );
};

export default Lightbox;