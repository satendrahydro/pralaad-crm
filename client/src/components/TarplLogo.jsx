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
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="bg-white rounded-lg p-1 shadow-sm border border-amber-300/60 shrink-0 flex items-center justify-center">
        <img 
          src={tarplLogoImg} 
          alt="Taranganjali Private Limited" 
          className="object-contain"
          style={{ height: 32, width: 44 }}
        />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex flex-col">
            <span className="font-black text-xs sm:text-sm tracking-wider text-[#FBBF24] font-sans uppercase">
              TARANGANJALI
            </span>
            <span className="font-bold text-[9px] sm:text-[10px] tracking-wider text-amber-200 font-sans uppercase">
              PRIVATE LIMITED
            </span>
          </div>
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/40">
            CRM
          </span>
        </div>
        {showSubtitle && (
          <div className="text-[10px] font-medium text-emerald-200/90 truncate tracking-wide mt-0.5">
            जीत आपके विश्वास की
          </div>
        )}
      </div>
    </div>
  );
}
