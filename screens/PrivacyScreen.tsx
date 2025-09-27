
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer.tsx';
import { ShieldCheck } from 'lucide-react';

const PrivacyScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageContainer 
      title="Privacy Policy" 
      showBackButton 
      onBack={() => navigate('/settings')}
    >
      <div className="p-2 text-left">
        <div className="flex flex-col items-center text-center mb-6">
          <ShieldCheck size={48} className="app-text-primary mb-3" />
          <h2 className="text-2xl font-semibold app-text-secondary">AutoInspect Privacy Policy</h2>
        </div>
        
        <p className="text-sm text-gray-700 mb-4">
          Your privacy is important to us. This policy describes how your information is handled and protected when using the AutoInspect application.
        </p>

        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h3 className="font-semibold text-md app-text-secondary mb-1">1. Data Collection and Storage</h3>
            <p>AutoInspect is designed to operate locally on your device. The application stores the following types of data exclusively on your device's internal storage:</p>
            <ul className="list-disc list-inside pl-4 mt-1">
              <li>Inspection data: Names, dates, vehicle details (make, model, year).</li>
              <li>Photographs: Images captured during the inspection process.</li>
              <li>Agent information: Name of the agent performing the inspection (if configured).</li>
            </ul>
            <p className="mt-1"><strong>We do not share your personal information or inspection data with third parties, nor do we send it to external servers without your explicit consent.</strong></p>
          </div>

          <div>
            <h3 className="font-semibold text-md app-text-secondary mb-1">2. Application Permissions</h3>
            <p>For its proper functioning, AutoInspect may request the following permissions on your device:</p>
            <ul className="list-disc list-inside pl-4 mt-1">
              <li><strong>Camera:</strong> To capture the photographs necessary for the vehicle inspection.</li>
              <li><strong>Storage (Files and media):</strong> To save generated PDF reports and inspection databases on your device. This permission is also used to access photos if you choose to select an image from your gallery instead of taking it directly.</li>
            </ul>
            <p className="mt-1">These permissions are requested solely for the purpose of providing the described functionalities and are not used for other purposes.</p>
          </div>

          <div>
            <h3 className="font-semibold text-md app-text-secondary mb-1">3. Data Security</h3>
            <p>Your data is stored securely within the application's allocated space on your device. As the data resides locally, you are responsible for the physical security of your device and for making periodic backups of information you consider important.</p>
          </div>

          <div>
            <h3 className="font-semibold text-md app-text-secondary mb-1">4. Changes to this Privacy Policy</h3>
            <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-6">
          If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@autoinspect.app" className="app-text-primary hover:underline">support@autoinspect.app</a>.
        </p>
      </div>
    </PageContainer>
  );
};

export default PrivacyScreen;