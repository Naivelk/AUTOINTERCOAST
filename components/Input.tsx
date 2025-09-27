import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  containerClassName?: string;
}

const Input: React.FC<InputProps> = ({ label, id, error, containerClassName, ...props }) => {
  return (
    <div className={`mb-4 ${containerClassName || ''}`}>
      <label htmlFor={id} className="block text-sm font-normal text-gray-600 mb-1.5" style={{color: 'var(--app-color-text-muted)'}}>
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={`
          w-full px-4 py-2.5 text-gray-800 
          border rounded-xl shadow-sm 
          focus:ring-2 focus:outline-none
          sm:text-sm placeholder-gray-400 
          transition-colors duration-150
          ${props.className} 
          ${error ? 'border-red-400 focus:ring-red-300' : 'border-[var(--app-color-border)] focus:ring-[var(--app-color-input-border-focus)] focus:border-[var(--app-color-input-border-focus)]'}
        `}
        style={{
          backgroundColor: 'var(--app-color-input-background)',
          // fontSize: '0.9rem' // Slightly larger placeholder implied by py-2.5
        }}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default Input;