import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle, Info } from 'lucide-react';

const AddRiceVarietyModal = ({ onClose, onSave, varietyData = null }) => {
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

  useEffect(() => {
    if (varietyData) setForm(prev => ({ ...prev, ...varietyData }));
  }, [varietyData]);

  const years = useMemo(() => {
    const end = new Date().getFullYear();
    const start = 2012;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i).reverse();
  }, []);

  const sanitizeInt = (v) => v.replace(/[^\d]/g, '');
  const sanitizeDecimal = (v) => {
    let s = v.replace(/[^\d.]/g, '');
    const parts = s.split('.');
    if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('');
    if (s.startsWith('.')) s = '0' + s;
    return s;
  };

  const markTouched = (name) => setTouched(prev => (prev[name] ? prev : { ...prev, [name]: true }));

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox' && name === 'season') {
      setForm(prev => {
        const updated = checked ? [...prev.season, value] : prev.season.filter(s => s !== value);
        return { ...prev, season: updated };
      });
      return;
    }

    if (type === 'checkbox' && name === 'environment') {
      setForm(prev => {
        const updated = checked ? [...prev.environment, value] : prev.environment.filter(v => v !== value);
        return { ...prev, environment: updated };
      });
      return;
    }

    if (type === 'checkbox' && name === 'recommendedInTarlac') {
      setForm(prev => ({ ...prev, recommendedInTarlac: checked }));
      return;
    }

    let next = value;
    if (['maturityDays', 'plantHeight', 'tillers'].includes(name)) next = sanitizeInt(value);
    if (['averageYield', 'maxYield'].includes(name)) next = sanitizeDecimal(value);

    // Prevent redundant state writes to avoid rare focus glitches
    setForm(prev => (prev[name] === next ? prev : { ...prev, [name]: next }));
  };

  useEffect(() => {
    const e = {};
    const req = (key, label) => {
      if (!String(form[key] ?? '').trim()) e[key] = `${label} is required.`;
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

  const shouldShowError = (name) => (submitAttempted || touched[name]) && errors[name];

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
      await onSave(form, varietyData?.id || null);
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

  const Field = ({ name, label, placeholder, rightHint }) => (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <label htmlFor={name} className="text-sm font-medium text-gray-700 mb-1">{label}</label>
        {rightHint}
      </div>
      <input
        id={name}
        type="text"
        name={name}
        value={form[name]}
        onChange={handleChange}
        onBlur={() => markTouched(name)}
        placeholder={placeholder}
        autoComplete="off"
        className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm
          ${shouldShowError(name) ? 'border-red-400' : 'border-gray-300'}`}
        aria-invalid={!!shouldShowError(name)}
      />
      {shouldShowError(name) && (
        <span className="text-xs text-red-500 mt-1">{errors[name]}</span>
      )}
    </div>
  );

  const NumFieldInt = (props) => <Field {...props} />;
  const NumFieldDecimal = ({ name, label, placeholder }) => (
    <Field
      name={name}
      label={label}
      placeholder={placeholder}
      rightHint={<span className="text-[11px] text-gray-500 flex items-center gap-1"><Info size={12} /> tonelada/hectar</span>}
    />
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl relative">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-semibold">
            {varietyData ? 'Edit Rice Variety' : 'Add Rice Variety'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition" aria-label="Close">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field name="varietyName" label="Variety Name" placeholder="e.g., NSIC Rc 260" />
              <Field name="releaseName" label="Release Name" placeholder="e.g., ZINC 7" />
              <Field name="breedingCode" label="Breeding Code" placeholder="e.g., IRRI12345" />
              <Field name="breederOrigin" label="Breeder Origin" placeholder="e.g., PhilRice" />
              <div className="flex flex-col">
                <label htmlFor="yearRelease" className="text-sm font-medium text-gray-700 mb-1">Year Release</label>
                <select
                  id="yearRelease"
                  name="yearRelease"
                  value={form.yearRelease}
                  onChange={handleChange}
                  onBlur={() => markTouched('yearRelease')}
                  className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm
                    ${shouldShowError('yearRelease') ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Select Year</option>
                  {years.map(y => (<option key={y} value={String(y)}>{y}</option>))}
                </select>
                {shouldShowError('yearRelease') && (
                  <span className="text-xs text-red-500 mt-1">{errors.yearRelease}</span>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Agronomic Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NumFieldInt name="maturityDays" label="Maturity Days" placeholder="e.g., 110" />
              <NumFieldInt name="plantHeight" label="Plant Height (cm)" placeholder="e.g., 115" />
              <NumFieldInt name="tillers" label="Tillers (count)" placeholder="e.g., 16" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumFieldDecimal name="averageYield" label="Average Yield" placeholder="e.g., 4.8" />
              <NumFieldDecimal name="maxYield" label="Maximum Yield" placeholder="e.g., 6.0" />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Recommendation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field name="location" label="Location" placeholder="e.g., Pampanga" />
              <div className="flex flex-col">
                <label htmlFor="plantingMethod" className="text-sm font-medium text-gray-700 mb-1">Planting Method</label>
                <select
                  id="plantingMethod"
                  name="plantingMethod"
                  value={form.plantingMethod}
                  onChange={handleChange}
                  onBlur={() => markTouched('plantingMethod')}
                  className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm
                    ${shouldShowError('plantingMethod') ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Select Method</option>
                  <option value="Direct Seed">Direct Seed</option>
                  <option value="Transplanting">Transplanting</option>
                </select>
                {shouldShowError('plantingMethod') && (
                  <span className="text-xs text-red-500 mt-1">{errors.plantingMethod}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">Season</label>
                <div className="flex flex-wrap gap-4">
                  {['Dry', 'Wet'].map(s => (
                    <label key={s} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="season"
                        value={s}
                        checked={form.season.includes(s)}
                        onChange={handleChange}
                      />
                      <span className="text-sm">{s}</span>
                    </label>
                  ))}
                </div>
                {shouldShowError('season') && (
                  <span className="text-xs text-red-500 mt-1">{errors.season}</span>
                )}
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">Environment</label>
                <div className="flex flex-wrap gap-4">
                  {['Low Irrigated Land', 'Rainfed Lowland'].map(env => (
                    <label key={env} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="environment"
                        value={env}
                        checked={form.environment.includes(env)}
                        onChange={handleChange}
                      />
                      <span className="text-sm">{env}</span>
                    </label>
                  ))}
                </div>
                {shouldShowError('environment') && (
                  <span className="text-xs text-red-500 mt-1">{errors.environment}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="recommendedInTarlac"
                checked={form.recommendedInTarlac}
                onChange={handleChange}
                id="recommendedInTarlac"
              />
              <label htmlFor="recommendedInTarlac" className="text-sm">Recommended in Tarlac</label>
            </div>
          </section>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 transition text-sm"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{submitting ? 'Saving...' : varietyData ? 'Update' : 'Save'}</span>
            </button>
          </div>
        </form>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-5">
            <h4 className="text-lg font-semibold mb-2">{varietyData ? 'Confirm Update' : 'Confirm Save'}</h4>
            <p className="text-sm text-gray-600">
              Are you sure you want to {varietyData ? 'update' : 'save'} “{form.varietyName || 'this variety'}”?
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