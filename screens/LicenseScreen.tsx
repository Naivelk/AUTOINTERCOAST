
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer.tsx';
import { Award } from 'lucide-react';

const LicenseScreen: React.FC = () => {
  const navigate = useNavigate();

  const licenseText = `
MIT License

Copyright (c) 2025 Kevin Santiago Quimbaya Andrade

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
  `;

  return (
    <PageContainer 
      title="License Information" 
      showBackButton 
      onBack={() => navigate('/settings')}
    >
      <div className="p-2">
        <div className="flex flex-col items-center text-center mb-6">
          <Award size={48} className="app-text-primary mb-3" />
          <h2 className="text-2xl font-semibold app-text-secondary">Software License</h2>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <pre className="whitespace-pre-wrap text-xs sm:text-sm text-gray-700 font-mono leading-relaxed">
            {licenseText.trim()}
          </pre>
        </div>
      </div>
    </PageContainer>
  );
};

export default LicenseScreen;