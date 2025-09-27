
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer.tsx';
import Button from '../components/Button.tsx';
import { PlusCircle, FileText } from 'lucide-react';
import { APP_NAME } from '../constants.ts';
import { InspectionContext } from '../App.tsx';

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const context = useContext(InspectionContext);

  const handleStartNewInspection = () => {
    context?.resetInspection();
    navigate('/new-inspection');
  };

  return (
    <PageContainer className="!p-0"> {/* Remove PageContainer padding for full-width gradient */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-6 py-12">
        {/* Logo con animación de entrada */}
        <div className="mb-10 animate-fade-in-up">
          <img 
            src="/assets/logogrande.png" 
            alt="AutoInspect Logo" 
            className="h-40 w-auto mx-auto object-contain"
            style={{ maxWidth: '280px' }}
          />
        </div>

        <h1 
          className="text-5xl font-extrabold mb-4"
          style={{ color: 'var(--app-color-primary)' }}
        >
          {APP_NAME}
        </h1>
        <p className="text-lg mb-12 max-w-md" style={{color: 'var(--app-color-secondary-text)'}}>
          Your trusted partner for fast and efficient vehicle inspections.
        </p>
        
        <div className="space-y-5 w-full max-w-sm">
          <Button 
            onClick={handleStartNewInspection} 
            size="xl" 
            variant="primary"
            className="w-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            aria-label="Start New Vehicle Inspection"
          >
            <PlusCircle size={24} className="mr-2.5" />
            New Inspection
          </Button>
          <Button 
            onClick={() => navigate('/inspections')} 
            variant="secondary" 
            size="xl" 
            className="w-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            aria-label="View Saved Inspections"
          >
            <FileText size={22} className="mr-2.5" />
            View Saved
          </Button>
        </div>

        <p className="text-sm mt-16" style={{color: 'rgba(77, 77, 77, 0.7)'}}>
          All data is stored locally on your device.
        </p>
      </div>
    </PageContainer>
  );
};

export default HomeScreen;