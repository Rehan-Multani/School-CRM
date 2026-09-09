import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Card } from '../ui/Button';

export const AnalyticsCharts = ({ revenueData, growthData, loading }) => {
  const hasRevenueData = Array.isArray(revenueData) && revenueData.length > 0;
  const hasGrowthData = Array.isArray(growthData) && growthData.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue Area Chart */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Revenue Trend</h3>
          {loading && (
            <div className="h-4 w-16 rounded-md bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
          )}
        </div>
        <div className="h-72 w-full">
          {loading ? (
            <div className="h-full w-full flex flex-col justify-between py-2">
              <div className="flex items-end justify-between gap-3 h-52 px-3 pt-6">
                {[30, 48, 40, 68, 55, 82, 70, 92, 80, 95].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full rounded-t-xl bg-indigo-500/20 dark:bg-indigo-500/15 animate-pulse"
                      style={{ height: `${val}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between px-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((m, i) => (
                  <div key={i} className="h-2.5 w-6 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
                ))}
              </div>
            </div>
          ) : !hasRevenueData ? (
            <div className="h-full w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 text-xs font-semibold">
              <span>No revenue data recorded yet</span>
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">SaaS Expansion (Growth)</h3>
          {loading && (
            <div className="h-4 w-16 rounded-md bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
          )}
        </div>
        <div className="h-72 w-full">
          {loading ? (
            <div className="h-full w-full flex flex-col justify-between py-2">
              <div className="flex items-end justify-between gap-4 h-52 px-3 pt-6">
                {[45, 65, 30, 80, 50, 75, 90, 60].map((val, idx) => (
                  <div key={idx} className="flex-1 flex items-end justify-center gap-1.5 h-full">
                    <div
                      className="w-1/2 rounded-t-lg bg-indigo-500/25 dark:bg-indigo-500/20 animate-pulse"
                      style={{ height: `${val}%` }}
                    />
                    <div
                      className="w-1/2 rounded-t-lg bg-emerald-500/25 dark:bg-emerald-500/20 animate-pulse"
                      style={{ height: `${Math.max(20, val - 15)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between px-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map((m, i) => (
                  <div key={i} className="h-2.5 w-6 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
                ))}
              </div>
            </div>
          ) : !hasGrowthData ? (
            <div className="h-full w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 text-xs font-semibold">
              <span>No growth data recorded yet</span>
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
