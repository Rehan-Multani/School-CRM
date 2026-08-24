import React from 'react';
import { MapPin, Clock } from 'lucide-react';
import { Badge } from './Badge';

export const RouteStopsTimeline = ({ stops = [], pickupPoints = [] }) => {
  if (!stops.length) {
    return (
      <div className="text-center py-6 text-slate-400 text-xs">
        No stops mapped to this route.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 border-l-2 border-dashed border-cyan-300 dark:border-cyan-800 ml-4 py-2 text-xs">
      {stops.map((stop, idx) => {
        // Find matching pickup point info
        const pkp = pickupPoints.find(p => p.name === stop);

        return (
          <div key={stop} className="relative group">
            {/* Timeline Dot Indicator */}
            <div className="absolute -left-9.5 top-0.5 bg-white dark:bg-slate-900 border-2 border-cyan-500 rounded-full h-6 w-6 flex items-center justify-center text-3xs font-extrabold text-cyan-600 dark:text-cyan-400 shadow-xs">
              {idx + 1}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">{stop}</span>
                {pkp && (
                  <Badge variant="cyan" className="text-4xs">
                    {pkp.pickupTime} AM Pick / {pkp.dropTime} PM Drop
                  </Badge>
                )}
              </div>
              
              {pkp && (
                <div className="flex gap-4 text-3xs text-slate-500 mt-1 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-cyan-500" />
                    <span>GPS: {pkp.gpsLat}, {pkp.gpsLng}</span>
                  </span>
                  <span>•</span>
                  <span>{pkp.studentsAssigned} Students Assigned</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
