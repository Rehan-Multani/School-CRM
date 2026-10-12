import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { apiClient } from '../../../shared/api/client';

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}

/** Public page behind the certificate QR code: confirms a certificate is genuine. */
export const VerifyCertificatePage = () => {
  const { code } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get(`/platform/certificates/verify/${encodeURIComponent(code || '')}`)
      .then((res) => !cancelled && setState({ loading: false, data: res.data?.data, error: '' }))
      .catch((err) =>
        !cancelled &&
        setState({
          loading: false,
          data: null,
          error: err.response?.status === 404 ? 'No certificate matches this code.' : 'Unable to verify right now. Please try again.',
        })
      );
    return () => {
      cancelled = true;
    };
  }, [code]);

  const { loading, data, error } = state;
  const valid = data?.valid;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Certificate verification</p>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
          </div>
        ) : error ? (
          <div className="space-y-2 py-6 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-rose-500" />
            <h1 className="text-lg font-bold text-slate-900">Not verified</h1>
            <p className="text-sm text-slate-500">{error}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 pb-4 text-center">
              {valid ? (
                <BadgeCheck className="mx-auto h-14 w-14 text-emerald-500" />
              ) : (
                <ShieldAlert className="mx-auto h-14 w-14 text-rose-500" />
              )}
              <h1 className={`text-xl font-bold ${valid ? 'text-emerald-700' : 'text-rose-700'}`}>
                {valid ? 'Genuine certificate' : data.status === 'REVOKED' ? 'Certificate revoked' : 'Certificate expired'}
              </h1>
              {!valid && (
                <p className="text-sm text-slate-500">This certificate is no longer valid.</p>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-1">
              <Row label="Certificate" value={data.title} />
              <Row label="Awarded to" value={data.recipientName} />
              <Row label="For" value={data.courseName} />
              <Row label="Issued by" value={data.schoolName} />
              <Row label="Certificate no" value={data.certificateNumber} />
              <Row label="Date of issue" value={formatDate(data.issueDate)} />
              <Row label="Valid until" value={formatDate(data.validUntil)} />
              <Row label="Signed by" value={[data.signatoryName, data.designation].filter(Boolean).join(', ')} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyCertificatePage;
