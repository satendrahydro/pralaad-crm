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
  // If darkBg is true or default full in dark sidebar, provide clean contrast
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 bg-white rounded-lg p-1 shadow-sm border border-emerald-900/20 ${className}`}>
        <img 
          src={tarplLogoImg} 
          alt="TARPL Logo" 
          className="object-contain"
          style={{ width: size, height: Math.round(size * 0.56) }}
        />
      </div>
    );
  }

  if (variant === 'badge' || variant === 'full-image') {
    return (
      <div className={`inline-flex flex-col items-center bg-white rounded-xl p-2.5 shadow-md border border-slate-200 ${className}`}>
        <img 
          src={tarplLogoImg} 
          alt="Tarang Anjali Real Tech Pvt. Ltd." 
          className="object-contain"
          style={{ width: size * 1.77, height: size }}
        />
      </div>
    );
  }

  // Full brand header: Clean crisp official logo badge + company branding text
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="bg-white rounded-lg px-1.5 py-1 shadow-sm border border-amber-300/40 shrink-0 flex items-center justify-center">
        <img 
          src={tarplLogoImg} 
          alt="TARPL" 
          className="object-contain"
          style={{ height: Math.max(28, size), width: Math.round(Math.max(28, size) * 1.77) }}
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
            Tarang Anjali Real Tech Pvt. Ltd.
          </div>
        )}
      </div>
    </div>
  );
}
