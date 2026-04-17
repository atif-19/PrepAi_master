import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, BarChart2, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_LINKS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/topics',    icon: BookOpen,        label: 'Practice'  },
  { path: '/progress',  icon: BarChart2,       label: 'Progress'  },
  { path: '/settings',  icon: Settings,        label: 'Settings'  },
];

const Navbar = () => {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* Brand */}
        <Link to="/dashboard" className="text-xl font-bold text-white">
          Prep<span className="text-indigo-400">AI</span>
        </Link>

        {/* Links */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(({ path, icon: Icon, label }) => {
            const isActive = pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition
                  ${isActive
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* User + Logout */}
        <div className="flex items-center gap-3">
          {user?.name && (
            <span className="text-xs text-gray-500 hidden sm:block">
              {user.name.split(' ')[0]}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 text-sm transition px-2 py-1.5 rounded-lg hover:bg-gray-800"
          >
            <LogOut size={15} />
            <span className="hidden sm:block">Logout</span>
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;