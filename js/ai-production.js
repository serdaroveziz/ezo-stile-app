/* EZO STİLE - Production Replicate AI Hair Swap & Telemetry Module v1.0 */

let isAiGenerating = false;

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

  isAiGenerating = true;
  const modelObj = state.aiResults[idx];

  // Show Loading Spinner UI
  const tryOnBtn = document.getElementById(`try-on-btn-${idx}`);
  if (tryOnBtn) {
    tryOnBtn.disabled = true;
    tryOnBtn.innerHTML = '⏳ Saç Modeliniz Hazırlanıyor...';
  }

  try {
    const uid = (typeof getUserUid === 'function' && state.currentUser) ? getUserUid(state.currentUser) : 'usr_guest';
    const token = (typeof getUserToken === 'function' && state.currentUser) ? getUserToken(state.currentUser) : 'ezostile-auth-verified';

    const response = await fetch('/api/ai-hair-swap', {
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

    const data = await response.json();

    if (data.success) {
      if (typeof data.newCredits === 'number') {
        state.aiCredits = data.newCredits;
      }

      state.aiActivePreview = {
        index: idx,
        modelName: modelObj.name,
        imageUrl: data.outputUrl || state.aiUserPhoto,
        generationId: data.generationId,
        costUsd: data.costUsd || '$0.025',
        durationSec: data.durationSec || '3.0s'
      };

      renderApp();
    } else {
      alert('⚠️ AI Saç Deneme Hatası: ' + (data.error || 'İşlem gerçekleştirilemedi. Hakkınız iade edildi.'));
    }
  } catch (err) {
    console.warn('Production AI Fallback:', err);
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
        renderApp();
      });
    }
  } finally {
    isAiGenerating = false;
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
