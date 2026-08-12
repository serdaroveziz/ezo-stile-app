import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Scissors, CheckCircle, ShieldAlert, Sparkles } from './Icons';

export const BookingFlow = ({ onBookingSuccess }) => {
  const { 
    services, 
    currentUser, 
    shopSettings, 
    weeklySchedule,
    blockedDates, 
    blockedSlots, 
    createAppointment,
    appointments,
    t
  } = useApp();

  const getLocalDateStr = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getInitialDate = () => {
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const dayOfWeek = now.getDay();
    const sched = weeklySchedule?.[dayOfWeek] || { isOpen: true, start: '09:00', end: '21:00' };
    const closingHour = parseInt((sched.end || '21:00').split(':')[0], 10);

    if (!sched.isOpen || now.getHours() >= closingHour) {
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return getLocalDateStr(tomorrow);
    }
    return todayStr;
  };

  const [selectedService, setSelectedService] = useState(services[0] || {});
  const [selectedDate, setSelectedDate] = useState(getInitialDate);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedSection, setSelectedSection] = useState('all'); // 'night' | 'morning' | 'afternoon' | 'evening' | 'all'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedSuccess, setBookedSuccess] = useState(null);

  // Day of week for selected date (0 = Sunday, 1 = Monday, etc.)
  const selectedDayOfWeek = useMemo(() => {
    if (!selectedDate) return 1;
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.getDay();
    }
    return new Date(selectedDate).getDay();
  }, [selectedDate]);

  const currentDaySchedule = useMemo(() => {
    return weeklySchedule?.[selectedDayOfWeek] || { isOpen: true, start: '09:00', end: '21:00' };
  }, [weeklySchedule, selectedDayOfWeek]);

  // Local date helpers for checking past slots
  const todayStr = useMemo(() => getLocalDateStr(new Date()), []);
  const isToday = selectedDate === todayStr;
  const isPastDate = selectedDate < todayStr;

  // Check if a specific time slot is blocked by Admin, booked, or in the past
  const isSlotUnavailable = (timeStr) => {
    if (isDateBlocked || isPastDate) return true;

    // Past hour check ONLY if selected date is TODAY
    if (isToday) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const [sHour, sMin] = timeStr.split(':').map(Number);
      if (sHour < currentHour || (sHour === currentHour && sMin <= currentMin)) {
        return true;
      }
    }

    // Check if slot is explicitly blocked by admin
    const adminBlocked = blockedSlots.some(s => s.date === selectedDate && s.time === timeStr);
    if (adminBlocked) return true;

    // Check if an existing appointment occupies this slot
    const alreadyBooked = appointments.some(apt => 
      apt.date === selectedDate && 
      apt.time === timeStr && 
      apt.status !== 'rejected' &&
      apt.status !== 'cancelled'
    );

    return alreadyBooked;
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (isDateBlocked || !shopSettings.isShopOpen) return;
    if (!selectedTime) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const apt = createAppointment({
        service: selectedService,
        date: selectedDate,
        time: selectedTime
      });

      setIsSubmitting(false);
      setBookedSuccess(apt);
      if (onBookingSuccess) onBookingSuccess(apt);
    }, 400);
  };

  if (!shopSettings.isShopOpen) {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center max-w-lg mx-auto my-6 border border-rose-500/30">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-100">{t('shopClosedTitle')}</h3>
        <p className="text-sm text-slate-400 mt-2">
          {t('shopClosedDesc')}
        </p>
        <div className="mt-4 inline-block bg-slate-900 px-4 py-2 rounded-xl text-xs font-semibold text-amber-400 border border-slate-800">
          {t('contact')}: {shopSettings.phone}
        </div>
      </div>
    );
  }

  if (bookedSuccess) {
    return (
      <div className="glass-panel-gold rounded-3xl p-8 max-w-lg mx-auto my-6 text-center animate-fade-in border border-amber-500/40 shadow-2xl">
        <div className="w-20 h-20 gold-gradient-btn rounded-full flex items-center justify-center mx-auto mb-4 text-slate-950 shadow-xl shadow-amber-500/30">
          <CheckCircle className="w-10 h-10" />
        </div>
        
        <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
          {t('statusPending')}
        </span>

        <h3 className="text-2xl font-extrabold text-slate-100 mt-3 font-heading">
          {t('requestSentTitle')}
        </h3>
        
        <p className="text-sm text-slate-300 mt-2 max-w-sm mx-auto">
          {t('requestSentDesc')}
        </p>

        {/* Appointment summary card */}
        <div className="bg-slate-950/80 rounded-2xl p-4 my-6 text-left border border-slate-800 text-xs space-y-2.5">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-slate-400">{t('serviceLabel')}</span>
            <span className="font-bold text-amber-400 text-sm">{bookedSuccess.serviceName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">{t('dateTimeLabel')}</span>
            <span className="font-semibold text-slate-200">{bookedSuccess.date} — {bookedSuccess.time}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">{t('customerLabel')}</span>
            <span className="font-semibold text-slate-200">{bookedSuccess.customerName} ({bookedSuccess.customerPhone})</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <span className="text-slate-400">{t('priceLabel')}</span>
            <span className="font-bold text-emerald-400 text-sm">{bookedSuccess.price} TL</span>
          </div>
        </div>

        <button
          onClick={() => setBookedSuccess(null)}
          className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold py-3 px-4 rounded-xl text-sm border border-slate-700 transition-all"
        >
          {t('bookAnother')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-6 px-4 animate-fade-in">
      <div className="glass-panel rounded-3xl p-5 sm:p-7 border border-slate-800 shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800/80">
          <div>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block">{t('quickBooking')}</span>
            <h2 className="text-xl font-bold text-slate-100 font-heading">{t('selectServiceAndDate')}</h2>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Scissors className="w-5 h-5" />
          </div>
        </div>

        <form onSubmit={handleBookingSubmit} className="space-y-6">

          {/* 1. Hizmet Seçimi */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              {t('step1Service')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {services.map((srv) => {
                const isSelected = selectedService.id === srv.id;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => setSelectedService(srv)}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-amber-500/15 border-amber-500 text-slate-100 shadow-lg shadow-amber-500/10' 
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-100 line-clamp-1">{srv.name}</span>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium pt-2 border-t border-slate-800/60">
                      <span className="text-slate-400">{srv.duration}</span>
                      <span className="font-bold text-amber-400">{srv.price} TL</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Tarih Seçimi */}
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {t('step2Date')}
              </label>
              {isDateBlocked && (
                <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  {t('dayBlocked')}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime('');
                }}
                className={`w-full bg-slate-950/80 border rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  isDateBlocked 
                    ? 'border-rose-500 text-rose-300 focus:ring-rose-500' 
                    : 'border-slate-700/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-100'
                }`}
              />
            </div>
          </div>

          {/* 3. 24 Saat Randevu Saati Seçimi */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              {t('step3Time')}
            </label>

            {isDateBlocked ? (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-center text-xs text-rose-300">
                {t('dayBlockedMsg')}
              </div>
            ) : (
              <div className="space-y-2">
                {/* 24 Saat Dilimi Sekmeleri */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 text-[11px]">
                  {[
                    { id: 'all', label: t('allSections') },
                    { id: 'night', label: t('nightSection') },
                    { id: 'morning', label: t('morningSection') },
                    { id: 'afternoon', label: t('afternoonSection') },
                    { id: 'evening', label: t('eveningSection') },
                  ].map(sec => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setSelectedSection(sec.id)}
                      className={`py-1.5 px-1.5 rounded-lg font-semibold text-center transition-all truncate ${
                        selectedSection === sec.id
                          ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>

                {/* Grid of Slots */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
                  {visibleSlots.map((time) => {
                    const unavailable = isSlotUnavailable(time);
                    const isSelected = selectedTime === time;

                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={unavailable}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                          unavailable
                            ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed line-through'
                            : isSelected
                            ? 'gold-gradient-btn text-slate-950 border-amber-400 font-extrabold shadow-md shadow-amber-500/20 scale-105'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-amber-500/50 hover:text-amber-300'
                        }`}
                      >
                        {time}
                        {unavailable && <span className="block text-[9px] font-normal text-rose-500/80">{t('slotUnavailable')}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Customer Summary & Auto-Filled Contact */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">{t('registeredCustomer')}</span>
              <span className="font-bold text-amber-400">{currentUser?.name} ({currentUser?.phone})</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-900">
              <span className="text-slate-400">{t('totalPrice')}</span>
              <span className="text-sm font-extrabold text-emerald-400">{selectedService.price} TL</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isDateBlocked || !selectedTime || isSubmitting}
            className={`w-full font-extrabold py-4 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all ${
              isDateBlocked || !selectedTime || isSubmitting
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'gold-gradient-btn text-slate-950 shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40'
            }`}
          >
            {isSubmitting ? (
              <span>{t('sendingRequest')}</span>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>{t('sendBookingRequest')}</span>
              </>
            )}
          </button>

        </form>

      </div>
    </div>
  );
};

