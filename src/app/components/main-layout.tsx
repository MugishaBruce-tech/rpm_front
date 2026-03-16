import { Outlet, Link, useLocation } from 'react-router';
import { LayoutDashboard, Package, FileText, LogOut, Search, Bell, User, Flag, Menu, X, UserPlus, Settings, ChevronDown, Palette, Layers, ShieldCheck, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { colorService } from '../services/colorService';
import { ProtectedResource } from './ui/ProtectedResource';
import brLogo from '@/assets/br-logo.png';
import enFlag from '@/assets/en-flag.png';
import frFlag from '@/assets/fr-flag.png';

export function MainLayout() {
  const intl = useIntl();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#168c17');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  const user = JSON.parse(localStorage.getItem('rpm-tracker-auth-user') || localStorage.getItem('user') || '{}');
  const userName = user.name || intl.formatMessage({ id: 'common.user' });

  useEffect(() => {
    // Get initial color
    setPrimaryColor(colorService.getColorScheme());

    // Listen for color changes
    const handleColorChange = (event: any) => {
      setPrimaryColor(event.detail.color);
    };

    window.addEventListener('colorSchemeChanged', handleColorChange);

    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    }, 1000);

    return () => {
      window.removeEventListener('colorSchemeChanged', handleColorChange);
      clearInterval(timer);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getTabName = () => {
    if (location.pathname === '/') return intl.formatMessage({ id: 'dashboard.overview' });
    if (location.pathname === '/stock-management') return intl.formatMessage({ id: 'inventory.title' });
    if (location.pathname === '/loans') return intl.formatMessage({ id: 'loans.title' });
    if (location.pathname.startsWith('/settings/users')) return intl.formatMessage({ id: 'sidebar.user_management' });
    if (location.pathname === '/settings/appearance') return intl.formatMessage({ id: 'sidebar.color_settings' });
    if (location.pathname === '/user-management') return intl.formatMessage({ id: 'sidebar.create_user' });
    return intl.formatMessage({ id: 'dashboard.overview' });
  };

  const toggleMenu = (menuName: string) => {
    setExpandedMenu(expandedMenu === menuName ? null : menuName);
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: intl.formatMessage({ id: 'Header.deconnexion' }),
      text: intl.formatMessage({ id: 'sidebar.logout' }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: primaryColor,
      cancelButtonColor: '#bb0f0fff',
      confirmButtonText: intl.formatMessage({ id: 'sidebar.logout_confirm' }),
      cancelButtonText: intl.formatMessage({ id: 'sidebar.logout_cancel' })
    });

    if (result.isConfirmed) {
      localStorage.removeItem('rpm-tracker-auth-token');
      localStorage.removeItem('rpm-tracker-auth-refresh');
      localStorage.removeItem('rpm-tracker-auth-user');
      localStorage.removeItem('user');

      toast.success(intl.formatMessage({ id: 'sidebar.logout_success' }));

      window.location.href = '/login';
    }
  };

  const handleLanguageChange = (lang: string) => {
    localStorage.setItem('app-locale', lang);
    window.location.reload();
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-slate-200 flex flex-col shadow-2xl lg:shadow-none
        transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Close button for mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-slate-100"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>

        {/* User Profile */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-normal text-slate-900 truncate tracking-tight">{userName}</h3>
              <div className="mt-1 flex flex-col gap-0.5">
                {user.role && (
                  <p className="text-[10px] font-semibold text-[#0b680c] uppercase tracking-widest">
                    {user.role}
                  </p>
                )}
                {user.region && (
                  <p className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    {user.region.toUpperCase()} {intl.formatMessage({ id: 'common.region' }).toUpperCase()}
                  </p>
                )}
              </div>
            </div>
          </div>

    
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {user.role === 'OPCO_USER' ? (
            /* SIMPLE VIEW FOR OPCO USER */
            <>
              <Link
                to="/"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors ${isActive('/') && location.pathname === '/'
                  ? 'text-white font-medium shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/') && location.pathname === '/' ? { backgroundColor: primaryColor } : {}}
              >
                <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
                {intl.formatMessage({ id: 'sidebar.dashboard' })}
              </Link>

              <Link
                to="/opco/regional-inventory"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors ${isActive('/opco/regional-inventory')
                  ? 'text-white font-medium shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/opco/regional-inventory') ? { backgroundColor: primaryColor } : {}}
              >
                <Layers className="w-4 h-4" strokeWidth={1.5} />
                {intl.formatMessage({ id: 'sidebar.regional_inventory' })}
              </Link>

              <Link
                to="/opco/regional-loans"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors ${isActive('/opco/regional-loans')
                  ? 'text-white font-medium shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/opco/regional-loans') ? { backgroundColor: primaryColor } : {}}
              >
                <FileText className="w-4 h-4" strokeWidth={1.5} />
                {intl.formatMessage({ id: 'sidebar.regional_loans' })}
              </Link>

              <Link
                to="/opco/users"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors ${isActive('/opco/users')
                  ? 'text-white font-medium shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/opco/users') ? { backgroundColor: primaryColor } : {}}
              >
                <Users className="w-4 h-4" strokeWidth={1.5} />
                {intl.formatMessage({ id: 'sidebar.users_list' })}
              </Link>
            </>
          ) : user.role === 'DDM' ? (
            /* DDM VIEW — Same pages as OPCO but region is locked (no switcher) */
            <>
              <Link
                to="/"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors ${isActive('/') && location.pathname === '/'
                  ? 'text-white font-medium shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/') && location.pathname === '/' ? { backgroundColor: primaryColor } : {}}
              >
                <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
                {intl.formatMessage({ id: 'sidebar.dashboard' })}
              </Link>

              <Link
                to="/opco/regional-inventory"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors ${isActive('/opco/regional-inventory')
                  ? 'text-white font-medium shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/opco/regional-inventory') ? { backgroundColor: primaryColor } : {}}
              >
                <Layers className="w-4 h-4" strokeWidth={1.5} />
                {intl.formatMessage({ id: 'sidebar.regional_inventory' })}
              </Link>

              <Link
                to="/opco/regional-loans"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors ${isActive('/opco/regional-loans')
                  ? 'text-white font-medium shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/opco/regional-loans') ? { backgroundColor: primaryColor } : {}}
              >
                <FileText className="w-4 h-4" strokeWidth={1.5} />
                {intl.formatMessage({ id: 'sidebar.regional_loans' })}
              </Link>

              <Link
                to="/opco/users"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors ${isActive('/opco/users')
                  ? 'text-white font-medium shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/opco/users') ? { backgroundColor: primaryColor } : {}}
              >
                <Users className="w-4 h-4" strokeWidth={1.5} />
                {intl.formatMessage({ id: 'sidebar.users_list' })}
              </Link>
            </>
          ) : (
            /* FULL VIEW FOR MD_AGENT / OTHERS */
            <>
              {user.role !== 'MD_AGENT' && (
                <>
                  <Link
                    to="/"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors ${isActive('/') && location.pathname === '/'
                      ? 'text-white font-medium shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    style={isActive('/') && location.pathname === '/' ? { backgroundColor: primaryColor } : {}}
                  >
                    <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
                    {intl.formatMessage({ id: 'sidebar.dashboard' })}
                  </Link>

                  <Link
                    to="/stock-management"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors ${isActive('/stock-management')
                      ? 'text-white font-medium shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    style={isActive('/stock-management') ? { backgroundColor: primaryColor } : {}}
                  >
                    <Layers className="w-4 h-4" strokeWidth={1.5} />
                    {intl.formatMessage({ id: 'inventory.title' })}
                  </Link>

                  <Link
                    to="/loans"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors ${isActive('/loans')
                      ? 'text-white font-medium shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    style={isActive('/loans') ? { backgroundColor: primaryColor } : {}}
                  >
                    <FileText className="w-4 h-4" strokeWidth={1.5} />
                    {intl.formatMessage({ id: 'loans.title' })}
                  </Link>

                  <ProtectedResource action="STOCK_VIEW_REGIONAL">
                    <div className="pt-2 pb-1 border-t border-slate-100 mt-2">
                      <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        {intl.formatMessage({ id: 'sidebar.admin_management' })}
                    </p>
                      
                      <Link
                        to="/admin/users-stock"
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors ${isActive('/admin/users-stock')
                          ? 'text-white font-medium shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        style={isActive('/admin/users-stock') ? { backgroundColor: primaryColor } : {}}
                      >
                        <Package className="w-4 h-4" strokeWidth={1.5} />
                        {intl.formatMessage({ id: 'sidebar.users_stock' })}
                      </Link>

                      <Link
                        to="/admin/users-loans"
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors ${isActive('/admin/users-loans')
                          ? 'text-white font-medium shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        style={isActive('/admin/users-loans') ? { backgroundColor: primaryColor } : {}}
                      >
                        <FileText className="w-4 h-4" strokeWidth={1.5} />
                        {intl.formatMessage({ id: 'sidebar.users_loans' })}
                      </Link>
                    </div>
                  </ProtectedResource>
                </>
              )}

              {/* Settings Menu */}
              <ProtectedResource action="SETTINGS_MANAGE">
                <div className="space-y-1">
                  <button
                    onClick={() => toggleMenu('settings')}
                    className={`flex items-center justify-between gap-3 px-3 py-2 w-full text-sm transition-colors ${isActive('/settings/users') || expandedMenu === 'settings'
                      ? 'text-slate-900 hover:bg-slate-50'
                      : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-4 h-4" strokeWidth={1.5} />
                      <span>{intl.formatMessage({ id: 'sidebar.settings' })}</span>
                    </div>
                    <ChevronDown
                      className="w-4 h-4 transition-transform"
                      style={{ transform: expandedMenu === 'settings' ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </button>

                  {/* Submenu */}
                  {expandedMenu === 'settings' && (
                    <div className="space-y-1 ml-4 border-l border-slate-200">
                      <ProtectedResource action="USER_CREATE_REGION">
                        <Link
                          to="/settings/users"
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors block ml-2 ${isActive('/settings/users')
                            ? 'text-white font-medium'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          style={isActive('/settings/users') ? { backgroundColor: primaryColor } : {}}
                        >
                          <UserPlus className="w-4 h-4" strokeWidth={1.5} />
                          {intl.formatMessage({ id: 'sidebar.user_management' })}
                        </Link>
                      </ProtectedResource>

                      {/* <ProtectedResource action="SETTINGS_MANAGE">
                        <Link
                          to="/settings/permissions"
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors block ml-2 ${isActive('/settings/permissions')
                            ? 'text-white font-medium'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          style={isActive('/settings/permissions') ? { backgroundColor: primaryColor } : {}}
                        >
                          <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
                          {intl.formatMessage({ id: 'sidebar.permissions_matrix' })}
                        </Link>
                      </ProtectedResource> */}

                      <ProtectedResource action="SETTINGS_MANAGE">
                        <Link
                          to="/settings/appearance"
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors block ml-2 ${isActive('/settings/appearance')
                            ? 'text-white font-medium'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          style={isActive('/settings/appearance') ? { backgroundColor: primaryColor } : {}}
                        >
                          <Palette className="w-4 h-4" strokeWidth={1.5} />
                          {intl.formatMessage({ id: 'sidebar.color_settings' })}
                        </Link>
                      </ProtectedResource>
                    </div>
                  )}
                </div>
              </ProtectedResource>
            </>
          )}
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 w-full transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            {intl.formatMessage({ id: 'Header.deconnexion' })}
          </button>
        </div>

        {/* Footer Card */}
        {user.name && (
          <div className="m-4 p-4 text-white" style={{ backgroundColor: primaryColor }}>
            <h4 className="text-sm font-medium mb-1 truncate">{user.name}</h4>
            <p className="text-xs mb-3" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              {user.role ? (intl.messages[`role.${user.role}`] ? intl.formatMessage({ id: `role.${user.role}` }) : user.role) : intl.formatMessage({ id: 'common.connected' })}
            </p>
            <button className="text-xs font-medium px-3 py-1.5 w-full bg-white hover:bg-slate-50 transition-colors" style={{ color: primaryColor }}>
              {intl.formatMessage({ id: 'sidebar.view_reports' })}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top Header */}
        <header className="text-white px-4 sm:px-6 py-3" style={{ backgroundColor: primaryColor }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 transition-colors hover:bg-white/10"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium">{intl.formatMessage({ id: 'sidebar.dashboard' })}</span>
              <span className="hidden sm:inline text-sm font-mono" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                {currentTime}
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => handleLanguageChange('fr')}
                className={`p-0.5 transition-all hover:scale-110 active:scale-95 rounded-full border-2 ${localStorage.getItem('app-locale') === 'fr' || !localStorage.getItem('app-locale') ? 'border-white opacity-100' : 'border-transparent opacity-60'}`}
                title="Français"
              >
                <img src={frFlag} alt="FR" className="w-6 h-6 object-cover rounded-full shadow-sm" />
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`p-0.5 transition-all hover:scale-110 active:scale-95 rounded-full border-2 ${localStorage.getItem('app-locale') === 'en' ? 'border-white opacity-100' : 'border-transparent opacity-60'}`}
                title="English"
              >
                <img src={enFlag} alt="EN" className="w-6 h-6 object-cover rounded-full shadow-sm" />
              </button>
              <button className="relative p-1.5 transition-colors hover:bg-white/10">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                  0
                </span>
              </button>
              <div className="flex items-center gap-2 border-l border-white/20 pl-4 ml-1">
                <img src={brLogo} alt="Logo" className="h-8 w-auto object-contain brightness-0 invert" />
                {/* <span className="hidden md:inline text-sm font-bold tracking-tight uppercase">RPM Tracker</span> */}
              </div>
            </div>
          </div>
        </header>



        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}