
import React from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const base = 'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
  xl: 'h-14 px-6 text-base',
};

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600',
  secondary: 'bg-gray-800 text-white hover:bg-gray-900 focus:ring-gray-800',
  outline: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus:ring-blue-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
  ghost: 'bg-transparent hover:bg-gray-100 focus:ring-gray-300',
};

const Button: React.FC<ButtonProps> = ({
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  fullWidth = false,
  disabled = false,
  isLoading = false,
  type = 'button',
  ...rest
}) => {
  return (
    <button
      type={type}
      className={clsx(
        base,
        sizes[size],
        variants[variant],
        fullWidth && 'w-full',
        (disabled || isLoading) && 'opacity-70 cursor-not-allowed',
        className
      )}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <svg 
          className="animate-spin -ml-1 mr-3 h-5 w-5" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;