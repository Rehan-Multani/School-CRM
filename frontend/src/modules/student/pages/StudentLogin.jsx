import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { Card } from '../components/ui/Card';
import { GraduationCap, ArrowRight, ShieldAlert } from 'lucide-react';

export const StudentLogin = () => {
  const [studentId, setStudentId] = useState('STU108902');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const { login } = useStudentAuth();
  const navigate = useNavigate();

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
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3.5 bg-primary/10 rounded-2xl text-primary mb-3">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Welcome to School Management</h2>
          <p className="text-xs text-slate-500 mt-1.5">Sign in to access your student portal</p>
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
              className="w-full px-4 py-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs"
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
              className="w-full px-4 py-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-3 rounded-xl text-xs font-semibold shadow-premium transition-all duration-150 active:scale-95 select-none"
          >
            <span>Sign In</span>
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
          className="w-full border border-primary text-primary dark:border-primary/50 dark:text-primary py-2.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 select-none"
        >
          Quick Demo Login
        </button>
      </Card>
    </div>
  );
};
