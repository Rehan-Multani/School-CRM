import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Card, Button, Badge, cn } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { platformAppConfigApi } from '../../../../shared/api/client';

/**
 * Notifications → Force logout. Ends every mobile-app session of the chosen
 * roles — in one school or all of them — pushes a notification to those
 * phones, and shows them the message on a popup. Web panels are not affected.
 */

const ROLES = [
  { id: 'TEACHER', label: 'Teachers' },
  { id: 'STUDENT', label: 'Students' },
  { id: 'PARENT', label: 'Parents' },
  { id: 'TRANSPORT', label: 'Transport managers' },
];
const roleLabel = (id) => ROLES.find((r) => r.id === id)?.label || id;

export function ForceLogoutCard({ schools, notify }) {
  const [schoolId, setSchoolId] = useState(''); // '' = every school
  const [roles, setRoles] = useState([]);
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);

  const loadHistory = () =>
    platformAppConfigApi
      .forceLogoutHistory()
      .then((res) => setHistory(res.data || []))
      .catch(() => {});

  useEffect(() => {
    loadHistory();
  }, []);

  const everyone = roles.length === ROLES.length;
  const toggle = (id) => {
    setConfirming(false);
    setRoles((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };
  const toggleAll = () => {
    setConfirming(false);
    setRoles(everyone ? [] : ROLES.map((r) => r.id));
  };

  const who = everyone ? 'everyone' : roles.map((r) => roleLabel(r).toLowerCase()).join(', ');
  const where = schoolId ? schools.find((s) => s.id === schoolId)?.name || 'the selected school' : 'ALL schools';

  const submit = async () => {
    setBusy(true);
    try {
      const res = await platformAppConfigApi.forceLogout({ roles, schoolId: schoolId || null, message: message.trim() });
      const total = Object.values(res.data?.affected || {}).reduce((n, v) => n + v, 0);
      notify('success', `${res.message}. ${total} account(s) signed out, ${res.data?.devicesNotified || 0} device(s) notified.`);
      setConfirming(false);
      setRoles([]);
      setMessage('');
      loadHistory();
    } catch (err) {
      notify('error', err.response?.data?.message || err.message || 'Unable to force logout.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-5">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <LogOut size={16} className="text-rose-500" />
          Force logout (mobile app)
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Signs the chosen app users out on every phone. They get a notification and a popup with your message, and must
          sign in again. Web panels are not affected.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-2">
          <Select
            label="School"
            value={schoolId}
            onChange={(event) => {
              setSchoolId(event.target.value);
              setConfirming(false);
            }}
          >
            <option value="">All schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </Select>

          <div className="space-y-2">
            <p className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Who to sign out</p>
            <div className="flex flex-wrap gap-2">
              <Chip active={everyone} onClick={toggleAll}>
                Everyone
              </Chip>
              {ROLES.map((r) => (
                <Chip key={r.id} active={roles.includes(r.id)} onClick={() => toggle(r.id)}>
                  {r.label}
                </Chip>
              ))}
            </div>
          </div>

          <Input
            label="Message on the popup (optional)"
            maxLength={300}
            placeholder="You have been signed out by the administrator. Please sign in again."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />

          {confirming ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                Sign out {who} in {where}?
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" disabled={busy} onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" className="flex-1 gap-2" disabled={busy} onClick={submit}>
                  <LogOut size={16} />
                  {busy ? 'Signing out…' : 'Yes, sign out'}
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="destructive" className="w-full gap-2" disabled={!roles.length} onClick={() => setConfirming(true)}>
              <LogOut size={16} />
              Force logout
            </Button>
          )}
        </div>

        <div className="xl:col-span-3">
          <p className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Recent force logouts</p>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Nobody has been force-logged out yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.slice(0, 8).map((row) => (
                <div key={row.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{row.roles.map(roleLabel).join(', ')}</p>
                    <Badge variant={row.schoolId ? 'default' : 'warning'}>{row.schoolName || 'All schools'}</Badge>                  </div>
                  {row.message ? <p className="text-sm text-slate-600 dark:text-slate-300">{row.message}</p> : null}
                  <p className="text-xs text-slate-400">
                    {new Date(row.createdAt).toLocaleString()} · {Object.values(row.affected || {}).reduce((n, v) => n + v, 0)} account(s)
                    {' · '}
                    {row.devicesNotified} device(s) notified
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
        active
          ? 'border-indigo-600 bg-indigo-600 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
      )}
    >
      {children}
    </button>
  );
}
