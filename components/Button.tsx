
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  className = '', 
  style = {},
  type = 'button',
  disabled = false,
  ...rest
}) => {
  const baseStyles = "font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ease-in-out duration-150 flex items-center justify-center tracking-wide disabled:opacity-60 disabled:cursor-not-allowed";
  
  let variantStyles = "";
  let dynamicInlineStyles = { ...style }; // Combine with existing styles

  switch (variant) {
    case 'primary':
      variantStyles = `text-white shadow-md focus:ring-[var(--app-color-primary)]`;
      dynamicInlineStyles.backgroundColor = 'var(--app-color-primary)';
      // Hover: se aplicará con CSS o JS si es necesario para var(--app-color-primary-dark)
      break;
    case 'secondary':
      variantStyles = `text-white shadow-md focus:ring-[var(--app-color-accent)]`;
      dynamicInlineStyles.backgroundColor = 'var(--app-color-accent)';
      // Hover: var(--app-color-accent-dark)
      break;
    case 'outline':
      variantStyles = `bg-transparent border shadow-sm focus:ring-[var(--app-color-primary)]`;
      dynamicInlineStyles.borderColor = 'var(--app-color-primary)';
      dynamicInlineStyles.color = 'var(--app-color-primary)';
      // Hover: backgroundColor: 'rgba(var_primary_rgb, 0.05)'
      break;
    case 'danger':
      variantStyles = `text-white shadow-md focus:ring-[var(--app-color-error)]`;
      dynamicInlineStyles.backgroundColor = 'var(--app-color-error)';
      // Hover: var(--app-color-error-dark)
      break;
    case 'ghost':
      variantStyles = `bg-transparent shadow-none focus:ring-[var(--app-color-primary)]`;
      dynamicInlineStyles.color = 'var(--app-color-primary)';
      // Hover: backgroundColor: 'rgba(var_primary_rgb, 0.05)'
      break;
  }

  let sizeStyles = "";
  switch (size) {
    case 'sm':
      sizeStyles = "px-3 py-1.5 text-xs";
      break;
    case 'md':
      sizeStyles = "px-5 py-2.5 text-sm";
      break;
    case 'lg':
      sizeStyles = "px-7 py-3 text-base";
      break;
    case 'xl':
      sizeStyles = "px-8 py-3.5 text-lg";
      break;
  }
  
  // Inline styles for hover effects based on CSS variables
  const handleMouseOver = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    if (disabled || isLoading) return;
    switch (variant) {
      case 'primary': target.style.backgroundColor = 'var(--app-color-primary-dark)'; break;
      case 'secondary': target.style.backgroundColor = 'var(--app-color-accent-dark)'; break;
      case 'outline': target.style.backgroundColor = 'rgba(37, 99, 235, 0.05)'; break; // Using #2563EB RGB values
      case 'danger': target.style.backgroundColor = 'var(--app-color-error-dark)'; break;
      case 'ghost': target.style.backgroundColor = 'rgba(37, 99, 235, 0.05)'; break;
    }
  };

  const handleMouseOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    if (disabled || isLoading) return;
    switch (variant) {
      case 'primary': target.style.backgroundColor = 'var(--app-color-primary)'; break;
      case 'secondary': target.style.backgroundColor = 'var(--app-color-accent)'; break;
      case 'outline': target.style.backgroundColor = 'transparent'; break;
      case 'danger': target.style.backgroundColor = 'var(--app-color-error)'; break;
      case 'ghost': target.style.backgroundColor = 'transparent'; break;
    }
  };


  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${isLoading ? 'opacity-75' : ''} ${className}`}
      style={dynamicInlineStyles}
      disabled={disabled || isLoading}
      {...rest}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" style={{ color: 'currentColor' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;