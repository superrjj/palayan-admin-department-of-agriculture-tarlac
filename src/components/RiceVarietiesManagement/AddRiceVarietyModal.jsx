import React, { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';

const AddRiceVarietyModal = ({ onClose, onSave, varietyData = null }) => {
  const [form, setForm] = useState({
    varietyName: '',
    releaseName: '',
    yearRelease: '',
    breedingCode: '',
    maturityDays: '',
    maxYield: '',
    plantHeight: '',
    tillers: '',
    location: '',
    season: [],
    plantingMethod: '',
    environment: [], // now array for checkboxes
    recommendedInTarlac: false, // new checkbox
  });

  useEffect(() => {
    if (varietyData) setForm({ ...varietyData });
  }, [varietyData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // For multi-select checkboxes
    if (type === 'checkbox' && name === 'season') {
      setForm(prev => {
        const updated = checked
          ? [...prev.season, value]
          : prev.season.filter(s => s !== value);
        return { ...prev, season: updated };
      });
    } else if (type === 'checkbox' && name === 'environment') {
      setForm(prev => {
        const updated = checked
          ? [...prev.environment, value]
          : prev.environment.filter(e => e !== value);
        return { ...prev, environment: updated };
      });
    } else if (type === 'checkbox' && name === 'recommendedInTarlac') {
      setForm(prev => ({ ...prev, recommendedInTarlac: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form, varietyData?.id || null);
  };

  const years = Array.from({ length: 2024 - 2011 }, (_, i) => 2012 + i);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-2xl font-semibold mb-4">
          {varietyData ? 'Edit Rice Variety' : 'Add Rice Variety'}
        </h2>
        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Text & Number Inputs */}
          {['varietyName','releaseName','breedingCode','maturityDays','maxYield','plantHeight','tillers','location'].map(key => (
            <div key={key} className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
              <input
                type={['maturityDays','maxYield','plantHeight','tillers'].includes(key) ? 'number' : 'text'}
                name={key}
                value={form[key]}
                onChange={handleChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                required
              />
            </div>
          ))}

          {/* Year Release Dropdown */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Year Release</label>
            <select 
              name="yearRelease" 
              value={form.yearRelease} 
              onChange={handleChange} 
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              required
            >
              <option value="">Select Year</option>
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>

          {/* Season Checkbox */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Season</label>
            <div className="flex space-x-4">
              {['Dry', 'Wet'].map(s => (
                <label key={s} className="flex items-center space-x-1">
                  <input 
                    type="checkbox" 
                    name="season" 
                    value={s} 
                    checked={form.season.includes(s)} 
                    onChange={handleChange} 
                    className="accent-green-600"
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Planting Method */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Planting Method</label>
            <select 
              name="plantingMethod" 
              value={form.plantingMethod} 
              onChange={handleChange} 
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              required
            >
              <option value="">Select Method</option>
              <option value="Direct Seed">Direct Seed</option>
              <option value="Transplanting">Transplanting</option>
            </select>
          </div>

          {/* Environment Checkbox */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Environment</label>
            <div className="flex space-x-4">
              {['Low Irrigated Land', 'Rainfed Lowland'].map(env => (
                <label key={env} className="flex items-center space-x-1">
                  <input 
                    type="checkbox" 
                    name="environment" 
                    value={env} 
                    checked={form.environment.includes(env)} 
                    onChange={handleChange} 
                    className="accent-green-600"
                  />
                  <span>{env}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Recommended in Tarlac */}
          <div className="flex flex-col md:col-span-2">
            <label className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                name="recommendedInTarlac" 
                checked={form.recommendedInTarlac} 
                onChange={handleChange} 
                className="accent-green-600"
              />
              <span>Recommended in Tarlac</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="md:col-span-2 flex justify-end space-x-2 mt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 transition"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{varietyData ? 'Update' : 'Save'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRiceVarietyModal;
