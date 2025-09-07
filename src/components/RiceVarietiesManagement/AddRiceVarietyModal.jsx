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
    season: '',
    plantingMethod: ''
  });

  useEffect(() => {
    if (varietyData) setForm({ ...varietyData });
  }, [varietyData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form, varietyData?.id || null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-6 relative animate-fadeIn scale-up">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition">
          <X className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-2xl font-semibold mb-4">{varietyData ? 'Edit Rice Variety' : 'Add Rice Variety'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          {Object.keys(form).map((key) => (
            <div key={key} className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1')}</label>
              <input
                type={key.includes('Year') || key.includes('Days') || key.includes('Yield') || key.includes('Height') || key === 'tillers' ? 'number' : 'text'}
                name={key}
                value={form[key]}
                onChange={handleChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition"
                required
              />
            </div>
          ))}
          <div className="md:col-span-2 flex justify-end space-x-2 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300 transition">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 transition">
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
