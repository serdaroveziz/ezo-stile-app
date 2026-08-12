import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Lock, Unlock, Power, CheckCircle, XCircle } from './Icons';

export const SlotManager = () => {
  const { 
    blockedDates, 
    toggleBlockDate, 
    blockedSlots, 
    toggleBlockTimeSlot,
    bulkBlockTimeSlots,
    shopSettings, 
    toggleShopOpenStatus,
    activeRole,
    t
  } = useApp();

  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSection, setSelectedSection] = useState('all'); // 'night' | 'morning' | 'afternoon' | 'evening' | 'all'

  // Full 24-hour slots (00:00 - 23:30)
  const all24Slots = useMemo(() => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
      const hourStr = h.toString().padStart(2, '0');
      slots.push(`${hourStr}:00`);
      slots.push(`${hourStr}:30`);
    }
    return slots;
  }, []);

  // Filter slots based on selected 24h time section
  const visibleSlots = useMemo(() => {
    if (selectedSection === 'night') {
      return all24Slots.filter(s => {
        const hour = parseInt(s.split(':')[0], 10);
        return hour >= 0 && hour < 6;
      });
    }
    if (selectedSection === 'morning') {
      return all24Slots.filter(s => {
        const hour = parseInt(s.split(':')[0], 10);
        return hour >= 6 && hour < 12;
      });
    }
    if (selectedSection === 'afternoon') {
      return all24Slots.filter(s => {
        const hour = parseInt(s.split(':')[0], 10);
        return hour >= 12 && hour < 18;
      });
    }
    if (selectedSection === 'evening') {
      return all24Slots.filter(s => {
        const hour = parseInt(s.split(':')[0], 10);
        return hour >= 18 && hour < 24;
      });
    }
    return all24Slots;
  }, [all24Slots, selectedSection]);

  const isFullDateBlocked = blockedDates.includes(targetDate);

  const handleBulkToggle = (shouldBlock) => {
    bulkBlockTimeSlots(targetDate, visibleSlots, shouldBlock);
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Dükkan Genel Durumu Anahtarı (Süper Admin Özel) */}
      {activeRole === 'admin' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${shopSettings.isShopOpen ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <Power className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-sm">{t('shopToggleTitle')}</h4>
              <p className="text-xs text-slate-400">
                {shopSettings.isShopOpen ? t('shopOpenMsg') : t('shopClosedMsg')}
              </p>
            </div>
          </div>

          <button
            onClick={toggleShopOpenStatus}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
              shopSettings.isShopOpen
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {shopSettings.isShopOpen ? t('closeShopBtn') : t('openShopBtn')}
          </button>
        </div>
      )}

      {/* 24 Saat Gün ve Saat Dilimi Kapatma Paneli */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-base">{t('slotPanelTitle')}</h3>
              <p className="text-xs text-slate-400">{t('slotPanelDesc')}</p>
            </div>
          </div>
        </div>

        {/* Tarih Seçimi ve Tam Gün Kapatma Butonu */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">
              {t('selectDateLabel')}
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold rounded-xl px-3 py-2 focus:border-amber-500 outline-none"
            />
          </div>

          <button
            onClick={() => toggleBlockDate(targetDate)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border ${
              isFullDateBlocked
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
            }`}
          >
            {isFullDateBlocked ? (
              <>
                <Unlock className="w-4 h-4" />
                <span>{t('unblockDayBtn')}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>{t('blockDayBtn')}</span>
              </>
            )}
          </button>
        </div>

        {/* 24 Saat Zaman Vakiti Sekmeleri & Toplu İletişim Butonları */}
        {!isFullDateBlocked && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {t('selectSectionLabel')}
              </span>

              {/* Bulk Toggle Buttons for Current Window */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleBulkToggle(false)}
                  className="flex-1 sm:flex-none text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{t('openAllInSection')}</span>
                </button>
                <button
                  onClick={() => handleBulkToggle(true)}
                  className="flex-1 sm:flex-none text-[11px] font-bold px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{t('closeAllInSection')}</span>
                </button>
              </div>
            </div>

            {/* Time Window Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 text-xs">
              {[
                { id: 'all', label: t('allSections') },
                { id: 'night', label: t('nightSection') },
                { id: 'morning', label: t('morningSection') },
                { id: 'afternoon', label: t('afternoonSection') },
                { id: 'evening', label: t('eveningSection') },
              ].map(sec => (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSection(sec.id)}
                  className={`py-2 px-2 rounded-lg font-semibold text-center transition-all truncate ${
                    selectedSection === sec.id
                      ? 'bg-slate-800 text-amber-400 border border-amber-500/30 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 24 Saat Dilimlerini Tek Tek Kapatma */}
        <div>
          {isFullDateBlocked ? (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-center text-xs text-rose-300 font-medium">
              {t('fullDayBlockedWarning')}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {visibleSlots.map(time => {
                const isBlocked = blockedSlots.some(s => s.date === targetDate && s.time === time);

                return (
                  <button
                    key={time}
                    onClick={() => toggleBlockTimeSlot(targetDate, time)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-1 ${
                      isBlocked
                        ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-md shadow-rose-950/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-amber-500/50 hover:text-amber-400'
                    }`}
                  >
                    <span className="text-xs font-bold">{time}</span>
                    <span className={`text-[10px] font-semibold ${isBlocked ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isBlocked ? '🔒 KAPALI' : '✓ AÇIK'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirm Schedule Changes Button */}
        <div className="pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new Event('storage'));
              alert(t('scheduleConfirmedToast'));
            }}
            className="w-full gold-gradient-btn text-slate-950 font-black text-xs sm:text-sm py-3.5 px-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform"
          >
            <CheckCircle className="w-5 h-5 text-slate-950" />
            <span>{t('confirmScheduleBtn')}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

