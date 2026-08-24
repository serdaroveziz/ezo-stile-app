/* EZO STİLE - Production Replicate AI Hair Swap & Telemetry Module v1.0 */

let isAiGenerating = false;

function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
    return window.APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
    return 'https://ezo-stile-app.vercel.app';
  }
  return '';
}

async function executeProductionTryOn(idx) {
  if (isAiGenerating) {
    alert('⏳ Saç modeliniz hazırlanıyor, lütfen bekleyiniz...');
    return;
  }

  if (typeof state === 'undefined' || !state.aiResults || !state.aiResults[idx]) return;
  if (!state.aiUserPhoto) {
    alert('⚠️ Lütfen önce kendi fotoğrafınızı yükleyiniz!');
    return;
  }

  const currentCredits = typeof getCustomerAiCredits === 'function' ? getCustomerAiCredits() : (state.aiCredits || 3);
  if (currentCredits < 1) {
    alert('⚠️ AI Deneme Hakkınız Tükenmiştir!\n\n+1 Hak Kazanmak için reklam izleyebilir veya cüzdandan yükleme yapabilirsiniz.');
    if (typeof openAiWalletModal === 'function') openAiWalletModal();
    return;
  }

  isAiGenerating = true;
  const modelObj = state.aiResults[idx];

  const tryOnBtn = document.getElementById(`try-on-btn-${idx}`);
  if (tryOnBtn) {
    tryOnBtn.disabled = true;
    tryOnBtn.innerHTML = '⏳ Modeliniz Hazırlanıyor...';
  }

  state.aiCredits = Math.max(0, currentCredits - 1);
  if (state.currentUser) {
    state.currentUser.economyCredits = Math.max(0, (state.currentUser.economyCredits || 3) - 1);
  }

  try {
    const uid = (typeof getUserUid === 'function' && state.currentUser) ? getUserUid(state.currentUser) : 'usr_guest';
    const token = (typeof getUserToken === 'function' && state.currentUser) ? getUserToken(state.currentUser) : 'ezostile-auth-verified';

    const apiBase = getApiBaseUrl();
    const response = await fetch(apiBase + '/api/ai-hair-swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: uid,
        userToken: token,
        image: state.aiUserPhoto,
        hairstyleName: modelObj.name,
        prompt: modelObj.barberRecipe || modelObj.name
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        if (typeof data.newCredits === 'number') {
          state.aiCredits = data.newCredits;
        }

        state.aiActivePreview = {
          index: idx,
          modelName: modelObj.name,
          imageUrl: data.outputUrl || state.aiUserPhoto,
          generationId: data.generationId || ('gen_' + Date.now()),
          costUsd: data.costUsd || '$0.025',
          durationSec: data.durationSec || '3.0s'
        };

        if (typeof renderApp === 'function') renderApp();
        return;
      }
    }
    throw new Error('API Fallback Required');
  } catch (err) {
    console.warn('Production AI Fallback to Client Canvas Engine:', err);
    if (typeof processTryOnCanvas === 'function') {
      processTryOnCanvas(state.aiUserPhoto, modelObj, function(canvasUrl) {
        state.aiActivePreview = {
          index: idx,
          modelName: modelObj.name,
          imageUrl: canvasUrl,
          generationId: 'gen_canvas_' + Date.now(),
          costUsd: '$0.00',
          durationSec: '0.5s'
        };
        if (typeof renderApp === 'function') renderApp();
      });
    } else {
      state.aiCredits = (state.aiCredits || 0) + 1;
      alert('⚠️ AI Saç Deneme Hatası: İşlem gerçekleştirilemedi. Hakkınız iade edildi.');
    }
  } finally {
    isAiGenerating = false;
    if (tryOnBtn) {
      tryOnBtn.disabled = false;
      tryOnBtn.innerHTML = '📸 Üzerimde Dene';
    }
  }
}

function renderSuperAdminAiTelemetryView(container) {
  const dbUrl = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

  fetch(`${dbUrl}/ai_telemetry.json`)
    .then(res => res.json())
    .then(telemetryData => {
      const records = telemetryData ? Object.values(telemetryData) : [];
      const totalGen = records.length;
      const successGen = records.filter(r => r.status === 'SUCCESS').length;
      const failedGen = totalGen - successGen;
      const totalCostUsd = records.reduce((acc, r) => acc + parseFloat((r.costUsd || '$0').replace('$', '')), 0).toFixed(4);

      container.innerHTML = `
        <div class="card card-gold animate-fade">
          <h3 style="font-size: 17px; font-weight: 700; color: var(--gold-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span>📊</span> Replicate AI Kullanım & Gerçek Maliyet Analizi
          </h3>

          <!-- METRICS GRID -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 20px;">
            <div style="background: #070c1a; padding: 12px; border-radius: 12px; border: 1px solid var(--border-gold); text-align: center;">
              <div style="font-size: 22px; font-weight: 700; color: var(--gold-primary);">${totalGen}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Toplam AI Üretimi</div>
            </div>
            <div style="background: #070c1a; padding: 12px; border-radius: 12px; border: 1px solid var(--border-gold); text-align: center;">
              <div style="font-size: 22px; font-weight: 700; color: #34d399;">${successGen}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Başarılı Üretim</div>
            </div>
            <div style="background: #070c1a; padding: 12px; border-radius: 12px; border: 1px solid var(--border-gold); text-align: center;">
              <div style="font-size: 22px; font-weight: 700; color: #ef4444;">${failedGen}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Başarısız / İade</div>
            </div>
            <div style="background: #070c1a; padding: 12px; border-radius: 12px; border: 1px solid var(--border-gold); text-align: center;">
              <div style="font-size: 22px; font-weight: 700; color: #38bdf8;">$${totalCostUsd}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Gerçek AI Maliyeti</div>
            </div>
          </div>
        </div>
      `;
    })
    .catch(err => {
      console.warn('Telemetry fetch error:', err);
    });
}
