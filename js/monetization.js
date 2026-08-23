/* EZO STİLE - Monetization, Serverless AI Credits & Security Module v2.0 */

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

function getUserUid(userObj) {
  if (!userObj) return 'usr_guest';
  if (userObj.uid) return userObj.uid;
  const rawPhone = userObj.phone || 'guest';
  return 'usr_' + rawPhone.replace(/\D/g, '');
}

function getUserToken(userObj) {
  const uid = getUserUid(userObj);
  try {
    return btoa(uid);
  } catch (e) {
    return 'ezostile-auth-verified';
  }
}

function fetchCustomerCreditsFromFirebase(userObj, callback) {
  const uid = getUserUid(userObj);
  const dbUrl = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

  fetch(`${dbUrl}/users/${uid}.json`)
    .then(res => res.json())
    .then(userData => {
      let credits = 3;
      if (userData && typeof userData.aiCredits === 'number') {
        credits = userData.aiCredits;
      } else {
        // Initialize 3 free credits ONCE on Firebase for new user
        fetch(`${dbUrl}/users/${uid}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: uid,
            name: (userObj && userObj.name) || 'Müşteri',
            phone: (userObj && userObj.phone) || '',
            aiCredits: 3,
            aiCreditsUsed: 0,
            createdAt: Date.now()
          })
        });
      }
      if (typeof state !== 'undefined') {
        state.aiCredits = credits;
      }
      if (callback) callback(credits);
    })
    .catch(err => {
      console.warn('Firebase AI credit fetch error:', err);
      if (callback) callback(typeof state !== 'undefined' ? (state.aiCredits || 3) : 3);
    });
}

function getCustomerAiCredits() {
  if (typeof state === 'undefined') return 3;
  return typeof state.aiCredits === 'number' ? state.aiCredits : 3;
}

async function useAiCreditServerless(callback) {
  if (typeof state === 'undefined' || !state.currentUser) {
    alert('⚠️ AI Saç Danışmanı için lütfen önce giriş yapınız!');
    return false;
  }

  const currentCredits = getCustomerAiCredits();
  if (currentCredits <= 0) {
    showOutOfCreditsModal();
    return false;
  }

  const uid = getUserUid(state.currentUser);
  const token = getUserToken(state.currentUser);

  try {
    // Attempt deduction via Vercel Serverless Function / Firebase REST API
    const response = await fetch('/api/ai-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'deduct',
        userId: uid,
        userToken: token
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        state.aiCredits = data.credits;
        if (callback) callback(true);
        return true;
      }
    }

    // Direct Firebase REST Fallback if Serverless API is offline
    const dbUrl = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
    const newCredits = currentCredits - 1;
    await fetch(`${dbUrl}/users/${uid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiCredits: newCredits, aiCreditsUsed: ((state.aiCreditsUsed || 0) + 1) })
    });

    state.aiCredits = newCredits;
    if (callback) callback(true);
    return true;
  } catch (err) {
    console.error('Serverless credit deduction error:', err);
    // Fallback UI deduction
    state.aiCredits = Math.max(0, currentCredits - 1);
    if (callback) callback(true);
    return true;
  }
}

async function refundAiCreditServerless() {
  if (typeof state === 'undefined' || !state.currentUser) return;
  const uid = getUserUid(state.currentUser);
  const token = getUserToken(state.currentUser);

  try {
    await fetch('/api/ai-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'refund',
        userId: uid,
        userToken: token
      })
    });
  } catch (e) {
    console.warn('Refund error:', e);
  }
  state.aiCredits = (state.aiCredits || 0) + 1;
  if (typeof renderApp === 'function') renderApp();
}

function watchRewardAd() {
  alert('🎬 Test Modu: Ödüllü Reklam Ağı (Google AdMob / AdSense SDK) yakında aktif edilecektir. Gerçek yayın öncesinde simülasyon kredisi verilmemektedir.');
}

function buyAiCreditPack(packId) {
  alert('💳 Ödeme Altyapısı Yakında Aktif Edilecektir.\n\nIyzico / PayTR / Stripe canlı entegrasyonu tamamlandığında bakiye yüklemesi yapabileceksiniz.');
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

        <h3 style="font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 6px;">Ücretsiz AI Deneme Hakkınız Bitti</h3>
        <p class="text-muted" style="margin-bottom: 18px;">Her yeni müşteri hesabına 3 ücretsiz AI Saç Deneme hakkı verilmektedir. Ek haklar için randevu oluşturabilir veya canlı reklam/ödeme sistemini bekleyebilirsiniz.</p>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button onclick="watchRewardAd()" class="btn btn-secondary" style="min-height: 44px; font-size: 12px;">
            🎬 Ödüllü Reklam İzle (Yakında)
          </button>

          <div style="background: #070c1a; padding: 12px; border-radius: 14px; border: 1px solid var(--border-color); margin-top: 4px;">
            <div style="font-size: 11px; font-weight: 700; color: var(--gold-primary); text-transform: uppercase; margin-bottom: 8px;">AI Paket Seçenekleri (Yakında):</div>
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
            Anladım
          </button>
        </div>
      </div>
    </div>
  `;
}
