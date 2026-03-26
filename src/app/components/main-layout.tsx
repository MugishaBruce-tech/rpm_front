import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Package, FileText, LogOut, Search, Bell, User, Flag, Menu, X, UserPlus, Settings, ChevronDown, Palette, Layers, ShieldCheck, Users, History, Globe, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { colorService } from '../services/colorService';
import { useLocaleContext } from '../contexts/LocaleContext';
import { authService } from '../services/authService';
import { apiRequest } from '../services/api';
import { ProtectedResource } from './ui/ProtectedResource';
import { OfflineStatus } from './ui/OfflineStatus';
import enFlag from '@/assets/en-flag.png';
import frFlag from '@/assets/fr-flag.png';
import headerImageLogo from '@/assets/logo3.png';

export function MainLayout() {
  const intl = useIntl();
  const navigate = useNavigate();
  const { locale, setLocale } = useLocaleContext();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#168c17');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [pendingLoansCount, setPendingLoansCount] = useState(0);
  const [pendingLoans, setPendingLoans] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const user = authService.getCurrentUser();
  const userName = user?.name || intl.formatMessage({ id: 'common.user' });

  // Safety check: If for some reason we are in MainLayout without a user, redirect to login
  useEffect(() => {
    if (!authService.isAuthenticated() || !user) {
      console.warn('[MainLayout] Authentication check failed. Redirecting...');
      toast.error('Session non trouvée. Redirection vers la connexion...');
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

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
      setCurrentTime(new Date().toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    }, 1000);

    const fetchPendingLoans = async () => {
      if (!user?.id) return;
      try {
        const response = await apiRequest(`/loans/?limit=10&offset=0`);
        const loanList: any[] = Array.isArray(response.result) ? response.result : [];
        const uid = String(user.id);
        const incoming = loanList.filter(l => 
          String(l.business_partner_key) === uid && l.bp_loan_status === 'pending'
        );
        setPendingLoans(incoming);
        setPendingLoansCount(incoming.length);
      } catch (err) {
        console.error('Failed to fetch pending loans', err);
      }
    };

    fetchPendingLoans();
    const loanTimer = setInterval(fetchPendingLoans, 30000);

    return () => {
      window.removeEventListener('colorSchemeChanged', handleColorChange);
      clearInterval(timer);
      clearInterval(loanTimer);
    };
  }, [user?.id]);

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
    if (location.pathname === '/admin/business-partners') return intl.formatMessage({ id: 'sidebar.business_partners' });
    if (location.pathname === '/admin/brarudi-users') return intl.formatMessage({ id: 'sidebar.brarudi_users' });
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
    setLocale(lang);
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
        fixed inset-y-0 left-0 z-[60]
        w-72 bg-white border-r border-slate-200 flex flex-col shadow-2xl lg:shadow-none
        transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:static lg:transform-none'}
      `}>
        {/* Close button for mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors bg-white shadow-sm border border-slate-100 z-[70]"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>

        {/* Sidebar Logo */}
        {/* <div className="px-6 py-6 border-b border-slate-100 bg-slate-50/10">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-slate-700" strokeWidth={1.5} />
            <span className="text-[15px] font-bold text-slate-900 tracking-tight">Brarudi RPM Tracker</span>
          </div>
        </div> */}
        {/* User Profile */}
        <div className="p-6 border-b border-slate-200 mt-2 lg:mt-0">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-200/50"
              style={{ backgroundColor: primaryColor }}
            >
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 leading-tight truncate">{userName}</p>
              <div className="mt-1 flex flex-col gap-0.5">
                {user?.role && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest truncate" style={{ color: primaryColor }}>
                    {intl.messages[`role.${user.role}`] ? intl.formatMessage({ id: `role.${user.role}` }) : user.role}
                  </p>
                )}
                {user?.region && (
                  <p className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1.5 truncate">
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
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/') && location.pathname === '/'
                  ? 'bg-slate-100 text-slate-900 font-normal shadow-none'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/') && location.pathname === '/' ? { color: primaryColor } : {}}
              >
                <LayoutDashboard className="w-4.5 h-4.5" strokeWidth={1.2} />
                <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.dashboard' })}</span>
              </Link>

              <Link
                to="/opco/regional-inventory"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/opco/regional-inventory')
                  ? 'bg-slate-100'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/opco/regional-inventory') ? { color: primaryColor } : {}}
              >
                <Layers className="w-4.5 h-4.5" strokeWidth={1.2} />
                <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.regional_inventory' })}</span>
              </Link>

              <Link
                to="/opco/regional-loans"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/opco/regional-loans')
                  ? 'bg-slate-100'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/opco/regional-loans') ? { color: primaryColor } : {}}
              >
                <FileText className="w-4.5 h-4.5" strokeWidth={1.2} />
                <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.regional_loans' })}</span>
              </Link>

              <Link
                to="/admin/business-partners"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/admin/business-partners')
                  ? 'bg-slate-100'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/admin/business-partners') ? { color: primaryColor } : {}}
              >
                <Users className="w-4.5 h-4.5" strokeWidth={1.2} />
                <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.business_partners' })}</span>
              </Link>
            </>
          ) : user.role === 'DDM' ? (
            /* DDM VIEW — Same pages as OPCO but region is locked (no switcher) */
            <>
              <Link
                to="/"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/') && location.pathname === '/'
                  ? 'bg-slate-100 text-slate-900 font-normal shadow-none'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/') && location.pathname === '/' ? { color: primaryColor } : {}}
              >
                <LayoutDashboard className="w-4.5 h-4.5" strokeWidth={1.2} />
                <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.dashboard' })}</span>
              </Link>

              <Link
                to="/opco/regional-inventory"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/opco/regional-inventory')
                  ? 'bg-slate-100'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/opco/regional-inventory') ? { color: primaryColor } : {}}
              >
                <Layers className="w-4.5 h-4.5" strokeWidth={1.2} />
                <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.regional_inventory' })}</span>
              </Link>

              <Link
                to="/opco/regional-loans"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/opco/regional-loans')
                  ? 'bg-slate-100'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/opco/regional-loans') ? { color: primaryColor } : {}}
              >
                <FileText className="w-4.5 h-4.5" strokeWidth={1.2} />
                <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.regional_loans' })}</span>
              </Link>

              <Link
                to="/admin/business-partners"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/admin/business-partners')
                  ? 'bg-slate-100'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
                style={isActive('/admin/business-partners') ? { color: primaryColor } : {}}
              >
                <Users className="w-4.5 h-4.5" strokeWidth={1.2} />
                <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.business_partners' })}</span>
              </Link>
            </>
          ) : (
            /* FULL VIEW FOR MD_AGENT / OTHERS */
            <>
              {/* Dashboard & Management (Visible to all except restricted roles or specific exclusions) */}
              <>
                <Link
                  to="/"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/') && location.pathname === '/'
                    ? 'bg-slate-100'
                    : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  style={isActive('/') && location.pathname === '/' ? { color: primaryColor } : {}}
                >
                  <LayoutDashboard className="w-4.5 h-4.5" strokeWidth={1.2} />
                  <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.dashboard' })}</span>
                </Link>

                {/* Individual stock/loans ONLY if NOT MD_AGENT */}
                {user.role !== 'MD_AGENT' && (
                  <>
                    <Link
                      to="/stock-management"
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/stock-management')
                        ? 'bg-slate-100'
                        : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      style={isActive('/stock-management') ? { color: primaryColor } : {}}
                    >
                      <Layers className="w-4.5 h-4.5" strokeWidth={1.2} />
                      <span className="tracking-tight">{intl.formatMessage({ id: 'inventory.title' })}</span>
                    </Link>

                    <Link
                      to="/loans"
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/loans')
                        ? 'bg-slate-100'
                        : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      style={isActive('/loans') ? { color: primaryColor } : {}}
                    >
                      <FileText className="w-4.5 h-4.5" strokeWidth={1.2} />
                      <span className="tracking-tight">{intl.formatMessage({ id: 'loans.title' })}</span>
                    </Link>
                  </>
                )}

                {/* Regional/Global views for MD_AGENT at the top level */}
                {user.role === 'MD_AGENT' && (
                  <>
                    <Link
                      to="/opco/regional-inventory"
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/opco/regional-inventory')
                        ? 'bg-slate-100'
                        : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      style={isActive('/opco/regional-inventory') ? { color: primaryColor } : {}}
                    >
                      <Layers className="w-4.5 h-4.5" strokeWidth={1.2} />
                      <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.regional_inventory' })}</span>
                    </Link>

                    <Link
                      to="/opco/regional-loans"
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/opco/regional-loans')
                        ? 'bg-slate-100'
                        : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      style={isActive('/opco/regional-loans') ? { color: primaryColor } : {}}
                    >
                      <FileText className="w-4.5 h-4.5" strokeWidth={1.2} />
                      <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.regional_loans' })}</span>
                    </Link>
                  </>
                )}

                <ProtectedResource action="STOCK_VIEW_REGIONAL">
                  <div className="pt-4 pb-2 mt-2">
                    <p className="px-3 text-[11px] font-normal text-slate-400 uppercase tracking-widest mb-1 opacity-70">
                      {intl.formatMessage({ id: 'sidebar.admin_management' })}
                    </p>

                    {/* <Link
                      to="/admin/users-stock"
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/admin/users-stock')
                        ? 'bg-slate-100'
                        : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      style={isActive('/admin/users-stock') ? { color: primaryColor } : {}}
                    >
                      <Package className="w-4.5 h-4.5" strokeWidth={1.2} />
                      <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.users_stock' })}</span>
                    </Link> */}

                    {/* <Link
                      to="/admin/users-loans"
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/admin/users-loans')
                        ? 'bg-slate-100'
                        : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      style={isActive('/admin/users-loans') ? { color: primaryColor } : {}}
                    >
                      <FileText className="w-4.5 h-4.5" strokeWidth={1.2} />
                      <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.users_loans' })}</span>
                    </Link> */}

                    <ProtectedResource action="AUDIT_VIEW">
                      <Link
                        to="/admin/audit-logs"
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/admin/audit-logs')
                          ? 'bg-slate-100'
                          : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        style={isActive('/admin/audit-logs') ? { color: primaryColor } : {}}
                      >
                        <History className="w-4.5 h-4.5" strokeWidth={1.2} />
                        <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.audit_logs' })}</span>
                      </Link>
                    </ProtectedResource>
                  </div>
                </ProtectedResource>
              </>

              {/* Settings Menu */}
              <ProtectedResource action="SETTINGS_MANAGE">
                <div className="space-y-1">
                  <button
                    onClick={() => toggleMenu('settings')}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 w-full text-sm rounded-lg transition-all ${isActive('/settings/users') || expandedMenu === 'settings'
                      ? 'text-slate-900 bg-slate-50/50'
                      : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-4.5 h-4.5" strokeWidth={1.2} />
                      <span className="tracking-tight">{intl.formatMessage({ id: 'sidebar.settings' })}</span>
                    </div>
                    <ChevronDown
                      className="w-4 h-4 transition-transform opacity-40"
                      style={{ transform: expandedMenu === 'settings' ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                    />
                  </button>

                  {/* Submenu */}
                  {expandedMenu === 'settings' && (
                    <div className="space-y-1 ml-4 border-l border-slate-100">
                      <ProtectedResource action="USER_CREATE_REGION">
                        <Link
                          to="/admin/brarudi-users"
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 text-sm transition-all block ml-2 rounded-lg ${isActive('/admin/brarudi-users')
                            ? 'bg-slate-100'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                          style={isActive('/admin/brarudi-users') ? { color: primaryColor } : {}}
                        >
                          <span className="tracking-tight font-normal">{intl.formatMessage({ id: 'sidebar.brarudi_users' })}</span>
                        </Link>
                        
                        <Link
                          to="/admin/business-partners"
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 text-sm transition-all block ml-2 rounded-lg ${isActive('/admin/business-partners')
                            ? 'bg-slate-100'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                          style={isActive('/admin/business-partners') ? { color: primaryColor } : {}}
                        >
                          <span className="tracking-tight font-normal">{intl.formatMessage({ id: 'sidebar.business_partners' })}</span>
                        </Link>
                      </ProtectedResource>

                      <ProtectedResource action="SETTINGS_MANAGE">
                        <Link
                          to="/settings/appearance"
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 text-sm transition-all block ml-2 rounded-lg ${isActive('/settings/appearance')
                            ? 'bg-slate-100'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                          style={isActive('/settings/appearance') ? { color: primaryColor } : {}}
                        >
                          <span className="tracking-tight font-normal">{intl.formatMessage({ id: 'sidebar.color_settings' })}</span>
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
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 w-full transition-all rounded-lg group"
          >
            <LogOut className="w-4.5 h-4.5 transition-transform group-hover:-translate-x-1" strokeWidth={2} />
            <span className="tracking-tight">{intl.formatMessage({ id: 'Header.deconnexion' })}</span>
          </button>
        </div>

        {/* Footer Card */}
        {user.name && (
          <div className="m-4 p-4 text-white rounded-sm shadow-sm" style={{ backgroundColor: primaryColor }}>
            <h4 className="text-sm font-medium mb-1 truncate">{user.name}</h4>
            <p className="text-xs mb-3" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              {user.role ? (intl.messages[`role.${user.role}`] ? intl.formatMessage({ id: `role.${user.role}` }) : user.role) : intl.formatMessage({ id: 'common.connected' })}
            </p>
            <button 
              onClick={() => navigate('/')}
              className="text-xs font-medium px-3 py-1.5 w-full bg-white hover:bg-slate-50 transition-colors rounded-sm" 
              style={{ color: primaryColor }}
            >
              {intl.formatMessage({ id: 'sidebar.view_reports' })}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top Header */}
        <header 
          className="text-white px-4 sm:px-6 py-3 relative overflow-hidden" 
          style={{ 
            backgroundColor: '#168c17',
            backgroundImage: `
              linear-gradient(45deg, #107511 25%, transparent 25%), 
              linear-gradient(-45deg, #107511 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #107511 75%), 
              linear-gradient(-45deg, transparent 75%, #107511 75%)
            `,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px'
          }}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 transition-colors hover:bg-white/10"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] leading-none text-white/40">{getTabName()}</span>
                <span className="hidden md:inline text-[9px] font-mono mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.25)', letterSpacing: '0.05em' }}>
                  {currentTime}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1 sm:gap-3">
                <button
                  onClick={() => handleLanguageChange('fr')}
                  className={`p-0.5 transition-all hover:scale-110 active:scale-95 rounded-full border-2 ${locale === 'fr' ? 'border-white opacity-100' : 'border-transparent opacity-60'}`}
                  title="Français"
                >
                  <img src={frFlag} alt="FR" className="w-5 h-5 sm:w-6 sm:h-6 object-cover rounded-full shadow-sm" />
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`p-0.5 transition-all hover:scale-110 active:scale-95 rounded-full border-2 ${locale === 'en' ? 'border-white opacity-100' : 'border-transparent opacity-60'}`}
                  title="English"
                >
                  <img src={enFlag} alt="EN" className="w-5 h-5 sm:w-6 sm:h-6 object-cover rounded-full shadow-sm" />
                </button>
              </div>
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-1.5 transition-colors hover:bg-white/10 rounded-full"
              >
                <Bell className="w-4 h-4" />
                {pendingLoansCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-primary" style={{ borderColor: primaryColor }}>
                    {pendingLoansCount > 9 ? '9+' : pendingLoansCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2 sm:gap-3 border-l border-white/10 pl-2 sm:pl-4 ml-1 sm:ml-2">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none opacity-40">RPM Tracker</span>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center overflow-hidden">
                   <img src={headerImageLogo} alt="Brarudi Logo" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>
          </div>

              {/* Notifications Dropdown */}
              {isNotificationsOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsNotificationsOpen(false)} 
                  />
                  <div className="absolute top-12 right-0 w-[360px] max-h-[480px] bg-white rounded-lg shadow-xl z-50 overflow-hidden text-slate-900 border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-xl font-bold tracking-tight">Notifications</h3>
                      <button className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                        <MoreHorizontal className="w-5 h-5 text-slate-500" />
                      </button>
                    </div>
                    
                    <div className="overflow-y-auto max-h-[400px]">
                      {pendingLoans.length > 0 ? (
                        <div className="p-2">
                          <div className="px-2 py-1 mb-1">
                            <h4 className="text-sm font-semibold text-slate-900">Nouveau</h4>
                          </div>
                          {pendingLoans.map((loan, idx) => {
                            const materialName = loan.material?.material_name2 || loan.material?.material_description || 'Inconnu';
                            const borrowerName = loan.borrower?.business_partner_name || loan.external_party_name || 'Inconnu';
                            const date = new Date(loan.created_at);
                            
                            return (
                              <Link
                                key={loan.id || idx}
                                to="/loans"
                                onClick={() => setIsNotificationsOpen(false)}
                                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group relative"
                              >
                                <div className="relative flex-shrink-0">
                                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm">
                                    <User className="w-7 h-7 text-slate-400" />
                                  </div>
                                  <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white shadow-sm">
                                    <FileText className="w-3 h-3 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0 pr-4">
                                  <p className="text-xs sm:text-[14px] leading-tight text-slate-700">
                                    <span className="font-bold text-slate-900">{borrowerName}</span> a demandé un prêt de <span className="font-bold text-slate-900">{loan.bp_loan_qty_in_base_uom} {materialName}</span>.
                                  </p>
                                  <p className="text-[12px] font-semibold text-blue-600 mt-1">
                                    {formatDistanceToNow(date, { 
                                      addSuffix: true, 
                                      locale: locale === 'fr' ? fr : enUS 
                                    })}
                                  </p>
                                </div>
                                <div className="flex-shrink-0 self-center">
                                  <div className="w-3 h-3 bg-blue-600 rounded-full" />
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Bell className="w-8 h-8 text-slate-300" />
                          </div>
                          <p className="text-slate-500 font-medium">Vous n'avez pas de nouvelles notifications</p>
                          <p className="text-slate-400 text-sm mt-1">Les demandes de prêt entrantes apparaîtront ici.</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 border-t border-slate-100 bg-slate-50/30 text-center">
                      <Link 
                        to="/loans"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        Voir toutes les demandes
                      </Link>
                    </div>
                  </div>
                </>
              )}
        </header>



        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        
        <OfflineStatus />
      </div>
    </div>
  );
}