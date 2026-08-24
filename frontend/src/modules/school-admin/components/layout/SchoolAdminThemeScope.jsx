import React, { useMemo } from 'react';
import { useSchoolAdminTheme } from '../../context/SchoolAdminThemeContext';
import { accentCssVars } from '../../utils/themeColors';

export function SchoolAdminThemeScope({ children, className = '' }) {
  const { primaryColor } = useSchoolAdminTheme();
  const style = useMemo(() => accentCssVars(primaryColor), [primaryColor]);

  return (
    <div className={`school-admin-theme ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
