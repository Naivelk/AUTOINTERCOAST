
import React from 'react';
import Button from './Button.tsx';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose(); // Close modal after confirmation
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center mb-4">
          <AlertTriangle size={24} className="mr-3 app-text-error" />
          <h2 id="confirmation-modal-title" className="text-xl font-semibold app-text-secondary">{title}</h2>
        </div>
        <div className="text-sm text-gray-700 mb-6" id="confirmation-modal-description">
          {message}
        </div>
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} size="md">
            {cancelText}
          </Button>
          <Button variant={confirmVariant} onClick={handleConfirm} size="md">
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
