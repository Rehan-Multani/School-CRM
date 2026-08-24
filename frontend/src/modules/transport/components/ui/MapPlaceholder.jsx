import React from 'react';
import { Map, MapPin } from 'lucide-react';
import { Badge } from './Badge';

export const MapPlaceholder = ({ lat = 23.0225, lng = 72.5714, name = "Center Point" }) => {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 relative flex flex-col justify-between">
      {/* Visual Simulation Block */}
      <div className="h-64 bg-slate-100 dark:bg-slate-900 relative flex items-center justify-center overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#0891b2_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
        
        {/* Map Vector Lines */}
        <svg className="absolute inset-0 h-full w-full opacity-30 text-cyan-600" xmlns="http://www.w3.org/2000/svg">
          <path d="M 0,100 L 400,200 L 800,100" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M 100,0 L 200,300 M 400,0 L 400,300 M 700,0 L 600,300" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
        </svg>

        {/* Selected location marker */}
        <div className="z-10 flex flex-col items-center gap-1.5 animate-bounce">
          <div className="p-2.5 bg-cyan-600 text-white rounded-full shadow-lg shadow-cyan-500/20">
            <MapPin className="h-6 w-6" />
          </div>
          <Badge variant="cyan" className="shadow-xs font-bold text-slate-900 dark:text-white bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs font-mono">
            {name}
          </Badge>
        </div>

        {/* Watermark GPS */}
        <div className="absolute bottom-3 right-3 text-4xs font-mono font-bold tracking-widest text-slate-450 uppercase select-none">
          GPS Coordinates: {lat}, {lng}
        </div>
      </div>
    </div>
  );
};
