
import React, { useContext } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, User, PlusCircle } from 'lucide-react';
import { InspectionContext } from '../App.tsx';

const BottomNav: React.FC = () => {
  const context = useContext(InspectionContext);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/home', label: 'Home', icon: Home, exact: true },
    { path: '/new-inspection', label: 'New', icon: PlusCircle, exact: false },
    { path: '/inspections', label: 'Inspections', icon: FileText, exact: false },
    { path: '/settings', label: 'Profile', icon: User, exact: false },
  ];

  const handleNewInspectionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    context?.resetInspection();
    navigate('/new-inspection');
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t shadow-top-md"
      style={{ backgroundColor: 'var(--app-color-background)', borderColor: 'var(--app-color-border)' }}
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          let isActive;
          if (item.path === '/new-inspection') {
            isActive = location.pathname.startsWith('/new-inspection') || 
                       location.pathname.startsWith('/photos') || 
                       location.pathname.startsWith('/summary');
          } else {
             isActive = item.exact 
            ? location.pathname === item.path 
            : location.pathname.startsWith(item.path);
          }
          
          const activeColor = 'var(--app-color-primary)';
          const inactiveColor = 'var(--app-color-secondary-text)';

          if (item.path === '/new-inspection') {
            return (
              <button
                key={item.label}
                onClick={handleNewInspectionClick}
                aria-label={`Start new inspection`}
                className={`flex flex-col items-center justify-center text-xs px-2 py-1 w-1/4 transition-colors duration-150`}
                style={{ color: isActive ? activeColor : inactiveColor }}
              >
                <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`mt-0.5 ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.label}
              to={item.path}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center text-xs px-2 py-1 w-1/4 transition-colors duration-150`}
              style={({ isActive: navIsActive }) => ({ // Use NavLink's isActive for styling
                color: navIsActive ? activeColor : inactiveColor 
              })}
            >
              {({ isActive: navIsActive }) => ( // Re-evaluate isActive for NavLink
                <>
                  <item.icon size={26} strokeWidth={navIsActive ? 2.5 : 2} />
                  <span className={`mt-0.5 ${navIsActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;