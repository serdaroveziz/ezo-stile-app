import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SlotManager } from './SlotManager';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  UserCheck, 
  UserPlus, 
  Trash2, 
  Phone, 
  Calendar, 
  BellRing
} from './Icons';

export const AdminDashboard = () => {
  const { 
    appointments, 
    updateAppointmentStatus, 
    activeRole, 
    weeklySchedule,
    updateDaySchedule,
    managers, 
    addManager, 
    removeManager,
    t
  } = useApp();

  const [activeTab, setActiveTab] = useState('requests');
  const [newMgrName, setNewMgrName] = useState('');
  const [newMgrPhone, setNewMgrPhone] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleAddManagerSubmit = (e) => {
    e.preventDefault();
    if (!newMgrName.trim() || !newMgrPhone.trim()) return;
    addManager(newMgrName.trim(), newMgrPhone.trim());
    setNewMgrName('');
    setNewMgrPhone('');
  };

  const filteredAppointments = appointments.filter(apt => {
    if (statusFilter === 'all') return true;
    return apt.status === statusFilter;
  });

  const pendingCount = appointments.filter(a => a.status === 'pending').length;

  return (
    <div className="max-w-4xl mx-auto my-6 px-4 space-y-6 animate-fade-in">
      
      {/* Header Banner */}
      <div className="glass-panel-gold rounded-3xl p-6 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-500/30">
              {activeRole === 'admin' ? t('adminBadge') : t('managerBadge')}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 font-heading">
            {activeRole === 'admin' ? t('adminControlTitle') : t('managerControlTitle')}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {t('adminControlDesc')}
          </p>
        </div>

        {/* Action Badge */}
        {pendingCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/40 px-4 py-3 rounded-2xl flex items-center gap-3 animate-pulse-glow">
            <BellRing className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-xs font-bold text-amber-300">{pendingCount} {t('pendingCountMsg')}</p>
              <p className="text-[10px] text-slate-400">{t('pendingCountSub')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'requests'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('tabRequests')}</span>
          {pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-950 text-amber-400 text-[10px] font-extrabold">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('slotManager')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'slotManager'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t('tabSlots')}</span>
        </button>

        <button
          onClick={() => setActiveTab('weeklySchedule')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'weeklySchedule'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('tabWeeklySchedule')}</span>
        </button>

        {activeRole === 'admin' && (
          <button
            onClick={() => setActiveTab('managers')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'managers'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{t('tabManagers')}</span>
          </button>
        )}
      </div>

      {/* TAB 1: Appointments & Approval Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 text-xs flex-wrap">
            <span className="text-slate-400 font-semibold px-2">{t('filterLabel')}</span>
            {[
              { id: 'all', label: t('filterAll') },
              { id: 'pending', label: t('filterPending') },
              { id: 'approved', label: t('filterApproved') },
              { id: 'rejected', label: t('filterRejected') },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  statusFilter === f.id
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium">{t('noFilteredApts')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppointments.map(apt => (
                <div
                  key={apt.id}
                  className={`glass-panel rounded-2xl p-5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    apt.status === 'pending'
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-extrabold text-slate-100 text-base">{apt.customerName}</h4>
                      <a 
                        href={`tel:${apt.customerPhone}`} 
                        className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{apt.customerPhone}</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-300">
                      <span className="font-bold text-amber-400">✂️ {apt.serviceName}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-200">📅 {apt.date}</span>
                      <span className="font-semibold text-slate-200">⏰ {apt.time}</span>
                    </div>

                    <p className="text-xs text-slate-400">
                      {t('priceLabel')} <strong className="text-emerald-400">{apt.price} TL</strong> ({apt.duration})
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                    {apt.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => updateAppointmentStatus(apt.id, 'approved')}
                          className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span>{t('approveBtn')}</span>
                        </button>

                        <button
                          onClick={() => updateAppointmentStatus(apt.id, 'rejected')}
                          className="flex-1 md:flex-none px-4 py-2.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <XCircle className="w-4 h-4 text-rose-400" />
                          <span>{t('rejectBtn')}</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                          apt.status === 'approved' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}>
                          {apt.status === 'approved' ? t('statusApproved') : t('statusRejected')}
                        </span>

                        <button
                          onClick={() => updateAppointmentStatus(apt.id, apt.status === 'approved' ? 'rejected' : 'approved')}
                          className="text-[11px] text-slate-400 hover:text-slate-200 underline px-2 py-1"
                        >
                          {t('changeStatus')}
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* TAB 2: Slot & Date Manager Component */}
      {activeTab === 'slotManager' && (
        <SlotManager />
      )}

      {/* TAB 3: Weekly Working Hours (Day-by-Day Configuration) */}
      {activeTab === 'weeklySchedule' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div>
              <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span>{t('weeklyScheduleTitle')}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {t('weeklyScheduleDesc')}
              </p>
            </div>

            {/* List of 7 Days */}
            <div className="space-y-3 pt-2">
              {[
                { dayIdx: 1, key: 'dayMonday' },
                { dayIdx: 2, key: 'dayTuesday' },
                { dayIdx: 3, key: 'dayWednesday' },
                { dayIdx: 4, key: 'dayThursday' },
                { dayIdx: 5, key: 'dayFriday' },
                { dayIdx: 6, key: 'daySaturday' },
                { dayIdx: 0, key: 'daySunday' },
              ].map(({ dayIdx, key }) => {
                const sched = weeklySchedule[dayIdx] || { isOpen: true, start: '09:00', end: '21:00' };

                // Generate 30-min options from 00:00 to 23:30
                const timeOptions = [];
                for (let h = 0; h < 24; h++) {
                  const hh = h.toString().padStart(2, '0');
                  timeOptions.push(`${hh}:00`);
                  timeOptions.push(`${hh}:30`);
                }

                return (
                  <div 
                    key={dayIdx} 
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      sched.isOpen 
                        ? 'bg-slate-950/80 border-slate-800' 
                        : 'bg-rose-950/20 border-rose-500/30'
                    }`}
                  >
                    {/* Day Name & Status Toggle */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateDaySchedule(dayIdx, { isOpen: !sched.isOpen })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                          sched.isOpen 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {sched.isOpen ? t('dayIsOpen') : t('dayIsClosed')}
                      </button>

                      <span className="font-bold text-sm text-slate-100 min-w-[90px]">
                        {t(key)}
                      </span>
                    </div>

                    {/* Time Selectors (Açılış & Kapanış) */}
                    {sched.isOpen ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-medium">{t('openingTime')}:</span>
                          <select
                            value={sched.start || '09:00'}
                            onChange={(e) => updateDaySchedule(dayIdx, { start: e.target.value })}
                            className="bg-slate-900 border border-slate-700 text-amber-400 font-bold text-xs rounded-xl px-2.5 py-1.5 outline-none cursor-pointer focus:border-amber-500"
                          >
                            {timeOptions.map(t => (
                              <option key={t} value={t} className="bg-slate-950 text-slate-100">{t}</option>
                            ))}
                          </select>
                        </div>

                        <span className="text-slate-600 font-bold">—</span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-medium">{t('closingTime')}:</span>
                          <select
                            value={sched.end || '21:00'}
                            onChange={(e) => updateDaySchedule(dayIdx, { end: e.target.value })}
                            className="bg-slate-900 border border-slate-700 text-amber-400 font-bold text-xs rounded-xl px-2.5 py-1.5 outline-none cursor-pointer focus:border-amber-500"
                          >
                            {timeOptions.map(t => (
                              <option key={t} value={t} className="bg-slate-950 text-slate-100">{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-rose-400/80 font-medium italic">
                        {t('weekdayClosedMsg')}
                      </span>
                    )}

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: Manager Assignment & Shop Management */}
      {activeTab === 'managers' && activeRole === 'admin' && (
        <div className="space-y-6">
          
          {/* Add New Manager Form */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-400" />
              <span>{t('addManagerTitle')}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {t('addManagerDesc')}
            </p>

            <form onSubmit={handleAddManagerSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <input
                type="text"
                required
                placeholder={t('managerNamePlaceholder')}
                value={newMgrName}
                onChange={(e) => setNewMgrName(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-100 text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:border-amber-500 outline-none"
              />
              <input
                type="tel"
                required
                placeholder={t('phone')}
                value={newMgrPhone}
                onChange={(e) => setNewMgrPhone(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-100 text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:border-amber-500 outline-none"
              />
              <button
                type="submit"
                className="gold-gradient-btn text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t('addManagerBtn')}</span>
              </button>
            </form>
          </div>

          {/* Existing Managers List */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-100 text-sm">{t('activeManagersTitle')}</h4>

            <div className="space-y-2">
              {managers.map(mgr => (
                <div key={mgr.id} className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-xs text-slate-200">{mgr.name}</h5>
                    <p className="text-[11px] text-slate-400">{mgr.phone} • <span className="text-amber-400 font-semibold">{mgr.role}</span></p>
                  </div>
                  <button
                    onClick={() => removeManager(mgr.id)}
                    className="text-slate-500 hover:text-rose-400 p-2 rounded-lg hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

