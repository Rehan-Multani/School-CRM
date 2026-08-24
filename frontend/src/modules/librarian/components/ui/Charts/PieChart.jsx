import React from 'react';
import { ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Tooltip, Legend } from 'recharts';

export const PieChart = ({ data, dataKey, nameKey, height = 300, colors = ["#4f46e5", "#f43f5e", "#eab308", "#10b981", "#a855f7"] }) => {
  const validData = Array.isArray(data) ? data.filter((item) => Number(item?.[dataKey] || 0) > 0) : [];

  if (!validData || validData.length === 0) {
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
        <RechartsPie>
          <Pie
            data={validData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={4}
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {validData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
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
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '10px', color: '#64748b' }}
          />
        </RechartsPie>
      </ResponsiveContainer>
    </div>
  );
};
export default PieChart;
