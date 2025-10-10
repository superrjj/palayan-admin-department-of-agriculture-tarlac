import React, { useEffect, useState } from 'react';
import { X, CheckCircle, Info } from 'lucide-react';
import { useRiceEnums } from '../../hooks/useRiceEnums';

const AddRiceVarietyModal = ({ onClose, onSave, varietyData = null }) => {
  const { seasons, plantingMethods, environments, yearReleases } = useRiceEnums();
  const enumsLoading = !seasons.length && !plantingMethods.length && !environments.length && !yearReleases.length;

  const [form, setForm] = useState({
    varietyName: '',
    releaseName: '',
    yearRelease: '',
    breedingCode: '',
    breederOrigin: '',
    maturityDays: '',
    averageYield: '',
    maxYield: '',
    plantHeight: '',
    tillers: '',
    location: '',
    season: [],
    plantingMethod: '',
    environment: [],
    recommendedInTarlac: false,
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [result, setResult] = useState({ title: '', message: '', ok: true });

  // Prefill that runs EVERY TIME varietyData changes, without stealing focus:
  // - If record id changed => overwrite all (reset touched)
  // - If same record => merge only fields that are NOT touched
  const getRecordId = (v) => v?.id ?? v?.documentId ?? v?.rice_seed_id ?? null;
  const [currentRecordId, setCurrentRecordId] = useState(null);

  useEffect(() => {
    if (!varietyData) return;
    const incomingId = getRecordId(varietyData);

    setForm((prev) => {
      // Different record: overwrite everything and reset touched
      if (incomingId && incomingId !== currentRecordId) {
        setTouched({});
        setCurrentRecordId(incomingId);
        const next = { ...prev, ...varietyData };
        return next;
      }

      // Same record: only update fields that user hasn't touched yet
      const next = { ...prev };
      let changed = false;
      Object.keys(varietyData).forEach((k) => {
        if (k in prev && !touched[k]) {
          if (prev[k] !== varietyData[k]) {
            next[k] = varietyData[k];
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [varietyData, currentRecordId, touched]);

  const markTouched = (name) => setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true }));

  // PURE VALIDATION: do not sanitize; keep raw value; show errors live
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox' && name === 'season') {
      setForm((prev) => {
        const set = new Set(prev.season);
        checked ? set.add(value) : set.delete(value);
        return { ...prev, season: Array.from(set) };
      });
      markTouched('season');
      return;
    }

    if (type === 'checkbox' && name === 'environment') {
      setForm((prev) => {
        const set = new Set(prev.environment);
        checked ? set.add(value) : set.delete(value);
        return { ...prev, environment: Array.from(set) };
      });
      markTouched('environment');
      return;
    }

    if (type === 'checkbox' && name === 'recommendedInTarlac') {
      setForm((prev) => ({ ...prev, recommendedInTarlac: checked }));
      markTouched('recommendedInTarlac');
      return;
    }

    setForm((prev) => (prev[name] === value ? prev : { ...prev, [name]: value }));
    markTouched(name);
  };

  // Live validation (errors appear only if field touched or submit attempted)
  useEffect(() => {
    const e = {};
    const req = (k, label) => {
      if (!String(form[k] ?? '').trim()) e[k] = `${label} is required.`;
    };
    req('varietyName', 'Variety name');
    req('releaseName', 'Release name');
    req('yearRelease', 'Year release');
    req('breedingCode', 'Breeding code');
    req('breederOrigin', 'Breeder origin');
    req('maturityDays', 'Maturity days');
    req('averageYield', 'Average yield');
    req('maxYield', 'Maximum yield');
    req('plantHeight', 'Plant height');
    req('tillers', 'Number of tillers');
    req('location', 'Location');
    if (!form.plantingMethod) e.plantingMethod = 'Planting method is required.';
    if (form.season.length === 0) e.season = 'Select at least one season.';
    if (form.environment.length === 0) e.environment = 'Select at least one environment.';

    if (form.maturityDays && !/^\d+$/.test(form.maturityDays)) e.maturityDays = 'Enter a whole number.';
    if (form.tillers && !/^\d+$/.test(form.tillers)) e.tillers = 'Enter a whole number.';
    if (form.plantHeight && !/^\d+$/.test(form.plantHeight)) e.plantHeight = 'Enter a whole number.';
    if (form.averageYield && !/^\d+(\.\d+)?$/.test(form.averageYield)) e.averageYield = 'Enter a valid number (e.g., 3 or 4.3).';
    if (form.maxYield && !/^\d+(\.\d+)?$/.test(form.maxYield)) e.maxYield = 'Enter a valid number (e.g., 3 or 4.3).';

    setErrors(e);
  }, [form]);

  const showErr = (name) => (submitAttempted || touched[name]) && errors[name];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (Object.keys(errors).length > 0) return;
    setConfirmOpen(true);
  };

  const proceedSave = async () => {
    setConfirmOpen(false);
    try {
      setSubmitting(true);
      await onSave(form, getRecordId(varietyData));
      setResult({
        title: varietyData ? 'Updated!' : 'Saved!',
        message: `Rice variety ${form.varietyName || ''} has been ${varietyData ? 'updated' : 'saved'} successfully.`,
        ok: true
      });
      setResultOpen(true);
    } catch (err) {
      setResult({ title: 'Failed', message: err?.message || 'Failed to save.', ok: false });
      setResultOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl relative flex flex-col max-h-[90vh]">
      {/* Fixed Header */}
      <div className="flex justify-between items-center p-5 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
          {varietyData ? 'Edit Rice Variety' : 'Add Rice Variety'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-red-500 transition"
          disabled={submitting}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <form onSubmit={handleSubmit} className="space-y-6" id="rice-variety-form">
          {/* Identity */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'varietyName', label: 'Variety Name', ph: 'e.g., NSIC Rc 160' },
                { name: 'releaseName', label: 'Release Name', ph: 'e.g., ZINC 7' },
                { name: 'breedingCode', label: 'Breeding Code', ph: 'e.g., IRRI12345' },
                { name: 'breederOrigin', label: 'Breeder Origin', ph: 'e.g., PhilRice' }
              ].map(f => (
                <div key={f.name} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    {f.label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                    onBlur={() => markTouched(f.name)}
                    placeholder={f.ph}
                    className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm ${showErr(f.name) ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {showErr(f.name) && <span className="text-xs text-red-500 mt-1">{errors[f.name]}</span>}
                </div>
              ))}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Year Release <span className="text-red-500">*</span>
                </label>
                <select
                  name="yearRelease"
                  value={form.yearRelease}
                  onChange={handleChange}
                  onBlur={() => markTouched('yearRelease')}
                  disabled={enumsLoading}
                  className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm ${showErr('yearRelease') ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">{enumsLoading ? 'Loading…' : 'Select Year'}</option>
                  {yearReleases.map(y => (<option key={y} value={String(y)}>{y}</option>))}
                </select>
                {showErr('yearRelease') && <span className="text-xs text-red-500 mt-1">{errors.yearRelease}</span>}
              </div>
            </div>
          </section>

          {/* Agronomic Data */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Agronomic Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'maturityDays', label: 'Maturity Days', ph: 'e.g., 110' },
                { name: 'plantHeight', label: 'Plant Height (cm)', ph: 'e.g., 115' },
                { name: 'tillers', label: 'Tillers (count)', ph: 'e.g., 16' }
              ].map(f => (
                <div key={f.name} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    {f.label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                    onBlur={() => markTouched(f.name)}
                    placeholder={f.ph}
                    className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm ${showErr(f.name) ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {showErr(f.name) && <span className="text-xs text-red-500 mt-1">{errors[f.name]}</span>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'averageYield', label: 'Average Yield', ph: 'e.g., 4.8' },
                { name: 'maxYield', label: 'Maximum Yield', ph: 'e.g., 6.0' }
              ].map(f => (
                <div key={f.name} className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      {f.label} <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Info size={12} /> tonelada/hectar</span>
                  </div>
                  <input
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                    onBlur={() => markTouched(f.name)}
                    placeholder={f.ph}
                    className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm ${showErr(f.name) ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {showErr(f.name) && <span className="text-xs text-red-500 mt-1">{errors[f.name]}</span>}
                </div>
              ))}
            </div>
          </section>

          {/* Recommendation */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Recommendation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  onBlur={() => markTouched('location')}
                  placeholder="e.g., Tarlac"
                  className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-sm ${showErr('location') ? 'border-red-400' : 'border-gray-300'}`}
                />
                {showErr('location') && <span className="text-xs text-red-500 mt-1">{errors.location}</span>}
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Planting Method <span className="text-red-500">*</span>
                </label>
                <select
                  name="plantingMethod"
                  value={form.plantingMethod}
                  onChange={handleChange}
                  onBlur={() => markTouched('plantingMethod')}
                  disabled={enumsLoading}
                  className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-sm ${showErr('plantingMethod') ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">{enumsLoading ? 'Loading…' : 'Select Method'}</option>
                  {plantingMethods.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {showErr('plantingMethod') && <span className="text-xs text-red-500 mt-1">{errors.plantingMethod}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Season <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-4">
                  {seasons.map(s => (
                    <label key={s} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="season"
                        value={s}
                        checked={form.season.includes(s)}
                        onChange={handleChange}
                        disabled={enumsLoading}
                      />
                      <span className="text-sm">{s}</span>
                    </label>
                  ))}
                </div>
                {showErr('season') && <span className="text-xs text-red-500 mt-1">{errors.season}</span>}
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Environment <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-4">
                  {environments.map(env => (
                    <label key={env} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="environment"
                        value={env}
                        checked={form.environment.includes(env)}
                        onChange={handleChange}
                        disabled={enumsLoading}
                      />
                      <span className="text-sm">{env}</span>
                    </label>
                  ))}
                </div>
                {showErr('environment') && <span className="text-xs text-red-500 mt-1">{errors.environment}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 h-10">
            <input
              type="checkbox"
              id="recommendedInTarlac"
              name="recommendedInTarlac"
              checked={form.recommendedInTarlac}
              onChange={handleChange}
              className="w-4 h-4 shrink-0 accent-green-600 align-middle"
            />
            <label htmlFor="recommendedInTarlac" className="text-sm whitespace-nowrap select-none">
              Recommended in Tarlac
            </label>
          </div>
          </section>
        </form>
      </div>

      {/* Fixed Footer - Same structure as AddPestModal */}
      <div className="flex justify-end gap-2 p-5 border-t border-gray-200 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          form="rice-variety-form"
          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 text-white font-medium hover:opacity-90 shadow-md transition disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? "Saving..." : (varietyData ? "Update" : "Save")}
        </button>
      </div>

      {/* Confirm Dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-5">
            <h4 className="text-lg font-semibold mb-2">{varietyData ? 'Confirm Update' : 'Confirm Save'}</h4>
            <p className="text-sm text-gray-600">
              Are you sure you want to {varietyData ? 'update' : 'save'} "{form.varietyName || 'this variety'}"?
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmOpen(false)} className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button onClick={proceedSave} className="px-3 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700">
                {varietyData ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Dialog */}
      {resultOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-5">
            <h4 className={`text-lg font-semibold mb-2 ${result.ok ? 'text-green-600' : 'text-red-600'}`}>{result.title}</h4>
            <p className="text-sm text-gray-600">{result.message}</p>
            <div className="flex justify-end mt-5">
              <button
                onClick={() => {
                  setResultOpen(false);
                  if (result.ok) onClose();
                }}
                className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddRiceVarietyModal;