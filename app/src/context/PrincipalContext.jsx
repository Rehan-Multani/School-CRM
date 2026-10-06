import { createContext, useContext, useMemo } from 'react';

// Principal-wide state. Reserved for cross-screen values (the dashboard summary
// is read per screen); kept so every role flow has the same provider shape.
const PrincipalContext = createContext({});

export function PrincipalProvider({ children }) {
  const value = useMemo(() => ({}), []);
  return <PrincipalContext.Provider value={value}>{children}</PrincipalContext.Provider>;
}

export const usePrincipal = () => useContext(PrincipalContext);
