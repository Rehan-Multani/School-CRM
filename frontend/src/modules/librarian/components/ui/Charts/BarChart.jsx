import React from 'react';
import { readAccentColor } from '../../../../../shared/theme/accent';
import { ResponsiveContainer, BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export const BarChart = ({ data, dataKey, xKey, height = 300, color = readAccentColor() }) => {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ width: '100%', height }}
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 text-xs font-semibold"
      >
        <span>No Result</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <RechartsBar data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis 
            dataKey={xKey} 
            stroke="#94a3b8" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              border: 'none', 
              borderRadius: '12px',
              color: '#fff',
              fontSize: '11px',
              fontFamily: 'sans-serif'
            }} 
          />
          <Bar 
            dataKey={dataKey} 
            fill={color} 
            radius={[6, 6, 0, 0]} 
          />
        </RechartsBar>
      </ResponsiveContainer>
    </div>
  );
};
export default BarChart;
