const ROOT_ID = 'fatal-error-root';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function showFatalErrorScreen(error, extra = {}) {
  if (typeof document === 'undefined') return;

  const message = error?.message || String(error || 'Unknown error');
  const stack = error?.stack || extra.componentStack || '';
  const source = extra.source || '';

  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }

  root.innerHTML = `
    <div style="
      position:fixed;inset:0;z-index:2147483647;
      background:#020617;color:#f8fafc;
      font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
      display:flex;flex-direction:column;padding:32px 28px;
      overflow:auto;
    ">
      <div style="max-width:960px;margin:0 auto;width:100%;">
        <p style="margin:0 0 8px;color:#fb7185;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">
          Application crashed
        </p>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;font-family:Inter,system-ui,sans-serif;">
          White screen error
        </h1>
        <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;font-family:Inter,system-ui,sans-serif;">
          App crash ho gayi hai. Inspect open karne ki zaroorat nahi — details neeche hain.
        </p>
        <pre style="
          margin:0 0 12px;white-space:pre-wrap;word-break:break-word;
          background:#0f172a;border:1px solid #334155;border-radius:12px;
          padding:16px;color:#fda4af;font-size:14px;line-height:1.5;
        ">${escapeHtml(message)}</pre>
        ${source ? `<p style="margin:0 0 12px;color:#64748b;font-size:12px;">${escapeHtml(source)}</p>` : ''}
        ${stack ? `<pre style="
          margin:0 0 24px;white-space:pre-wrap;word-break:break-word;
          background:#020617;border:1px solid #1e293b;border-radius:12px;
          padding:16px;color:#cbd5e1;font-size:12px;line-height:1.55;max-height:50vh;overflow:auto;
        ">${escapeHtml(stack)}</pre>` : ''}
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button id="fatal-reload" style="
            background:#4f46e5;color:#fff;border:0;border-radius:10px;
            padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;
            font-family:Inter,system-ui,sans-serif;
          ">Reload app</button>
          <button id="fatal-copy" style="
            background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:10px;
            padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;
            font-family:Inter,system-ui,sans-serif;
          ">Copy error</button>
        </div>
      </div>
    </div>
  `;

  root.querySelector('#fatal-reload')?.addEventListener('click', () => {
    window.location.reload();
  });

  root.querySelector('#fatal-copy')?.addEventListener('click', async () => {
    const text = [message, source, stack].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copy error', text);
    }
  });
}

export function installFatalErrorHandlers() {
  window.addEventListener('error', (event) => {
    if (!event.error) return;
    const from = event.filename || '';
    if (from.includes('@vite/client') || from.includes('node_modules/vite')) return;
    showFatalErrorScreen(event.error, {
      source: from ? `${from}:${event.lineno}:${event.colno}` : '',
    });
  });
}
