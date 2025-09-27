
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer.tsx';
import { LifeBuoy } from 'lucide-react'; // Using LifeBuoy for more specific "help" icon

const HelpScreen: React.FC = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "How do I start a new inspection?",
      answer: "From the Home screen, tap the “New Inspection” button and complete the required information. Proceed through the app's steps to enter vehicle details, capture photos, and generate the report.",
    },
    {
      question: "How do I add or edit vehicles?",
      answer: "In the inspection form ('New Vehicle Inspection' screen), use the “Vehicle Details” section. You can add more vehicles with the 'Add Another Vehicle' button, edit the active vehicle, or select another one to edit. Once details are set, proceed to photo capture.",
    },
    {
      question: "How do I generate and share the PDF report?",
      answer: "After capturing all photos, on the 'Inspection Summary' screen, tap “Generate & Save PDF”. Once generated, the PDF will download automatically. You can also re-generate it from the list of saved inspections.",
    },
    {
      question: "Where can I find my previous inspections?",
      answer: "Access 'Inspections' from the bottom navigation bar to view your inspection history. From there, you can view details, re-download PDFs, or delete previous inspections.",
    },
  ];

  return (
    <PageContainer 
      title="Help Center" 
      showBackButton 
      onBack={() => navigate('/settings')}
    >
      <div className="p-2 text-left">
        <div className="flex flex-col items-center text-center mb-6">
          <LifeBuoy size={48} className="app-text-primary mb-3" />
          <h2 className="text-2xl font-semibold app-text-secondary">Welcome to the AutoInspect Help Center</h2>
        </div>
        
        <p className="text-gray-700 mb-6 text-sm">
          Have questions about using the app? Here you'll find answers to frequently asked questions and step-by-step guides to get the most out of AutoInspect.
        </p>

        <div className="space-y-5">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="text-md font-semibold app-text-primary mb-1.5">{faq.question}</h3>
              <p className="text-sm text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-600 mt-8">
          Can't find what you're looking for? Contact us directly through the "Contact Us" section!
        </p>
      </div>
    </PageContainer>
  );
};

export default HelpScreen;