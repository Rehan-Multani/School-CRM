import React, { useEffect, useMemo, useState } from 'react';
import SearchableSelect from '../../../../shared/components/SearchableSelect';

const OTHER = '__other__';

// State -> City/District -> Village/Town, all-India. The list is loaded lazily
// (it is a few hundred KB) the first time a form that needs it opens.
let locationsPromise = null;
const loadLocations = () => {
  if (!locationsPromise) {
    locationsPromise = import('../../../../shared/data/indiaLocations.json').then((m) => m.default || m);
  }
  return locationsPromise;
};

// Keeps a saved value selectable even when it is not in the list.
const withCurrent = (options, current) =>
  current && !options.includes(current) ? [current, ...options] : options;

export function IndiaLocationFields({ value, onChange, inputClass, labelClass }) {
  const [data, setData] = useState(null);
  const [typingVillage, setTypingVillage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLocations().then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const states = useMemo(() => (data ? Object.keys(data) : []), [data]);
  const cities = useMemo(
    () => (data && value.state && data[value.state] ? Object.keys(data[value.state]) : []),
    [data, value.state]
  );
  const villages = useMemo(
    () => (data && value.state && value.city ? data[value.state]?.[value.city] || [] : []),
    [data, value.state, value.city]
  );

  const villageInList = villages.includes(value.village);
  const villageSelect = typingVillage || (value.village && !villageInList) ? OTHER : value.village || '';

  const stateOptions = withCurrent(states, value.state);
  const cityOptions = withCurrent(cities, value.city);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div>
        <label className={labelClass}>State</label>
        <SearchableSelect
          inputClass={inputClass}
          options={stateOptions}
          value={value.state || ''}
          placeholder={data ? 'Select state' : 'Loading...'}
          searchPlaceholder="Search state…"
          onChange={(v) => {
            setTypingVillage(false);
            onChange({ state: v, city: '', village: '' });
          }}
        />
      </div>
      <div>
        <label className={labelClass}>City / District</label>
        <SearchableSelect
          inputClass={inputClass}
          options={cityOptions}
          value={value.city || ''}
          disabled={!value.state}
          placeholder={value.state ? 'Select city / district' : 'Select state first'}
          searchPlaceholder="Search city / district…"
          onChange={(v) => {
            setTypingVillage(false);
            onChange({ city: v, village: '' });
          }}
        />
      </div>
      <div>
        <label className={labelClass}>Village / Town</label>
        <SearchableSelect
          inputClass={inputClass}
          options={villages}
          value={villageSelect === OTHER ? OTHER : value.village || ''}
          disabled={!value.city}
          placeholder={value.city ? 'Select village / town' : 'Select city first'}
          searchPlaceholder="Search village / town…"
          pinned={[{ value: OTHER, label: 'Other (type manually)' }]}
          onChange={(v) => {
            if (v === OTHER) {
              setTypingVillage(true);
              onChange({ village: '' });
            } else {
              setTypingVillage(false);
              onChange({ village: v });
            }
          }}
        />
        {villageSelect === OTHER && (
          <input
            className={`${inputClass} mt-2`}
            placeholder="Write village / town name"
            maxLength={80}
            value={value.village || ''}
            onChange={(e) => onChange({ village: e.target.value })}
          />
        )}
      </div>
    </div>
  );
}

export default IndiaLocationFields;
