import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { CustomerAuth } from './components/CustomerAuth';
import { BookingFlow } from './components/BookingFlow';
import { CustomerAppointments } from './components/CustomerAppointments';
import { AdminDashboard } from './components/AdminDashboard';
import { Smartphone, Scissors, MapPin, Phone } from './components/Icons';

const MainContent = () => {
  const { currentUser, activeRole, shopSettings, t } = useApp();

  return (
    <div className="min-h-screen flex flex-col justify-between">
      
      <div>
        {/* Navigation Header */}
        <Header />

        {/* Dynamic View rendering based on Active Role */}
        <main className="pb-12">
          {activeRole === 'customer' ? (
            !currentUser ? (
              <CustomerAuth />
            ) : (
              <div className="space-y-6">
                
                {/* Mobile PWA Install Hint */}
                <div className="max-w-xl mx-auto px-4 mt-4">
                  <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/20 rounded-2xl p-3.5 flex items-center justify-between text-xs text-slate-300 shadow-md">
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="w-5 h-5 text-amber-400 shrink-0" />
                      <span>
                        <strong className="text-amber-400 font-semibold">{t('mobileTip')}</strong> {t('mobileTipMsg')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Booking Wizard */}
                <BookingFlow />

                {/* Active Appointments & Notifications */}
                <CustomerAppointments />
              </div>
            )
          ) : (
            /* Admin or Manager View */
            <AdminDashboard />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 px-4 text-center text-xs text-slate-500 space-y-2">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Scissors className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-300">{shopSettings.name}</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-amber-400" />
              {shopSettings.phone}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-amber-400" />
              {t('address')}
            </span>
          </div>

          <p className="text-[11px] text-slate-600">{t('copyright')}</p>
        </div>
      </footer>

    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
