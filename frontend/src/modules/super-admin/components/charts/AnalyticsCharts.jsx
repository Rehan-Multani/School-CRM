import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Card } from '../ui/Button';

export const AnalyticsCharts = ({ revenueData, growthData }) => {
  const hasRevenueData = Array.isArray(revenueData) && revenueData.length > 0;
  const hasGrowthData = Array.isArray(growthData) && growthData.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue Area Chart */}
      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Revenue Trend</h3>
        <div className="h-72 w-full">
          {!hasRevenueData ? (
            <div className="h-full w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 text-slate-400 text-xs font-semibold">
              <span>No Result</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${Number(v || 0).toLocaleString('en-IN')}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                  formatter={(value) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Collected']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* School Growth Bar Chart */}
      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">SaaS Expansion (Growth)</h3>
        <div className="h-72 w-full">
          {!hasGrowthData ? (
            <div className="h-full w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 text-slate-400 text-xs font-semibold">
              <span>No Result</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                <Legend />
                <Bar dataKey="schools" name="New Schools" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="invoices" name="Paid Invoices" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};
