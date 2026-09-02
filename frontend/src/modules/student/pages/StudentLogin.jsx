import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { Card } from '../components/ui/Card';
import { GraduationCap, ArrowRight, ShieldAlert, LayoutGrid } from 'lucide-react';

export const StudentLogin = () => {
  const [studentId, setStudentId] = useState('STU108902');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const { login } = useStudentAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Student Portal Login | School CRM';
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const res = login(studentId, password);
    if (res.success) {
      navigate('/student/dashboard');
    } else {
      setError(res.message);
    }
  };

  const handleQuickLogin = () => {
    const res = login('STU108902', 'password123');
    if (res.success) {
      navigate('/student/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md p-8 shadow-premium border border-border">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3.5 bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400 mb-3">
            <GraduationCap className="w-10 h-10" />
          </div>

          {/* Prominent Role Identifier Badge */}
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 shadow-sm">
            <GraduationCap className="h-3.5 w-3.5" />
            STUDENT PORTAL
          </span>

          <h2 className="text-xl font-black text-foreground">Student Portal Login</h2>
          <p className="text-xs text-slate-500 mt-1">Sign in with Student ID / Admission number</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-3.5 rounded-xl text-xs font-medium mb-6">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Student ID / Admission No
            </label>
            <input
              type="text"
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. STU108902"
              className="w-full px-4 py-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-xs font-semibold shadow-premium transition-all duration-150 active:scale-95 select-none"
          >
            <span>Sign In to Student Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <button
          onClick={handleQuickLogin}
          className="w-full border border-blue-500/50 text-blue-600 dark:text-blue-400 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 select-none hover:bg-blue-500/5"
        >
          🚀 Quick Demo Login
        </button>

        <div className="mt-6 flex flex-col items-center gap-1.5 text-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Looking for another panel?</span>
            <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              <LayoutGrid className="w-3 h-3" /> All 6+ Web Panels & Portals →
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};
