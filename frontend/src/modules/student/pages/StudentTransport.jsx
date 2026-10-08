import React from 'react';
import { Card } from '../components/ui/Card';
import { Bus, Smartphone } from 'lucide-react';

export const StudentTransport = () => {
  return (
    <div className="space-y-6">
      <Card className="p-10 flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-primary/10 rounded-full text-primary mb-4">
          <Bus className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Transport details are available in the Student mobile app</h3>
        <p className="text-[11px] text-slate-500 max-w-sm mt-2 leading-relaxed">
          Your assigned bus route, stops, pickup and drop timings and the daily pickup/drop status are shown in the
          Student app. Please open the app to view them.
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <Smartphone className="w-3.5 h-3.5" />
          <span>Student mobile app</span>
        </div>
      </Card>
    </div>
  );
};
