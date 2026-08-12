import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const DEFAULT_SERVICES = [
  { id: '1', name: 'Saç Kesimi & Yıkama & Şekillendirme', duration: '30 dk', price: 250, icon: 'Scissors' },
  { id: '2', name: 'Sakal Tıraşı & Buharlı İtalyan Bakımı', duration: '20 dk', price: 150, icon: 'Razor' },
  { id: '3', name: 'VIP Komple Bakım (Saç + Sakal + Maske)', duration: '50 dk', price: 400, icon: 'Crown' },
  { id: '4', name: 'Çocuk Saç Kesimi', duration: '25 dk', price: 200, icon: 'Smile' },
  { id: '5', name: 'Cilt & Siyah Nokta Temizliği', duration: '30 dk', price: 200, icon: 'Sparkles' },
  { id: '6', name: 'Saç Boyama / Beyaz Kapatma', duration: '45 dk', price: 350, icon: 'Palette' },
];

const INITIAL_APPOINTMENTS = [
  {
    id: 'apt-101',
    customerName: 'Ahmet Yılmaz',
    customerPhone: '0532 111 22 33',
    serviceName: 'VIP Komple Bakım (Saç + Sakal + Maske)',
    price: 400,
    duration: '50 dk',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    status: 'approved',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'apt-102',
    customerName: 'Mehmet Demir',
    customerPhone: '0544 999 88 77',
    serviceName: 'Saç Kesimi & Yıkama & Şekillendirme',
    price: 250,
    duration: '30 dk',
    date: new Date().toISOString().split('T')[0],
    time: '16:30',
    status: 'pending',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  }
];

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS } from '../utils/translations';

const AppContext = createContext();

const INITIAL_APPOINTMENTS = [
  {
    id: 'apt-101',
    customerName: 'Ahmet Yılmaz',
    customerPhone: '0532 111 22 33',
    serviceName: 'VIP Komple Bakım (Saç + Sakal + Maske)',
    price: 400,
    duration: '50 dk',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    status: 'approved',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'apt-102',
    customerName: 'Mehmet Demir',
    customerPhone: '0544 999 88 77',
    serviceName: 'Saç Kesimi & Yıkama & Şekillendirme',
    price: 250,
    duration: '30 dk',
    date: new Date().toISOString().split('T')[0],
    time: '16:30',
    status: 'pending',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  }
];

export const AppProvider = ({ children }) => {
  // 0. Language State (tr | en | ru | tk)
  const [language, setLanguage] = useState(() => {
    try {
      const savedLang = localStorage.getItem('goldcut_app_language');
      return savedLang && TRANSLATIONS[savedLang] ? savedLang : 'tr';
    } catch {
      return 'tr';
    }
  });

  const t = (key) => {
    const langDict = TRANSLATIONS[language] || TRANSLATIONS['tr'];
    return langDict[key] || TRANSLATIONS['tr'][key] || key;
  };

  const services = TRANSLATIONS[language]?.servicesList || TRANSLATIONS['tr'].servicesList;

  // 1. Current Customer Profile (LocalStorage Remember Me)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('goldcut_customer_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 2. Role Switcher & Auth States ('customer' | 'admin' | 'manager')
  const [activeRole, setActiveRole] = useState('customer');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isManagerAuthenticated, setIsManagerAuthenticated] = useState(false);

  // 3. Shop Configuration & Settings
  const [weeklySchedule, setWeeklySchedule] = useState(() => {
    try {
      const saved = localStorage.getItem('goldcut_weekly_schedule');
      return saved ? JSON.parse(saved) : {
        1: { dayKey: 'dayMonday', isOpen: true, start: '12:00', end: '22:00' },
        2: { dayKey: 'dayTuesday', isOpen: true, start: '09:00', end: '21:00' },
        3: { dayKey: 'dayWednesday', isOpen: true, start: '09:00', end: '21:00' },
        4: { dayKey: 'dayThursday', isOpen: true, start: '09:00', end: '21:00' },
        5: { dayKey: 'dayFriday', isOpen: true, start: '09:00', end: '23:00' },
        6: { dayKey: 'daySaturday', isOpen: true, start: '09:00', end: '23:00' },
        0: { dayKey: 'daySunday', isOpen: true, start: '10:00', end: '20:00' }
      };
    } catch {
      return {
        1: { dayKey: 'dayMonday', isOpen: true, start: '12:00', end: '22:00' },
        2: { dayKey: 'dayTuesday', isOpen: true, start: '09:00', end: '21:00' },
        3: { dayKey: 'dayWednesday', isOpen: true, start: '09:00', end: '21:00' },
        4: { dayKey: 'dayThursday', isOpen: true, start: '09:00', end: '21:00' },
        5: { dayKey: 'dayFriday', isOpen: true, start: '09:00', end: '23:00' },
        6: { dayKey: 'daySaturday', isOpen: true, start: '09:00', end: '23:00' },
        0: { dayKey: 'daySunday', isOpen: true, start: '10:00', end: '20:00' }
      };
    }
  });

  const [shopSettings, setShopSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('goldcut_shop_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          customLogo: parsed.customLogo || '/insta.png'
        };
      }
      return {
        name: 'EZO STİLE',
        phone: '0555 123 45 67',
        isShopOpen: true,
        customLogo: '/insta.png'
      };
    } catch {
      return {
        name: 'EZO STİLE',
        phone: '0555 123 45 67',
        isShopOpen: true,
        customLogo: '/insta.png'
      };
    }
  });

  const updateDaySchedule = (dayIndex, updates) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        ...updates
      }
    }));
  };

  useEffect(() => {
    localStorage.setItem('goldcut_weekly_schedule', JSON.stringify(weeklySchedule));
  }, [weeklySchedule]);

  // 4. Managers / Authorized Employees list
  const [managers, setManagers] = useState(() => {
    try {
      const saved = localStorage.getItem('goldcut_managers');
      return saved ? JSON.parse(saved) : [
        { id: 'm-1', name: 'Mustafa Usta (Yönetici)', phone: '0533 111 22 44', role: 'Yönetici' },
        { id: 'm-2', name: 'Caner Kalfa (Koltuk 2)', phone: '0544 222 33 55', role: 'Yönetici' }
      ];
    } catch {
      return [];
    }
  });

  // 5. Blocked Days & Closed Slot Management
  const [blockedDates, setBlockedDates] = useState(() => {
    try {
      const saved = localStorage.getItem('goldcut_blocked_dates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [blockedSlots, setBlockedSlots] = useState(() => {
    try {
      const saved = localStorage.getItem('goldcut_blocked_slots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 6. Appointments
  const [appointments, setAppointments] = useState(() => {
    try {
      const saved = localStorage.getItem('goldcut_appointments');
      return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
    } catch {
      return INITIAL_APPOINTMENTS;
    }
  });

  // 7. Live Customer Notifications
  const [notifications, setNotifications] = useState([]);

  // --- 100% RELIABLE CLOUD SYNC ENGINE (AWS JSONBLOB STORAGE) ---
  const CLOUD_SYNC_URL = 'https://jsonblob.com/api/jsonBlob/1273955443322110000';

  const syncToCloud = async (overrideData = {}) => {
    const payload = {
      appointments: overrideData.appointments || appointments,
      blockedSlots: overrideData.blockedSlots || blockedSlots,
      blockedDates: overrideData.blockedDates || blockedDates,
      weeklySchedule: overrideData.weeklySchedule || weeklySchedule,
      shopSettings: overrideData.shopSettings || shopSettings,
      updatedAt: Date.now()
    };
    try {
      const res = await fetch(CLOUD_SYNC_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.status === 404) {
        await fetch(CLOUD_SYNC_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }
    } catch (err) {
      console.warn('Cloud sync error:', err);
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    const fetchFromCloud = async () => {
      try {
        const res = await fetch(CLOUD_SYNC_URL, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.updatedAt && isSubscribed) {
            if (data.appointments) setAppointments(data.appointments);
            if (data.blockedSlots) setBlockedSlots(data.blockedSlots);
            if (data.blockedDates) setBlockedDates(data.blockedDates);
            if (data.weeklySchedule) setWeeklySchedule(data.weeklySchedule);
            if (data.shopSettings) setShopSettings(data.shopSettings);
          }
        }
      } catch (err) {}
    };

    fetchFromCloud();
    const interval = setInterval(fetchFromCloud, 2000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, []);

  // Save changes to LocalStorage & Cloud DB
  useEffect(() => {
    localStorage.setItem('goldcut_app_language', language);
  }, [language]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('goldcut_customer_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('goldcut_customer_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('goldcut_shop_settings', JSON.stringify(shopSettings));
    syncToCloud({ shopSettings });
  }, [shopSettings]);

  useEffect(() => {
    localStorage.setItem('goldcut_managers', JSON.stringify(managers));
  }, [managers]);

  useEffect(() => {
    localStorage.setItem('goldcut_blocked_dates', JSON.stringify(blockedDates));
    syncToCloud({ blockedDates });
  }, [blockedDates]);

  useEffect(() => {
    localStorage.setItem('goldcut_blocked_slots', JSON.stringify(blockedSlots));
    syncToCloud({ blockedSlots });
  }, [blockedSlots]);

  useEffect(() => {
    localStorage.setItem('goldcut_appointments', JSON.stringify(appointments));
    syncToCloud({ appointments });
  }, [appointments]);

  // Auth & Password Verification Logic
  const loginAdmin = (password) => {
    if (password === '1405') {
      setIsAdminAuthenticated(true);
      setActiveRole('admin');
      return true;
    }
    return false;
  };

  const loginManager = (password) => {
    if (password === '5555') {
      setIsManagerAuthenticated(true);
      setActiveRole('manager');
      return true;
    }
    return false;
  };

  const switchRole = (targetRole) => {
    if (targetRole === 'customer') {
      setActiveRole('customer');
    } else if (targetRole === 'admin') {
      if (isAdminAuthenticated) {
        setActiveRole('admin');
      }
    } else if (targetRole === 'manager') {
      if (isManagerAuthenticated || isAdminAuthenticated) {
        setActiveRole('manager');
      }
    }
  };

  const logoutStaffRole = () => {
    setIsAdminAuthenticated(false);
    setIsManagerAuthenticated(false);
    setActiveRole('customer');
  };

  // Actions
  const registerCustomer = (name, phone) => {
    const user = {
      name,
      phone,
      registeredAt: new Date().toISOString()
    };
    setCurrentUser(user);
    return user;
  };

  const logoutCustomer = () => {
    setCurrentUser(null);
  };

  const createAppointment = ({ service, date, time }) => {
    if (!currentUser) return null;
    const newApt = {
      id: 'apt-' + Date.now(),
      customerName: currentUser.name,
      customerPhone: currentUser.phone,
      serviceName: service.name,
      price: service.price,
      duration: service.duration,
      date,
      time,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setAppointments(prev => [newApt, ...prev]);
    return newApt;
  };

  const updateAppointmentStatus = (id, newStatus, note = '') => {
    setAppointments(prev => prev.map(apt => {
      if (apt.id === id) {
        const updated = { ...apt, status: newStatus, adminNote: note };
        
        if (currentUser && apt.customerPhone === currentUser.phone) {
          const notifMsg = newStatus === 'approved' 
            ? `🎉 ${apt.date} ${apt.time}`
            : `❌ ${apt.date} ${apt.time}`;
          
          setNotifications(n => [{
            id: Date.now(),
            title: newStatus === 'approved' ? t('statusApproved') : t('statusRejected'),
            message: notifMsg,
            type: newStatus === 'approved' ? 'success' : 'error',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }, ...n]);
        }
        return updated;
      }
      return apt;
    }));
  };

  const toggleShopOpenStatus = () => {
    setShopSettings(prev => ({ ...prev, isShopOpen: !prev.isShopOpen }));
  };

  const updateCustomLogo = (logoUrl) => {
    setShopSettings(prev => ({ ...prev, customLogo: logoUrl }));
  };

  const toggleBlockDate = (dateStr) => {
    setBlockedDates(prev => 
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const toggleBlockTimeSlot = (dateStr, timeStr) => {
    setBlockedSlots(prev => {
      const exists = prev.some(s => s.date === dateStr && s.time === timeStr);
      if (exists) {
        return prev.filter(s => !(s.date === dateStr && s.time === timeStr));
      } else {
        return [...prev, { date: dateStr, time: timeStr }];
      }
    });
  };

  const bulkBlockTimeSlots = (dateStr, timeList, shouldBlock) => {
    setBlockedSlots(prev => {
      let filtered = prev.filter(s => !(s.date === dateStr && timeList.includes(s.time)));
      if (shouldBlock) {
        const newBlocked = timeList.map(time => ({ date: dateStr, time }));
        return [...filtered, ...newBlocked];
      }
      return filtered;
    });
  };

  const addManager = (name, phone, role = 'Yönetici') => {
    const newMgr = { id: 'm-' + Date.now(), name, phone, role };
    setManagers(prev => [...prev, newMgr]);
  };

  const removeManager = (id) => {
    setManagers(prev => prev.filter(m => m.id !== id));
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <AppContext.Provider value={{
      language,
      setLanguage,
      t,
      services,
      currentUser,
      registerCustomer,
      logoutCustomer,
      activeRole,
      setActiveRole,
      isAdminAuthenticated,
      isManagerAuthenticated,
      loginAdmin,
      loginManager,
      switchRole,
      logoutStaffRole,
      shopSettings,
      toggleShopOpenStatus,
      updateCustomLogo,
      weeklySchedule,
      updateDaySchedule,
      managers,
      addManager,
      removeManager,
      blockedDates,
      toggleBlockDate,
      blockedSlots,
      toggleBlockTimeSlot,
      bulkBlockTimeSlots,
      appointments,
      createAppointment,
      updateAppointmentStatus,
      notifications,
      dismissNotification
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
