import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { TRANSLATIONS } from '../utils/translations';

const AppContext = createContext();

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Realtime Database REST API (SDK gerektirmez)
// Database URL'ini buraya gir:
// ─────────────────────────────────────────────────────────────────────────────
const DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app/ezostile_v4.json';

// ─────────────────────────────────────────────────────────────────────────────
// Başlangıç Randevuları (Demo)
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_APPOINTMENTS = [];

// ─────────────────────────────────────────────────────────────────────────────
// Haftalık Çalışma Saati Şablonu
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_WEEKLY_SCHEDULE = {
  1: { dayKey: 'dayMonday',    isOpen: true,  start: '12:00', end: '22:00' },
  2: { dayKey: 'dayTuesday',   isOpen: true,  start: '09:00', end: '21:00' },
  3: { dayKey: 'dayWednesday', isOpen: true,  start: '09:00', end: '21:00' },
  4: { dayKey: 'dayThursday',  isOpen: true,  start: '09:00', end: '21:00' },
  5: { dayKey: 'dayFriday',    isOpen: true,  start: '09:00', end: '23:00' },
  6: { dayKey: 'daySaturday',  isOpen: true,  start: '09:00', end: '23:00' },
  0: { dayKey: 'daySunday',    isOpen: true,  start: '10:00', end: '20:00' },
};

const DEFAULT_SHOP_SETTINGS = {
  name: 'EZO STİLE',
  phone: '0555 123 45 67',
  isShopOpen: true,
  customLogo: '/insta.png',
};

// ─────────────────────────────────────────────────────────────────────────────
// localStorage yardımcıları
// ─────────────────────────────────────────────────────────────────────────────
const ls = {
  get: (key, fallback = null) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  str: (key, fallback = '') => {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  },
  setStr: (key, value) => {
    try { localStorage.setItem(key, value); } catch {}
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Cloud sync yardımcıları
// ─────────────────────────────────────────────────────────────────────────────
let lastWriteTs = 0; // bu cihazın son yazma zamanı

const cloudRead = async () => {
  try {
    const res = await fetch(DB_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text === 'null') return null;
    const data = JSON.parse(text);
    if (!data || typeof data.updatedAt !== 'number') return null;
    return data;
  } catch {
    return null;
  }
};

const cloudWrite = async (payload) => {
  try {
    await fetch(DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}
};

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export const AppProvider = ({ children }) => {
  // 0. Dil
  const [language, setLanguage] = useState(() => ls.str('goldcut_app_language', 'tr'));
  const t = (key) => {
    const d = TRANSLATIONS[language] || TRANSLATIONS['tr'];
    return d[key] || TRANSLATIONS['tr'][key] || key;
  };
  const services = TRANSLATIONS[language]?.servicesList || TRANSLATIONS['tr'].servicesList;

  // 1. Müşteri profili
  const [currentUser, setCurrentUser] = useState(() => ls.get('goldcut_customer_user'));

  // 2. Roller
  const [activeRole, setActiveRole] = useState('customer');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isManagerAuthenticated, setIsManagerAuthenticated] = useState(false);

  // 3. Ayarlar
  const [weeklySchedule, setWeeklySchedule] = useState(() =>
    ls.get('goldcut_weekly_schedule', DEFAULT_WEEKLY_SCHEDULE)
  );
  const [shopSettings, setShopSettings] = useState(() => {
    const saved = ls.get('goldcut_shop_settings');
    if (saved) return { ...saved, customLogo: saved.customLogo || '/insta.png' };
    return DEFAULT_SHOP_SETTINGS;
  });

  // 4. Yöneticiler
  const [managers, setManagers] = useState(() =>
    ls.get('goldcut_managers', [
      { id: 'm-1', name: 'Mustafa Usta (Yönetici)', phone: '0533 111 22 44', role: 'Yönetici' },
      { id: 'm-2', name: 'Caner Kalfa (Koltuk 2)',  phone: '0544 222 33 55', role: 'Yönetici' },
    ])
  );

  // 5. Kapalı gün/saat
  const [blockedDates, setBlockedDates] = useState(() => ls.get('goldcut_blocked_dates', []));
  const [blockedSlots, setBlockedSlots] = useState(() => ls.get('goldcut_blocked_slots', []));

  // 6. Randevular
  const [appointments, setAppointments] = useState(() =>
    ls.get('goldcut_appointments', INITIAL_APPOINTMENTS)
  );

  // 7. Bildirimler
  const [notifications, setNotifications] = useState([]);

  // ─── Cloud Sync ───────────────────────────────────────────────────────────
  const isMountedRef = useRef(true);
  // Bu cihazın son cloud'a yazdığı timestamp; kendi yazısını yeniden uygulamamak için
  const lastWriteTsRef = useRef(0);

  // Belirli bir veri setini cloud'a yazar
  const syncToCloud = useCallback(async ({
    appts       = null,
    bSlots      = null,
    bDates      = null,
    wSchedule   = null,
    sSettings   = null,
  } = {}) => {
    const now = Date.now();
    lastWriteTsRef.current = now;

    const payload = {
      appointments:   appts     ?? appointments,
      blockedSlots:   bSlots    ?? blockedSlots,
      blockedDates:   bDates    ?? blockedDates,
      weeklySchedule: wSchedule ?? weeklySchedule,
      shopSettings:   sSettings ?? shopSettings,
      updatedAt: now,
    };

    await cloudWrite(payload);
  }, [appointments, blockedSlots, blockedDates, weeklySchedule, shopSettings]);

  // Cloud'dan oku; sadece başka bir cihaz yazdıysa state'i güncelle
  const pullFromCloud = useCallback(async () => {
    if (!isMountedRef.current) return;
    const data = await cloudRead();
    if (!data || !isMountedRef.current) return;

    // Eğer bu veriyi biz yazdıysak (±1sn tolerans) yoksay
    if (Math.abs(data.updatedAt - lastWriteTsRef.current) < 1000) return;

    // Eğer cloud daha yeniyse uygula
    const localTs = Number(ls.str('goldcut_last_applied_ts', '0'));
    if (data.updatedAt <= localTs) return;

    ls.setStr('goldcut_last_applied_ts', String(data.updatedAt));

    if (data.appointments)   setAppointments(data.appointments);
    if (data.blockedSlots)   setBlockedSlots(data.blockedSlots);
    if (data.blockedDates)   setBlockedDates(data.blockedDates);
    if (data.weeklySchedule) setWeeklySchedule(data.weeklySchedule);
    if (data.shopSettings)   setShopSettings(data.shopSettings);
  }, []);

  // Uygulama açılırken cloud'dan çek; sonra her 2 saniyede bir kontrol et
  useEffect(() => {
    isMountedRef.current = true;
    pullFromCloud();
    const interval = setInterval(pullFromCloud, 2000);
    const onFocus = () => pullFromCloud();
    window.addEventListener('focus', onFocus);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [pullFromCloud]);

  // ─── localStorage yazımları ───────────────────────────────────────────────
  useEffect(() => { ls.setStr('goldcut_app_language', language); }, [language]);
  useEffect(() => {
    currentUser ? ls.set('goldcut_customer_user', currentUser)
                : localStorage.removeItem('goldcut_customer_user');
  }, [currentUser]);
  useEffect(() => { ls.set('goldcut_shop_settings',    shopSettings);   }, [shopSettings]);
  useEffect(() => { ls.set('goldcut_managers',          managers);       }, [managers]);
  useEffect(() => { ls.set('goldcut_blocked_dates',     blockedDates);   }, [blockedDates]);
  useEffect(() => { ls.set('goldcut_blocked_slots',     blockedSlots);   }, [blockedSlots]);
  useEffect(() => { ls.set('goldcut_weekly_schedule',   weeklySchedule); }, [weeklySchedule]);
  useEffect(() => { ls.set('goldcut_appointments',      appointments);   }, [appointments]);

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const loginAdmin = (password) => {
    if (password === '1405') { setIsAdminAuthenticated(true); setActiveRole('admin'); return true; }
    return false;
  };
  const loginManager = (password) => {
    if (password === '5555') { setIsManagerAuthenticated(true); setActiveRole('manager'); return true; }
    return false;
  };
  const switchRole = (targetRole) => {
    if (targetRole === 'customer') { setActiveRole('customer'); return; }
    if (targetRole === 'admin'   && isAdminAuthenticated)   { setActiveRole('admin');   return; }
    if (targetRole === 'manager' && (isManagerAuthenticated || isAdminAuthenticated)) { setActiveRole('manager'); }
  };
  const logoutStaffRole = () => {
    setIsAdminAuthenticated(false);
    setIsManagerAuthenticated(false);
    setActiveRole('customer');
  };

  // ─── Müşteri işlemleri ────────────────────────────────────────────────────
  const registerCustomer = (name, phone) => {
    const user = { name, phone, registeredAt: new Date().toISOString() };
    setCurrentUser(user);
    return user;
  };
  const logoutCustomer = () => setCurrentUser(null);

  // ─── Randevu işlemleri ───────────────────────────────────────────────────
  const createAppointment = ({ service, date, time }) => {
    if (!currentUser) return null;
    const newApt = {
      id: 'apt-' + Date.now(),
      customerName:  currentUser.name,
      customerPhone: currentUser.phone,
      serviceName:   service.name,
      price:         service.price,
      duration:      service.duration,
      date,
      time,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setAppointments(prev => {
      const updated = [newApt, ...prev];
      // Yeni state'i doğrudan geçir; stale closure yok
      syncToCloud({ appts: updated });
      return updated;
    });

    return newApt;
  };

  const updateAppointmentStatus = (id, newStatus, note = '') => {
    setAppointments(prev => {
      const updated = prev.map(apt => {
        if (apt.id !== id) return apt;
        const u = { ...apt, status: newStatus, adminNote: note };

        if (currentUser && apt.customerPhone === currentUser.phone) {
          const msg = `${apt.date} ${apt.time}`;
          setNotifications(n => [{
            id: Date.now(),
            title:     newStatus === 'approved' ? t('statusApproved') : t('statusRejected'),
            message:   (newStatus === 'approved' ? '🎉 ' : '❌ ') + msg,
            type:      newStatus === 'approved' ? 'success' : 'error',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }, ...n]);
        }
        return u;
      });
      syncToCloud({ appts: updated });
      return updated;
    });
  };

  // ─── Dükkan / Takvim işlemleri ───────────────────────────────────────────
  const updateDaySchedule = (dayIndex, updates) => {
    setWeeklySchedule(prev => {
      const updated = { ...prev, [dayIndex]: { ...prev[dayIndex], ...updates } };
      syncToCloud({ wSchedule: updated });
      return updated;
    });
  };

  const toggleShopOpenStatus = () => {
    setShopSettings(prev => {
      const updated = { ...prev, isShopOpen: !prev.isShopOpen };
      syncToCloud({ sSettings: updated });
      return updated;
    });
  };

  const updateCustomLogo = (logoUrl) => {
    setShopSettings(prev => {
      const updated = { ...prev, customLogo: logoUrl };
      syncToCloud({ sSettings: updated });
      return updated;
    });
  };

  const toggleBlockDate = (dateStr) => {
    setBlockedDates(prev => {
      const updated = prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr];
      syncToCloud({ bDates: updated });
      return updated;
    });
  };

  const toggleBlockTimeSlot = (dateStr, timeStr) => {
    setBlockedSlots(prev => {
      const exists = prev.some(s => s.date === dateStr && s.time === timeStr);
      const updated = exists
        ? prev.filter(s => !(s.date === dateStr && s.time === timeStr))
        : [...prev, { date: dateStr, time: timeStr }];
      syncToCloud({ bSlots: updated });
      return updated;
    });
  };

  const bulkBlockTimeSlots = (dateStr, timeList, shouldBlock) => {
    setBlockedSlots(prev => {
      const filtered = prev.filter(s => !(s.date === dateStr && timeList.includes(s.time)));
      const updated  = shouldBlock ? [...filtered, ...timeList.map(time => ({ date: dateStr, time }))] : filtered;
      syncToCloud({ bSlots: updated });
      return updated;
    });
  };

  // ─── Yönetici işlemleri ──────────────────────────────────────────────────
  const addManager = (name, phone, role = 'Yönetici') => {
    setManagers(prev => [...prev, { id: 'm-' + Date.now(), name, phone, role }]);
  };
  const removeManager = (id) => setManagers(prev => prev.filter(m => m.id !== id));

  // ─── Bildirim işlemleri ──────────────────────────────────────────────────
  const dismissNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  return (
    <AppContext.Provider value={{
      language, setLanguage, t, services,
      currentUser, registerCustomer, logoutCustomer,
      activeRole, setActiveRole,
      isAdminAuthenticated, isManagerAuthenticated,
      loginAdmin, loginManager, switchRole, logoutStaffRole,
      shopSettings, toggleShopOpenStatus, updateCustomLogo,
      weeklySchedule, updateDaySchedule,
      managers, addManager, removeManager,
      blockedDates, toggleBlockDate,
      blockedSlots, toggleBlockTimeSlot, bulkBlockTimeSlots,
      appointments, createAppointment, updateAppointmentStatus,
      notifications, dismissNotification,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
