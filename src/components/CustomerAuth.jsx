import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Phone, ShieldCheck, Smartphone, X } from './Icons';

export const CustomerAuth = () => {
  const { registerCustomer, t } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // SMS Verification states
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [generatedSmsCode, setGeneratedSmsCode] = useState('');
  const [inputSmsCode, setInputSmsCode] = useState('');
  const [smsError, setSmsError] = useState(false);
  const [simulatedSmsToast, setSimulatedSmsToast] = useState(null);

  const handleSendSms = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedSmsCode(code);
    setInputSmsCode('');
    setSmsError(false);
    setShowSmsModal(true);
    setSimulatedSmsToast(code);
  };

  const handleVerifySms = (e) => {
    e.preventDefault();
    if (inputSmsCode.trim() === generatedSmsCode) {
      setShowSmsModal(false);
      registerCustomer(name.trim(), phone.trim());
    } else {
      setSmsError(true);
    }
  };

  const handleResendSms = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedSmsCode(code);
    setInputSmsCode('');
    setSmsError(false);
    setSimulatedSmsToast(code);
  };

  return (
    <div className="max-w-md mx-auto my-8 px-4 animate-fade-in">
      
      {/* SIMULATED SMS TOAST NOTIFICATION */}
      {simulatedSmsToast && (
        <div className="mb-4 bg-emerald-950/90 border-2 border-emerald-500 p-4 rounded-2xl shadow-2xl animate-bounce text-emerald-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 font-bold">📱</div>
            <div>
              <h4 className="font-extrabold text-xs text-emerald-400 uppercase tracking-wider">{t('smsSentToast')}</h4>
              <p className="text-sm font-bold text-slate-100 tracking-widest mt-0.5">[ {simulatedSmsToast} ]</p>
            </div>
          </div>
          <button onClick={() => setSimulatedSmsToast(null)} className="text-xs bg-emerald-900/50 hover:bg-emerald-900 px-2 py-1 rounded-lg">✕</button>
        </div>
      )}

      <div className="glass-panel-gold rounded-3xl p-6 sm:p-8 border border-amber-500/30 relative overflow-hidden shadow-2xl">
        
        {/* Glow effect background */}
        <div className="absolute -right-12 -top-12 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl gold-gradient-btn flex items-center justify-center mx-auto mb-4 text-slate-950 shadow-xl shadow-amber-500/20">
            <Smartphone className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight font-heading">
            {t('welcome')}
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            {t('registerHint')}
          </p>
        </div>

        {/* Highlight feature banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 mb-6 flex items-start gap-3 text-xs text-slate-300">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-amber-400 font-semibold block">📱 SMS Telefon Doğrulama:</strong>
            Randevularınızın güvenliği için telefon numaranıza 6 haneli onay kodu gönderilir.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSendSms} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t('fullName')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm font-medium transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t('phone')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('phonePlaceholder')}
                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm font-medium transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full gold-gradient-btn text-slate-950 font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all mt-6"
          >
            <Smartphone className="w-5 h-5" />
            <span>{t('smsSendBtn')}</span>
          </button>
        </form>

      </div>

      {/* SMS CODE VERIFICATION MODAL */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowSmsModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl gold-gradient-btn flex items-center justify-center mx-auto mb-4 text-slate-950 shadow-xl shadow-amber-500/20">
              <Smartphone className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-center text-slate-100 font-heading">{t('smsModalTitle')}</h3>
            <p className="text-xs text-center text-slate-400 mt-1 mb-4">{t('smsModalDesc')}</p>

            <div className="bg-slate-950 border-2 border-amber-500/60 p-3 rounded-2xl text-center space-y-1 mb-4 shadow-lg shadow-amber-500/10">
              <span className="text-[10px] uppercase tracking-wider text-amber-400 font-extrabold block">📱 SMS GELEN KUTUSU (DOĞRULAMA KODU)</span>
              <div className="text-2xl font-black text-slate-100 tracking-[0.3em] font-mono">
                {generatedSmsCode}
              </div>
              <button
                type="button"
                onClick={() => setInputSmsCode(generatedSmsCode)}
                className="mt-1 text-[11px] text-amber-400 hover:text-amber-300 font-bold underline bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/30 transition-all"
              >
                ⚡ Kodu Otomatik Doldur
              </button>
            </div>

            <div className="text-center text-xs text-slate-400 mb-2">
              📞 <span className="font-semibold text-slate-200">{phone}</span> numarasına gönderildi.
            </div>

            <form onSubmit={handleVerifySms} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  required
                  value={inputSmsCode}
                  onChange={e => setInputSmsCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full bg-slate-950 border-2 border-amber-500/60 focus:border-amber-400 text-center text-slate-100 tracking-[0.5em] text-2xl font-black rounded-xl py-3 outline-none"
                />
              </div>

              {smsError && (
                <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs px-3.5 py-2 rounded-xl text-center font-semibold">
                  {t('smsInvalidCode')}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={handleResendSms} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-2 rounded-xl text-[11px] transition-all">
                  {t('smsResendBtn')}
                </button>
                <button type="submit" className="w-2/3 gold-gradient-btn text-slate-950 font-extrabold py-3 px-4 rounded-xl text-xs shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all">
                  {t('smsVerifyBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

