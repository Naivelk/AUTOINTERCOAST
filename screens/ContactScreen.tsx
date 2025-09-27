
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer.tsx';
import { Mail, Phone, Clock } from 'lucide-react';

const ContactScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageContainer 
      title="Contact Us" 
      showBackButton 
      onBack={() => navigate('/settings')}
    >
      <div className="p-2 text-left">
        <div className="flex flex-col items-center text-center mb-6">
          <Mail size={48} className="app-text-primary mb-3" />
          <h2 className="text-2xl font-semibold app-text-secondary">Need help? Contact Us</h2>
        </div>
        
        <p className="text-sm text-gray-700 mb-6">
          If you have questions, suggestions, or need technical support with AutoInspect, you can contact our team through the following channels:
        </p>

        <div className="space-y-5">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center mb-1.5">
              <Mail size={20} className="app-text-primary mr-2.5" />
              <h3 className="text-md font-semibold app-text-secondary">Email:</h3>
            </div>
            <a href="mailto:Naivelk@gmail.com" className="text-sm text-blue-600 hover:underline break-all">Naivelk@gmail.com</a>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center mb-1.5">
              <Phone size={20} className="app-text-primary mr-2.5" />
              <h3 className="text-md font-semibold app-text-secondary">Phone:</h3>
            </div>
            <a href="tel:+573043528729" className="text-sm text-blue-600 hover:underline">+57 3043528729</a>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center mb-1.5">
              <Clock size={20} className="app-text-primary mr-2.5" />
              <h3 className="text-md font-semibold app-text-secondary">Office Hours:</h3>
            </div>
            <p className="text-sm text-gray-600">Monday to Friday, 9:00 AM to 6:00 PM (CDMX Time)</p>
          </div>
        </div>

        <p className="text-center text-md font-medium text-gray-700 mt-8">
          Your feedback is important to us!
        </p>
      </div>
    </PageContainer>
  );
};

export default ContactScreen;