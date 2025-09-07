import React, { useState } from "react";
import { X, CheckCircle, UploadCloud, Book, Globe, Info, AlertCircle, Stethoscope, Heart } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase/config";

const AddDiseaseModal = ({ onClose, onSave, diseaseData = null }) => {
  const [formData, setFormData] = useState({
    name: diseaseData?.name || "",
    scientificName: diseaseData?.scientificName || "",
    description: diseaseData?.description || "",
    cause: diseaseData?.cause || "",
    symptoms: diseaseData?.symptoms || "",
    treatments: diseaseData?.treatments || "",
  });

  const [images, setImages] = useState([]);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const isEdit = !!diseaseData;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 1000) {
      alert("You can upload a maximum of 1000 images.");
      return;
    }
    setImages((prev) => [...prev, ...files]);
  };
  const handleRemoveImage = (index) => setImages((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (images.length === 0) return alert("Please upload at least 1 image.");

    const urls = [];
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const storageRef = ref(storage, `disease_images/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (error) => console.error(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          urls.push(url);
          if (urls.length === images.length) {
            await onSave({ ...formData, images: urls }, diseaseData?.id);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            setImages([]);
            setUploadProgress(0);
          }
        }
      );
    }
  };

  // Map fields to icons
  const fieldIcons = {
    name: Book,
    scientificName: Globe,
    description: Info,
    cause: AlertCircle,
    symptoms: Stethoscope,
    treatments: Heart,
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
            {isEdit ? "Edit Disease" : "Add New Disease"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
         {["name", "scientificName", "description", "cause", "symptoms", "treatments"].map((field) => {
            const Icon = fieldIcons[field];
            //label
            const label =
                field === "name" ? "Disease Name" :
                field === "scientificName" ? "Scientific Name" :
                field.charAt(0).toUpperCase() + field.slice(1);

            return (
                <div key={field} className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <div className="flex items-center border rounded-lg px-3 focus-within:ring-2 focus-within:ring-green-500 transition">
                    {Icon && <Icon className="w-4 h-4 text-gray-400 mr-2" />}
                    <input
                    type="text"
                    name={field}
                    value={formData[field]}
                    onChange={handleChange}
                    className="w-full p-2 outline-none"
                    placeholder={`Enter ${label}`}
                    required
                    />
                </div>
                </div>
            );
            })}


          {/* Drag & Drop Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Images</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-5 cursor-pointer hover:border-green-500 transition">
              <UploadCloud className="w-10 h-10 text-gray-400 mb-2" />
              <span className="text-gray-500 text-sm text-center">Click or drag files here (min. of 300 & max. of 1000)</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border">
                    <img src={URL.createObjectURL(img)} alt={`preview-${idx}`} className="w-full h-20 object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploadProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 text-white font-medium hover:opacity-90 shadow-md transition"
            >
              {isEdit ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>

      {/* Success Message */}
      {success && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-5 flex flex-col items-center animate-fadeIn scale-up">
            <svg className="w-16 h-16 text-green-500 mb-3 animate-bounce" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-md font-semibold text-green-600">
              Disease {isEdit ? "updated" : "created"} successfully!
            </h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddDiseaseModal;
