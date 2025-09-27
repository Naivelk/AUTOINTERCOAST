import React, { ChangeEvent, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Camera, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Photo } from '../types.ts';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../constants.ts';

interface PhotoUploadCardProps {
  photoSlot: Photo;
  onPhotoChange: (photoSlotId: string, file: File | null) => void;
  errorMessage?: string | null;
}

const PhotoUploadCard: React.FC<PhotoUploadCardProps> = ({ photoSlot, onPhotoChange, errorMessage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        onPhotoChange(photoSlot.id, null); // Clear previous valid photo if any
        toast.error(`File size exceeds ${MAX_FILE_SIZE_MB}MB. Please choose a smaller file.`);
        if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
        return;
      }
      onPhotoChange(photoSlot.id, file);
    }
  };

  const handleRemovePhoto = () => {
    onPhotoChange(photoSlot.id, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset the file input
    }
  };

  const handleRetakePhoto = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{photoSlot.name}</h3>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        id={`file-input-${photoSlot.id}`}
      />
      {photoSlot.base64 ? (
        <div className="relative group">
          <img src={photoSlot.base64} alt={photoSlot.name} className="w-full h-32 object-cover rounded-md" />
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
            <button
              onClick={handleRetakePhoto}
              className="p-2 text-white hover:app-text-accent"
              title="Retake Photo"
            >
              <RefreshCw size={24} />
            </button>
            <button
              onClick={handleRemovePhoto}
              className="p-2 text-white hover:text-red-300" 
              title="Remove Photo"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-32 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-400 hover:app-border-accent hover:app-text-accent transition-colors"
        >
          <Camera size={32} />
          <span className="mt-1 text-xs">Tap to add photo</span>
        </button>
      )}
      {errorMessage && (
          <p className="mt-2 text-xs text-red-500 flex items-center">
            <AlertTriangle size={14} className="mr-1" />
            {errorMessage}
          </p>
        )}
      {!photoSlot.base64 && photoSlot.name.toLowerCase().includes('(optional)') && (
        <p className="mt-2 text-xs text-gray-400 italic">Optional</p>
      )}
    </div>
  );
};

export default PhotoUploadCard;