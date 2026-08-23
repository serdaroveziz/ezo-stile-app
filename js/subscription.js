/* EZO STİLE - Phase 5 Business Subscription & Feature Locking Module v1.0 */

const CENTRAL_PLANS_CONFIG = {
  free: {
    id: 'free',
    name: 'Ücretsiz Paket',
    employeeLimit: 1,
    advancedAnalytics: false,
    aiFeatures: false,
    campaigns: false,
    priorityListing: false,
    price: '0 TL'
  },
  pro: {
    id: 'pro',
    name: 'Pro Paket',
    employeeLimit: 5,
    advancedAnalytics: true,
    aiFeatures: true,
    campaigns: false,
    priorityListing: false,
    price: 'Yakında'
  },
  premium: {
    id: 'premium',
    name: 'Premium Paket',
    employeeLimit: 20,
    advancedAnalytics: true,
    aiFeatures: true,
    campaigns: true,
    priorityListing: true,
    price: 'Yakında'
  }
};

function getBusinessSubscription(businessObj) {
  if (!businessObj) {
    return { plan: 'free', status: 'active', startedAt: Date.now(), expiresAt: null, trialEndsAt: null, renewalType: 'manual' };
  }
  if (businessObj.subscription) {
    return businessObj.subscription;
  }
  return {
    plan: businessObj.package ? businessObj.package.toLowerCase() : 'free',
    status: businessObj.status || 'active',
    startedAt: Date.now(),
    expiresAt: null,
    trialEndsAt: null,
    renewalType: 'manual'
  };
}

function hasFeature(businessObj, featureName) {
  const sub = getBusinessSubscription(businessObj);
  if (sub.status !== 'active' && sub.status !== 'trial') {
    return false; // Expired or suspended subscription disables paid features
  }
  const planKey = sub.plan || 'free';
  const planConfig = CENTRAL_PLANS_CONFIG[planKey] || CENTRAL_PLANS_CONFIG.free;

  if (featureName === 'employeeLimit') {
    return planConfig.employeeLimit;
  }

  return Boolean(planConfig[featureName]);
}

function getEmployeeLimit(businessObj) {
  return hasFeature(businessObj, 'employeeLimit');
}

function openPlanComparisonModal() {
  const root = document.getElementById('modal-root');
  if (!root) return;

  root.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-width: 680px; width: 94%; border-color: var(--gold-primary);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 18px; font-weight: 700; color: var(--gold-primary); margin: 0; display: flex; align-items: center; gap: 8px;">
            <span>👑</span> İşletme Abonelik Paketleri
          </h3>
          <button onclick="closeModal()" class="btn btn-secondary" style="min-height: 32px; width: 32px; padding: 0;">✕</button>
        </div>

        <p class="text-muted" style="margin-bottom: 20px;">Salonunuzun büyüklüğüne en uygun paketi seçerek özelliklerinizi genişletin.</p>

        <!-- PLANS COMPARISON GRID -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <!-- FREE PLAN CARD -->
          <div style="background: #070c1a; padding: 16px; border-radius: 16px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-size: 16px; font-weight: 700; color: #fff;">Free</div>
              <div style="font-size: 20px; font-weight: 700; color: var(--gold-primary); margin: 6px 0;">0 TL</div>
              <ul style="list-style: none; padding: 0; margin: 12px 0; font-size: 11px; color: #cbd5e1; display: flex; flex-direction: column; gap: 6px;">
                <li>✓ Max 1 Çalışan</li>
                <li>✓ Temel Randevu Akışı</li>
                <li>✓ Hizmet & Fiyat Listesi</li>
                <li style="opacity: 0.4;">✕ Gelişmiş İstatistik</li>
                <li style="opacity: 0.4;">✕ AI Saç Entegrasyonu</li>
              </ul>
            </div>
            <button class="btn btn-secondary" style="width: 100%; min-height: 36px; font-size: 11px;" disabled>Mevcut / Başlangıç</button>
          </div>

          <!-- PRO PLAN CARD -->
          <div style="background: #070c1a; padding: 16px; border-radius: 16px; border: 1.5px solid var(--gold-primary); display: flex; flex-direction: column; justify-content: space-between; position: relative;">
            <span class="badge badge-approved" style="position: absolute; top: -10px; right: 12px; font-size: 9px;">POPÜLER</span>
            <div>
              <div style="font-size: 16px; font-weight: 700; color: var(--gold-primary);">Pro Paket</div>
              <div style="font-size: 20px; font-weight: 700; color: #fff; margin: 6px 0;">Yakında</div>
              <ul style="list-style: none; padding: 0; margin: 12px 0; font-size: 11px; color: #cbd5e1; display: flex; flex-direction: column; gap: 6px;">
                <li>✓ Max 5 Çalışan</li>
                <li>✓ Çalışan Bazlı Takvim</li>
                <li>✓ Gelişmiş İstatistikler</li>
                <li>✓ AI Saç Randevu Entegrasyonu</li>
                <li style="opacity: 0.4;">✕ Öne Çıkarma</li>
              </ul>
            </div>
            <button onclick="alert('💳 Canlı ödeme sistemi entegrasyonu tamamlandığında Pro pakete geçiş yapabilirsiniz.')" class="btn btn-gold" style="width: 100%; min-height: 36px; font-size: 11px;">Pro'ya Yükselt</button>
          </div>

          <!-- PREMIUM PLAN CARD -->
          <div style="background: #070c1a; padding: 16px; border-radius: 16px; border: 1px solid var(--border-gold); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-size: 16px; font-weight: 700; color: #38bdf8;">Premium Paket</div>
              <div style="font-size: 20px; font-weight: 700; color: #fff; margin: 6px 0;">Yakında</div>
              <ul style="list-style: none; padding: 0; margin: 12px 0; font-size: 11px; color: #cbd5e1; display: flex; flex-direction: column; gap: 6px;">
                <li>✓ Max 20 Çalışan</li>
                <li>✓ Tüm Pro Özellikleri</li>
                <li>✓ Özel Kampanyalar</li>
                <li>✓ İşletmeyi Öne Çıkarma</li>
                <li>✓ Öncelikli Destek</li>
              </ul>
            </div>
            <button onclick="alert('💳 Canlı ödeme sistemi entegrasyonu tamamlandığında Premium pakete geçiş yapabilirsiniz.')" class="btn btn-outline-gold" style="width: 100%; min-height: 36px; font-size: 11px;">Premium'a Yükselt</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
