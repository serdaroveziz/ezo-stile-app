import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LANGUAGES } from '../utils/translations';
import { Scissors, UserCheck, Shield, UserCog, LogOut, Upload, Globe, Lock, Eye, EyeOff, X } from './Icons';

export const Header = () => {
  const { 
    currentUser, 
    logoutCustomer, 
    activeRole, 
    setActiveRole,
    isAdminAuthenticated,
    isManagerAuthenticated,
    loginAdmin,
    loginManager,
    logoutStaffRole,
    shopSettings,
    updateCustomLogo,
    language,
    setLanguage,
    t
  } = useApp();

  const [authModalRole, setAuthModalRole] = useState(null); // 'admin' | 'manager' | null
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCustomLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRoleTabClick = (role) => {
    if (role === 'customer') {
      setActiveRole('customer');
      return;
    }

    if (role === 'admin') {
      if (isAdminAuthenticated) {
        setActiveRole('admin');
      } else {
        setPasswordInput('');
        setPasswordError(false);
        setShowPassword(false);
        setAuthModalRole('admin');
      }
    } else if (role === 'manager') {
      if (isManagerAuthenticated || isAdminAuthenticated) {
        setActiveRole('manager');
      } else {
        setPasswordInput('');
        setPasswordError(false);
        setShowPassword(false);
        setAuthModalRole('manager');
      }
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordError(false);

    if (authModalRole === 'admin') {
      const success = loginAdmin(passwordInput.trim());
      if (success) {
        setAuthModalRole(null);
        setPasswordInput('');
      } else {
        setPasswordError(true);
      }
    } else if (authModalRole === 'manager') {
      const success = loginManager(passwordInput.trim());
      if (success) {
        setAuthModalRole(null);
        setPasswordInput('');
      } else {
        setPasswordError(true);
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800 px-4 py-3 shadow-xl">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Logo & Brand Info */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="logo-sharp-container relative group cursor-pointer w-12 h-12 rounded-xl bg-slate-950 border-2 border-amber-500/70 shadow-lg shadow-amber-500/20 overflow-hidden flex items-center justify-center">
              <img 
                src={shopSettings.customLogo || '/insta.png'} 
                onError={(e) => { e.target.onerror = null; e.target.src = '/insta.png'; }}
                alt="GOLDCUT Logo" 
                className="w-full h-full object-cover" 
              />
              {activeRole === 'admin' && (
                <label className="absolute inset-0 bg-slate-950/80 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-amber-400 font-bold transition-opacity cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-100 font-heading">
                  {shopSettings.name}
                </h1>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  shopSettings.isShopOpen 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  ● {shopSettings.isShopOpen ? t('open') : t('closed')}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">{t('subtitle')}</p>
            </div>
          </div>

          {/* Customer Logged In Badge (Mobile View) */}
          {currentUser && activeRole === 'customer' && (
            <div className="flex md:hidden items-center gap-1.5 bg-slate-900/80 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-slate-200 truncate max-w-[90px]">{currentUser.name}</span>
            </div>
          )}
        </div>

        {/* Right Section: Language Selector & Role Switcher & User Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap sm:flex-nowrap">
          
          {/* Language Selector Dropdown */}
          <div className="relative group bg-slate-900/90 rounded-xl border border-slate-800 p-1 flex items-center gap-1 text-xs">
            <Globe className="w-4 h-4 text-amber-400 ml-1.5" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-slate-200 font-bold text-xs pr-2 py-1 focus:outline-none cursor-pointer border-none"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-slate-950 text-slate-100 font-semibold">
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Selector Tabs (Visible ONLY for Authenticated Staff) */}
          {(isAdminAuthenticated || isManagerAuthenticated) && (
            <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
              <button
                onClick={() => handleRoleTabClick('customer')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                  activeRole === 'customer' 
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>{t('customer')}</span>
              </button>

              <button
                onClick={() => handleRoleTabClick('admin')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                  activeRole === 'admin' 
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{t('admin')}</span>
              </button>

              <button
                onClick={() => handleRoleTabClick('manager')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                  activeRole === 'manager' 
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <UserCog className="w-3.5 h-3.5" />
                <span>{t('manager')}</span>
              </button>
            </div>
          )}

          {/* Customer Logout */}
          {currentUser && activeRole === 'customer' && (
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-200">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400">{currentUser.phone}</p>
              </div>
              <button
                onClick={logoutCustomer}
                title={t('logoutBtn')}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Admin / Manager Logout Staff Button */}
          {(activeRole === 'admin' || activeRole === 'manager') && (
            <button
              onClick={logoutStaffRole}
              title={t('logoutBtn')}
              className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t('logoutBtn')}</span>
            </button>
          )}

        </div>

      </div>

      {/* Password Authentication Modal for Admin/Manager */}
      {authModalRole && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => setAuthModalRole(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl gold-gradient-btn flex items-center justify-center mx-auto mb-4 text-slate-950 shadow-xl shadow-amber-500/20">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-center text-slate-100 font-heading">
              {authModalRole === 'admin' ? t('admin') : t('manager')} {t('loginTitle')}
            </h3>
            <p className="text-xs text-center text-slate-400 mt-1 mb-5">
              {t('enterPasswordDesc')}
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('passwordPlaceholder')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoFocus
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-100 placeholder-slate-600 rounded-xl pl-4 pr-10 py-3 text-sm font-semibold tracking-wider outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-amber-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs px-3.5 py-2.5 rounded-xl font-medium">
                  {t('invalidPassword')}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthModalRole(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-4 rounded-xl text-xs transition-all"
                >
                  {t('cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="flex-1 gold-gradient-btn text-slate-950 font-bold py-3 px-4 rounded-xl text-xs shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all"
                >
                  {t('loginBtn')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </header>
  );
};

