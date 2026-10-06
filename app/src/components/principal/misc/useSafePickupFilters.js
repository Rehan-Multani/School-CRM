import { useMemo } from 'react';
import { principalMiscApi } from '../../../api/principal/misc';
import { useAsync } from '../../../lib/useAsync';

// Reference data for the safe-pickup filters (GET /principal/safe-pickup/settings):
// `{ schoolEnabled, classes: [{ id, name, sections, academicYearIds }], academicYears }`.
export function useSafePickupSettings() {
  return useAsync(() => principalMiscApi.safePickupSettings().then((r) => r?.data || r || {}), [], { refetchOnFocus: true });
}

// Academic year -> class -> section cascade, as option lists for <Select>.
export function useCascade(settings, academicYearId, classId) {
  return useMemo(() => {
    const classes = settings?.classes || [];
    const years = settings?.academicYears || [];
    const visible = academicYearId ? classes.filter((c) => (c.academicYearIds || []).includes(academicYearId)) : classes;
    const pool = classId ? visible.filter((c) => c.id === classId) : visible;
    const sections = [...new Map(pool.flatMap((c) => c.sections || []).map((s) => [s.id, s])).values()].sort((a, b) => a.name.localeCompare(b.name));
    return {
      yearOptions: [{ value: '', label: 'All years' }, ...years.map((y) => ({ value: y.id, label: `${y.name}${y.isCurrent ? ' (Current)' : ''}` }))],
      classOptions: [{ value: '', label: 'All classes' }, ...visible.map((c) => ({ value: c.id, label: c.name }))],
      sectionOptions: [{ value: '', label: 'All sections' }, ...sections.map((s) => ({ value: s.id, label: s.name }))],
    };
  }, [settings, academicYearId, classId]);
}
