/* EZO STİLE - Monetization, Reward Ads & Credit Management Module v1.0 */

const DEFAULT_AI_CONFIG = {
  initialFreeCredits: 3,
  adRewardCredits: 1,
  bookingBonusCredits: 2,
  packOptions: [
    { id: 'pack-5', name: '5 AI Saç Denemesi', credits: 5, price: '29 TL' },
    { id: 'pack-10', name: '10 AI Saç Denemesi', credits: 10, price: '49 TL' },
    { id: 'pack-unlimited', name: 'Sınırsız VIP AI Paketi', credits: 999, price: '99 TL' }
  ]
};

function getCustomerAiCredits() {
  if (typeof state === 'undefined' || !state.currentUser) return 3;
  if (typeof state.aiCredits === 'undefined') {
    state.aiCredits = Number(localStorage.getItem('gc_ai_credits') || DEFAULT_AI_CONFIG.initialFreeCredits);
  }
  return state.aiCredits;
}

function useAiCredit() {
  let credits = getCustomerAiCredits();
  if (credits <= 0) {
    showOutOfCreditsModal();
    return false;
  }
  state.aiCredits = credits - 1;
  localStorage.setItem('gc_ai_credits', state.aiCredits.toString());
  return true;
}

function addCustomerAiCredits(amount, reason = '') {
  let credits = getCustomerAiCredits();
  state.aiCredits = credits + amount;
  localStorage.setItem('gc_ai_credits', state.aiCredits.toString());
  if (reason) {
    alert(`🎉 Tebrikler! ${reason} (+${amount} AI Saç Deneme Hakkı eklendi!)`);
  }
  if (typeof renderApp === 'function') renderApp();
}

function watchRewardAd() {
  const modal = document.getElementById('out-of-credits-modal');
  if (modal) modal.style.display = 'none';

  alert('🎬 Ödüllü Reklam İzleniyor... (5 saniye)');
  setTimeout(() => {
    addCustomerAiCredits(DEFAULT_AI_CONFIG.adRewardCredits, 'Reklam İzlediğiniz İçin');
  }, 2000);
}

function buyAiCreditPack(packId) {
  const pack = DEFAULT_AI_CONFIG.packOptions.find(p => p.id === packId);
  if (!pack) return;
  
  if (confirm(`💳 ${pack.name} (${pack.price}) satın almayı onaylıyor musunuz?`)) {
    addCustomerAiCredits(pack.credits, `${pack.name} Satın Alındı`);
    closeModal();
  }
}

function showOutOfCreditsModal() {
  const root = document.getElementById('modal-root');
  if (!root) return;

  root.innerHTML = `
    <div id="out-of-credits-modal" class="modal-overlay" onclick="closeModal()">
      <div class="modal-card" onclick="event.stopPropagation()" style="max-width: 420px; width: 92%; border-color: var(--gold-primary); text-align: center;">
        <div style="width: 54px; height: 54px; border-radius: 18px; background: rgba(245,158,11,0.15); border: 1.5px solid var(--border-gold); display: flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 12px;">
          🎬
        </div>

        <h3 style="font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 6px;">Ücretsiz AI Deneme Hakkınız Bitti!</h3>
        <p class="text-muted" style="margin-bottom: 18px;">AI Saç Danışmanını kullanmaya devam etmek için reklam izleyebilir veya uygun paketi seçebilirsiniz.</p>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <!-- 1. REKLAM İZLE -->
          <button onclick="watchRewardAd()" class="btn btn-gold" style="min-height: 46px; font-size: 13px;">
            🎬 Kısa Reklam İzle (+1 AI Hakkı Kazan)
          </button>

          <!-- 2. PAKET SATIN AL -->
          <div style="background: #070c1a; padding: 12px; border-radius: 14px; border: 1px solid var(--border-color); margin-top: 6px;">
            <div style="font-size: 11px; font-weight: 700; color: var(--gold-primary); text-transform: uppercase; margin-bottom: 8px;">AI Deneme Paketleri:</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${DEFAULT_AI_CONFIG.packOptions.map(p => `
                <button onclick="buyAiCreditPack('${p.id}')" class="btn btn-secondary" style="justify-content: space-between; min-height: 38px; padding: 6px 12px; font-size: 12px;">
                  <span>✨ ${p.name}</span>
                  <span class="badge badge-approved">${p.price}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <button onclick="closeModal()" class="btn btn-outline-gold" style="min-height: 38px; font-size: 12px; margin-top: 4px;">
            Daha Sonra
          </button>
        </div>
      </div>
    </div>
  `;
}
