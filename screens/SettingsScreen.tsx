
import React from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer.tsx';
// Removed Button import as it's no longer used after LogOut button removal
import { User, HelpCircle, Mail, FileText, ShieldCheck, Award } from 'lucide-react'; // Removed LogOut
import { SettingsItemType } from '../types.ts';



const SettingsItem: React.FC<{ item: SettingsItemType }> = ({ item }) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (item.action) item.action();
    else if (item.path) navigate(item.path);
    else toast(`${item.label} clicked, but no action or path is defined.`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center p-4 bg-white hover:bg-slate-50 rounded-lg shadow transition-colors border border-gray-200"
      aria-label={item.label}
    >
      <item.icon className="app-text-primary mr-4" size={24} />
      <span className="text-gray-700 font-medium">{item.label}</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-gray-400"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </button>
  );
};


const SettingsScreen: React.FC = () => {
  // const navigate = useNavigate(); // No longer needed if Log Out is the only navigation
  // const context = useContext(InspectionContext); // No longer needed if Log Out is the only context usage

  // const handleLogout = () => { // Removed
  //   if (context?.resetInspection) {
  //     context.resetInspection();
  //   }
  //   alert("You have been logged out. Current inspection data has been cleared.");
  //   navigate('/home'); 
  // };
  
  const accountItems: SettingsItemType[] = [
    { id: 'profile', label: 'Profile', icon: User, path: '/settings/profile' },
  ];

  const supportItems: SettingsItemType[] = [
    { id: 'help', label: 'Help Center', icon: HelpCircle, path: '/settings/help' },
    { id: 'contact', label: 'Contact Us', icon: Mail, path: '/settings/contact' }, 
    { id: 'terms', label: 'Terms of Service', icon: FileText, path: '/settings/terms' },
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck, path: '/settings/privacy' },
    { id: 'license', label: 'License', icon: Award, path: '/settings/license' }, 
  ];


  return (
    <PageContainer title="Settings">
      <div className="space-y-8 p-1 pb-6"> {/* Added pb-6 for some bottom padding */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Account</h2>
          <div className="space-y-3">
            {accountItems.map(item => <SettingsItem key={item.id} item={item} />)}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Support</h2>
          <div className="space-y-3">
            {supportItems.map(item => <SettingsItem key={item.id} item={item} />)}
          </div>
        </div>
        
        {/* Log Out Button Section Removed
        <div className="pt-6">
          <Button 
            onClick={handleLogout} 
            variant="outline" 
            className="w-full app-text-primary app-border-primary hover:app-bg-primary hover:text-white"
            aria-label="Log Out"
          >
            <LogOut size={20} className="mr-2" />
            Log Out
          </Button>
        </div>
        */}
      </div>
    </PageContainer>
  );
};

export default SettingsScreen;
