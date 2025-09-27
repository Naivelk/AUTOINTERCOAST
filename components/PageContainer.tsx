
import React from 'react';

interface PageContainerProps {
  title?: string;
  children: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  headerContent?: React.ReactNode;
  className?: string; // Allow additional classes
}

const PageContainer: React.FC<PageContainerProps> = ({ title, children, showBackButton, onBack, headerContent, className }) => {
  return (
    <div 
      className={`p-4 pt-6 h-full flex flex-col ${className || ''}`}
      style={{ backgroundColor: 'var(--app-color-background)' }}
    >
      {title && (
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {showBackButton && onBack && (
                <button 
                  onClick={onBack} 
                  className="mr-3 p-2 -ml-2 rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1"
                  style={{ color: 'var(--app-color-secondary-text)', backgroundColor: 'transparent' }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--app-color-accent)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'transparent'}
                  aria-label="Go back"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
              )}
              <h1 className="text-3xl font-bold" style={{color: 'var(--app-color-secondary-text)'}}>{title}</h1>
            </div>
            {headerContent}
          </div>
        </header>
      )}
      <main className="flex-grow overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default PageContainer;