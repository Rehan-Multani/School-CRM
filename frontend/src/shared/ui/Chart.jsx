import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Canonical Chart widgets — byte-identical between teacher and parent.
const COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'];

export const BarChartWidget = ({ data, xKey, bars, height = 220, className }) => (
  <div className={className}>
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
        <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: 'var(--text-color)', opacity: 0.6 }} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--text-color)', opacity: 0.6 }} />
        <Tooltip
          contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, fontSize: 11 }}
        />
        {bars.map((bar, i) => (
          <Bar key={bar.key} dataKey={bar.key} fill={bar.color || COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} name={bar.label || bar.key} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export const LineChartWidget = ({ data, xKey, lines, height = 220, className }) => (
  <div className={className}>
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
        <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: 'var(--text-color)', opacity: 0.6 }} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--text-color)', opacity: 0.6 }} />
        <Tooltip
          contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, fontSize: 11 }}
        />
        {lines.map((line, i) => (
          <Line
            key={line.key}
            dataKey={line.key}
            stroke={line.color || COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name={line.label || line.key}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export const PieChartWidget = ({ data, height = 200, className }) => (
  <div className={className}>
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, fontSize: 11 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
      </PieChart>
    </ResponsiveContainer>
  </div>
);
