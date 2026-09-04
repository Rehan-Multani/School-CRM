import React from 'react';
import { readAccentColor } from '../../../../../shared/theme/accent';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export const PieChart = ({ data, nameKey, valueKey, height = 300 }) => {
  const COLORS = [readAccentColor(), '#f43f5e', '#eab308', '#10b981', '#a855f7'];
  const validData = Array.isArray(data) ? data.filter((item) => Number(item?.[valueKey] || 0) > 0) : [];

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
        <RechartsPieChart>
          <Pie
            data={validData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey={valueKey}
            nameKey={nameKey}
          >
            {validData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '12px'
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};
