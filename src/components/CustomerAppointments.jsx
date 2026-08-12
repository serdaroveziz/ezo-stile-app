import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, CheckCircle2, XCircle, Bell, X, Calendar } from './Icons';

export const CustomerAppointments = () => {
  const { appointments, currentUser, notifications, dismissNotification, t } = useApp();

  if (!currentUser) return null;

  // Filter appointments for current logged in customer
  const myAppointments = appointments.filter(
    apt => apt.customerPhone === currentUser.phone
  );

  // Helper: Check if appointment is within 1 hour (0 to 60 minutes away)
  const check1HourReminder = (apt) => {
    if (apt.status !== 'approved') return false;
    try {
      const [y, m, d] = apt.date.split('-').map(Number);
      const [hh, mm] = apt.time.split(':').map(Number);
      const aptDateObj = new Date(y, m - 1, d, hh, mm);
      const now = new Date();
      const diffMin = (aptDateObj.getTime() - now.getTime()) / (1000 * 60);
      return diffMin > 0 && diffMin <= 60;
    } catch {
      return false;
    }
  };

  const upcomingReminderApt = myAppointments.find(check1HourReminder);

  useEffect(() => {
    if (upcomingReminderApt && window.Notification && Notification.permission === 'granted') {
      try {
        new Notification(t('reminderTitle'), {
          body: `${upcomingReminderApt.serviceName} — ${upcomingReminderApt.date} ${upcomingReminderApt.time}`,
          icon: './insta.png'
        });
      } catch (e) {}
    }
  }, [upcomingReminderApt]);

  const requestNotificationPermission = () => {
    if (window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  };

  return (
    <div className="max-w-xl mx-auto my-6 px-4 space-y-4">
      
      {/* 2-HOUR UPCOMING APPOINTMENT REMINDER BANNER */}
      {upcomingReminderApt && (
        <div className="bg-amber-950/90 border-2 border-amber-500 p-4 rounded-2xl shadow-2xl animate-pulse text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-lg shrink-0">⏰</div>
            <div>
              <h4 className="font-extrabold text-xs text-amber-400 uppercase tracking-wider">{t('reminderTitle')}</h4>
              <p className="text-xs text-slate-200 mt-0.5">{t('reminderDesc')}</p>
              <div className="text-xs font-bold text-amber-300 mt-1">
                📌 {upcomingReminderApt.serviceName} — ⏰ {upcomingReminderApt.date} {upcomingReminderApt.time}
              </div>
            </div>
          </div>
          {window.Notification && Notification.permission !== 'granted' && (
            <button
              type="button"
              onClick={requestNotificationPermission}
              className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl shrink-0 transition-all shadow-md"
            >
              {t('enableNotifications')}
            </button>
          )}
        </div>
      )}

      {/* Live Notification Alert Toasts */}
      {notifications.length > 0 && (
        <div className="space-y-2 animate-slide-down">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`p-4 rounded-2xl border shadow-xl flex items-start justify-between gap-3 ${
                notif.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 animate-pulse-glow'
                  : 'bg-rose-950/90 border-rose-500/50 text-rose-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl mt-0.5 ${
                  notif.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm">{notif.title}</h4>
                    <span className="text-[10px] opacity-75">{notif.timestamp}</span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed opacity-95">{notif.message}</p>
                </div>
              </div>

              <button
                onClick={() => dismissNotification(notif.id)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Appointments List Section */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-base font-heading">{t('myAppointments')}</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
            {myAppointments.length}
          </span>
        </div>

        {myAppointments.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-medium">{t('noAppointmentsYet')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myAppointments.map(apt => {
              const isUpcoming1h = check1HourReminder(apt);
              return (
                <div
                  key={apt.id}
                  className={`bg-slate-950/80 rounded-2xl p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isUpcoming1h ? 'border-amber-500/80 shadow-lg shadow-amber-500/10' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">{apt.serviceName}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-300">
                      <span className="font-semibold text-amber-400">📅 {apt.date}</span>
                      <span className="font-semibold text-amber-400">⏰ {apt.time}</span>
                      <span className="text-slate-400">({apt.duration})</span>
                    </div>

                    {isUpcoming1h && (
                      <span className="inline-block mt-1 text-[10px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full animate-pulse">
                        {t('reminderBadge')}
                      </span>
                    )}

                    <p className="text-[11px] text-slate-500">{t('priceLabel')} <strong className="text-emerald-400 font-semibold">{apt.price} TL</strong></p>
                  </div>

                  {/* Status Badges */}
                  <div className="shrink-0 flex items-center gap-2">
                    {apt.status === 'pending' && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t('statusPending')}</span>
                      </div>
                    )}

                    {apt.status === 'approved' && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t('statusApproved')}</span>
                      </div>
                    )}

                    {apt.status === 'rejected' && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{t('statusRejected')}</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

