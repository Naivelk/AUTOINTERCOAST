
import React from 'react';
import { InspectionStep } from '../types.ts';

interface WizardStepsProps {
  currentStep: InspectionStep;
  totalSteps?: number;
}

const stepLabels: Record<InspectionStep, string> = {
  [InspectionStep.VEHICLE_DETAILS]: "Vehicle Details",
  [InspectionStep.PHOTO_CAPTURE]: "Capture Photos",
  [InspectionStep.SUMMARY]: "Review & Confirm",
};

const WizardSteps: React.FC<WizardStepsProps> = ({ currentStep, totalSteps = 3 }) => {
  return (
    <div className="mb-6 px-1"> {/* Adjusted padding slightly */}
      <p className="text-xs font-medium mb-1.5" style={{color: 'var(--app-color-text-muted)'}}>
        Step {currentStep}/{totalSteps}: {stepLabels[currentStep]}
      </p>
      <div className="flex space-x-1">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div
            key={step}
            className={`h-1 flex-1 rounded-full ${ // Made bar thinner (h-1)
              step <= currentStep ? 'app-bg-primary' : 'bg-gray-300' // bg-gray-300 can be var(--app-color-border) or similar
            }`}
            style={{ backgroundColor: step > currentStep ? 'var(--app-color-border)' : undefined }}
          />
        ))}
      </div>
    </div>
  );
};

export default WizardSteps;