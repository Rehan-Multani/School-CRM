import { INITIAL_DATA } from './initialData';

const STORE_KEY = 'school_master_store_v2';
const EVENT_NAME = 'school_store_update';

// Get current state from localStorage or initialize with seed data
export const getMasterStore = () => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      localStorage.setItem(STORE_KEY, JSON.stringify(INITIAL_DATA));
      return INITIAL_DATA;
    }
    const parsed = JSON.parse(raw);
    // Ensure all top-level keys from INITIAL_DATA exist
    let mutated = false;
    Object.keys(INITIAL_DATA).forEach(k => {
      if (parsed[k] === undefined) {
        parsed[k] = INITIAL_DATA[k];
        mutated = true;
      }
    });

    // Ensure all seed users from INITIAL_DATA exist in auth.users
    if (parsed.auth && Array.isArray(parsed.auth.users)) {
      INITIAL_DATA.auth.users.forEach(initialUser => {
        const exists = parsed.auth.users.some(
          u => u.email?.toLowerCase() === initialUser.email?.toLowerCase() ||
               u.username?.toLowerCase() === initialUser.username?.toLowerCase()
        );
        if (!exists) {
          parsed.auth.users.push(initialUser);
          mutated = true;
        }
      });
    }

    if (mutated) {
      localStorage.setItem(STORE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch (err) {
    console.error('Failed to parse master store from localStorage, re-initializing:', err);
    localStorage.setItem(STORE_KEY, JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  }
};

// Save updated state and notify all listeners across components and tabs
export const saveMasterStore = (nextState, actionType = 'UNKNOWN', actionDetails = {}) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(nextState));
    
    // Broadcast custom event in current window
    window.dispatchEvent(new CustomEvent(EVENT_NAME, {
      detail: { actionType, actionDetails, timestamp: Date.now() }
    }));

    // Broadcast standard storage event for other open tabs
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Failed to save master store to localStorage:', err);
  }
};

// Helper to log actions directly into the audit slice
export const logAudit = (user, role, action, details) => {
  const store = getMasterStore();
  const newLog = {
    id: `AUD-${Date.now().toString().slice(-4)}`,
    user: user || 'system',
    role: role || 'System',
    action: action || 'DATA_MUTATION',
    details: typeof details === 'string' ? details : JSON.stringify(details),
    timestamp: new Date().toISOString(),
    ip: '192.168.1.10'
  };
  const updatedLogs = [newLog, ...(store.auditLogs || [])].slice(0, 100);
  store.auditLogs = updatedLogs;
  saveMasterStore(store, 'AUDIT_LOG_APPENDED', { action, user });
};

// Reset entire store to initial seed data
export const resetMasterStore = () => {
  localStorage.setItem(STORE_KEY, JSON.stringify(INITIAL_DATA));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, {
    detail: { actionType: 'STORE_RESET', timestamp: Date.now() }
  }));
  window.dispatchEvent(new Event('storage'));
  return INITIAL_DATA;
};
