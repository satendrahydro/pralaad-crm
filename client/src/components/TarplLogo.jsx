import React from 'react';
import tarplLogoImg from '../assets/tarpl_logo.png';
import tarplLogoTrans from '../assets/tarpl_logo_transparent.png';

/**
 * TARANG ANJALI REAL TECH PVT. LTD. (TARPL)
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
          alt="TARPL" 
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
          alt="Tarang Anjali Real Tech Pvt. Ltd. - जीत आपके विश्वास की" 
          className="object-contain"
          style={{ width: Math.round(size * 1.69), height: size }}
        />
      </div>
    );
  }

  // Full brand header in Sidebar & Navigation
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="bg-white rounded-xl p-1 shadow-sm border border-amber-300/50 shrink-0 flex items-center justify-center">
        <img 
          src={tarplLogoImg} 
          alt="TARPL" 
          className="object-contain"
          style={{ height: Math.max(32, size), width: Math.round(Math.max(32, size) * 1.69) }}
        />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-sm tracking-wide text-amber-300 font-sans uppercase">
            TARANGANJALI
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/40 tracking-wider">
            CRM
          </span>
        </div>
        {showSubtitle && (
          <div className="text-[10px] font-medium text-emerald-200/90 truncate tracking-tight">
            जीत आपके विश्वास की
          </div>
        )}
      </div>
    </div>
  );
}
