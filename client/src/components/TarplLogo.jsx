import React from 'react';
import tarplLogoImg from '../assets/tarpl_logo.png';
import tarplLogoTrans from '../assets/tarpl_logo_transparent.png';

/**
 * TARANGANJALI PRIVATE LIMITED (TARPL)
 * Official Brand Logo Component
 * Slogan: जीत आपके विश्वास की
 */
export default function TarplLogo({ 
  size = 40, 
  variant = 'full', 
  className = '', 
  showSubtitle = true,
  darkBg = false 
}) {
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 bg-white rounded-lg p-1 shadow-xs border border-slate-200 ${className}`}>
        <img 
          src={tarplLogoImg} 
          alt="Taranganjali Private Limited" 
          className="object-contain"
          style={{ width: size, height: Math.round(size / 1.69) }}
        />
      </div>
    );
  }

  if (variant === 'badge' || variant === 'full-image') {
    return (
      <div className={`inline-flex flex-col items-center bg-white rounded-2xl p-3 shadow-md border border-slate-200/80 ${className}`}>
        <img 
          src={tarplLogoImg} 
          alt="Taranganjali Private Limited - जीत आपके विश्वास की" 
          className="object-contain"
          style={{ width: Math.round(size * 1.69), height: size }}
        />
        <div className="mt-2 text-center">
          <div className="text-xs sm:text-sm font-black text-[#062319] tracking-wider uppercase">
            TARANGANJALI PRIVATE LIMITED
          </div>
          {showSubtitle && (
            <div className="text-[10px] font-bold text-[#0A5C36] mt-0.5">
              जीत आपके विश्वास की
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full brand header in Sidebar & Navigation
  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      <div className="bg-white rounded-xl p-1.5 shadow-md border border-amber-300/80 shrink-0 flex items-center justify-center">
        <img 
          src={tarplLogoImg} 
          alt="Taranganjali Private Limited" 
          className="object-contain"
          style={{ height: 36, width: 48 }}
        />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-sm tracking-wide text-[#FBBF24] font-sans uppercase whitespace-nowrap shrink-0">
            TARANGANJALI
          </span>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-400/25 text-amber-200 border border-amber-400/50 shrink-0">
            CRM
          </span>
        </div>
        <div className="text-[11px] font-bold text-amber-100 tracking-wider uppercase whitespace-nowrap mt-0.5">
          PRIVATE LIMITED
        </div>
        {showSubtitle && (
          <div className="text-[10px] font-medium text-emerald-300/90 whitespace-nowrap tracking-wide mt-0.5">
            जीत आपके विश्वास की
          </div>
        )}
      </div>
    </div>
  );
}
