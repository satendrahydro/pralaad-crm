import React from 'react';
import tarplLogoImg from '../assets/tarpl_logo.jpg';

/**
 * TARPL ORGANIC FOODS — Official Brand Logo Component
 * Uses the exact client-provided original logo image:
 * Golden tree of hands & flourishing leaves on dark forest green.
 */
export default function TarplLogo({ size = 38, variant = 'full', className = '', showSubtitle = true }) {
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
        <img 
          src={tarplLogoImg} 
          alt="TARPL Logo" 
          className="rounded-xl object-cover shadow-sm ring-1 ring-[#D4AF37]/50"
          style={{ width: size, height: size }}
        />
      </div>
    );
  }

  if (variant === 'badge' || variant === 'full-image') {
    return (
      <div className={`inline-flex flex-col items-center ${className}`}>
        <img 
          src={tarplLogoImg} 
          alt="TARPL ORGANIC FOODS" 
          className="rounded-2xl shadow-lg ring-1 ring-[#D4AF37]/60 object-contain"
          style={{ width: size, height: size }}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img 
        src={tarplLogoImg} 
        alt="TARPL" 
        className="rounded-xl object-cover shadow-sm ring-1 ring-[#D4AF37]/50 shrink-0"
        style={{ width: size, height: size }}
      />
      <div className="min-w-0 leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-sm tracking-wider text-[#FBBF24] uppercase font-sans">
            TARPL
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#FDE68A] border border-[#D4AF37]/40 tracking-wider">
            CRM
          </span>
        </div>
        {showSubtitle && (
          <div className="text-[10px] font-semibold text-emerald-300/80 truncate uppercase tracking-tight">
            ORGANIC FOODS • WEALTH
          </div>
        )}
      </div>
    </div>
  );
}
