
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer.tsx';
import Input from '../components/Input.tsx';
import Button from '../components/Button.tsx';
import { UserCircle, Save, Hash } from 'lucide-react';
import { getDefaultAgentName, saveDefaultAgentName, getInspections } from '../services/inspectionService.ts';
import { InspectionContext } from '../App.tsx';


const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const [agentName, setAgentName] = useState<string>('');
  const [initialAgentName, setInitialAgentName] = useState<string>('');
  const [totalInspections, setTotalInspections] = useState<number>(0);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const context = useContext(InspectionContext);

  useEffect(() => {
    const currentDefaultAgentName = getDefaultAgentName();
    setAgentName(currentDefaultAgentName);
    setInitialAgentName(currentDefaultAgentName);
    getInspections().then(list => setTotalInspections(list.length));
  }, []);

  const handleSaveAgentName = () => {
    saveDefaultAgentName(agentName);
    setInitialAgentName(agentName); // Update initial name to reflect saved state
    setIsSaved(true);
    // Optionally, update currentInspection in context if an inspection is active
    // and its agentName was the one just changed.
    if (context && context.currentInspection.agentName === initialAgentName && initialAgentName !== agentName) {
        context.setCurrentInspection(prev => ({...prev, agentName: agentName}));
    } else if (context && !context.currentInspection.agentName && agentName) { // If initial context agentName was empty
        context.setCurrentInspection(prev => ({...prev, agentName: agentName}));
    }
    setTimeout(() => setIsSaved(false), 2000); // Hide message after 2 seconds
  };

  return (
    <PageContainer 
      title="Profile" 
      showBackButton 
      onBack={() => navigate('/settings')}
    >
      <div className="space-y-6 p-1">
        <section className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <UserCircle size={32} className="app-text-primary mr-3" />
            <h2 className="text-xl font-semibold app-text-secondary">Agent Information</h2>
          </div>
          <Input 
            label="Default Agent Name"
            value={agentName}
            onChange={(e) => {
                setAgentName(e.target.value);
                if(isSaved) setIsSaved(false); // Reset saved message on new input
            }}
            placeholder="Enter your default agent name"
          />
          <Button onClick={handleSaveAgentName} className="w-full mt-2" disabled={agentName === initialAgentName && !isSaved}>
            <Save size={18} className="mr-2" />
            {agentName === initialAgentName && isSaved ? "Saved!" : "Save Default Name"}
          </Button>
          {isSaved && <p className="text-sm text-green-600 mt-2 text-center">Default agent name updated successfully!</p>}
           <p className="text-xs text-gray-500 mt-2">
            This name will be used by default for new inspections.
          </p>
        </section>

        <section className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center mb-3">
                <Hash size={28} className="app-text-primary mr-3" />
                <h2 className="text-xl font-semibold app-text-secondary">Inspection Statistics</h2>
            </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-700">Total Inspections Completed:</p>
            <p className="text-lg font-bold app-text-primary">{totalInspections}</p>
          </div>
        </section>
      </div>
    </PageContainer>
  );
};

export default ProfileScreen;