/* EZO STİLE - Super Admin Panel Module v1.0 */

function renderSuperAdminView(container) {
  if (typeof state === 'undefined') return;
  
  const businesses = (typeof getActiveBusinesses === 'function') ? getActiveBusinesses() : (state.businesses || []);
  const pendingBiz = businesses.filter(b => b.status === 'pending');
  const activeBiz = businesses.filter(b => b.status === 'active');
  const totalApts = (state.appointments || []).length;
  const totalCustomers = (state.appointments || []).map(a => a.customerPhone).filter((v, i, a) => a.indexOf(v) === i).length;

  let html = `
    <div class="card card-gold animate-fade">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-size: 18px; font-weight: 700; color: var(--gold-primary); margin: 0; display: flex; align-items: center; gap: 8px;">
            <span>⚡</span> EZO STİLE Süper Admin Paneli
          </h2>
          <p class="text-muted" style="margin-top: 2px;">Tüm platform işletmelerini ve genel istatistikleri buradan yönetebilirsiniz.</p>
        </div>
        <button onclick="switchRole('customer')" class="btn btn-secondary" style="min-height: 38px; padding: 6px 12px; font-size: 12px;">
          ← Müşteri Ekranı
        </button>
      </div>

      <!-- SYSTEM METRICS STATS GRID -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 20px;">
        <div style="background: #070c1a; padding: 14px; border-radius: 14px; border: 1px solid var(--border-gold); text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: var(--gold-primary);">${businesses.length}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Toplam İşletme</div>
        </div>
        <div style="background: #070c1a; padding: 14px; border-radius: 14px; border: 1px solid var(--border-gold); text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #34d399;">${activeBiz.length}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Aktif Salonlar</div>
        </div>
        <div style="background: #070c1a; padding: 14px; border-radius: 14px; border: 1px solid var(--border-gold); text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #fbbf24;">${pendingBiz.length}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Onay Bekleyenler</div>
        </div>
        <div style="background: #070c1a; padding: 14px; border-radius: 14px; border: 1px solid var(--border-gold); text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #38bdf8;">${totalApts}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Toplam Randevu</div>
        </div>
      </div>

      <!-- BUSINESSES LIST TABLE / CARDS -->
      <h3 style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 12px;">🏢 Platform İşletmeleri</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${businesses.map(b => `
          <div style="background: #070c1a; padding: 16px; border-radius: 14px; border: 1px solid ${b.status === 'pending' ? 'var(--gold-primary)' : 'var(--border-color)'}; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 44px; height: 44px; border-radius: 12px; overflow: hidden; background: #000; border: 1px solid var(--gold-primary); flex-shrink: 0;">
                <img src="${b.logo || './logo.png'}" style="width:100%; height:100%; object-fit:cover;" alt="Logo">
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 700; color: #fff;">${b.name}</div>
                <div style="font-size: 12px; color: var(--gold-primary); margin-top: 2px;">📞 ${b.phone} — 📍 ${b.address}</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Paket: <strong>${b.package || 'Pro'}</strong> | AI Kota: ${b.aiLimit || 500}</div>
              </div>
            </div>

            <div style="display: flex; gap: 8px; align-items: center;">
              <span class="badge ${b.status === 'active' ? 'badge-approved' : b.status === 'pending' ? 'badge-pending' : 'badge-rejected'}">
                ${b.status === 'active' ? '🟢 AKTİF' : b.status === 'pending' ? '⏳ ONAY BEKLİYOR' : '🔴 PASİF'}
              </span>
              ${b.status === 'pending' ? `
                <button onclick="approveBusiness('${b.id}')" class="btn btn-gold" style="min-height: 34px; padding: 4px 12px; font-size: 11px;">✓ Onayla</button>
              ` : `
                <button onclick="toggleBusinessStatus('${b.id}')" class="btn btn-secondary" style="min-height: 34px; padding: 4px 10px; font-size: 11px;">
                  ${b.status === 'active' ? 'Pasife Al' : 'Aktif Et'}
                </button>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function approveBusiness(bizId) {
  if (typeof state === 'undefined' || !state.businesses) return;
  const b = state.businesses.find(x => x.id === bizId);
  if (b) {
    b.status = 'active';
    localStorage.setItem('gc_businesses', JSON.stringify(state.businesses));
    if (typeof syncToCloud === 'function') syncToCloud();
    alert(`✅ "${b.name}" işletmesi onaylandı ve aktif edildi!`);
    renderApp();
  }
}

function toggleBusinessStatus(bizId) {
  if (typeof state === 'undefined' || !state.businesses) return;
  const b = state.businesses.find(x => x.id === bizId);
  if (b) {
    b.status = b.status === 'active' ? 'passive' : 'active';
    localStorage.setItem('gc_businesses', JSON.stringify(state.businesses));
    if (typeof syncToCloud === 'function') syncToCloud();
    renderApp();
  }
}


function upgradeBusinessPlan(bizId, newPlan) {
  if (typeof state === 'undefined') return;
  const adminPassword = state.adminPassword || '1405';

  fetch('/api/admin-upgrade-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId: bizId, newPlan: newPlan, adminPassword: adminPassword })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const b = (state.businesses || []).find(x => x.id === bizId);
      if (b) {
        b.package = newPlan.toUpperCase();
        b.subscription = data.subscription;
      }
      alert(`✅ İşletme paketi "${newPlan.toUpperCase()}" olarak başarıyla yükseltildi!`);
      renderApp();
    } else {
      alert('⚠️ Yükseltme hatası: ' + (data.error || 'İşlem başarısız'));
    }
  })
  .catch(err => {
    console.warn('Fallback local upgrade:', err);
    const b = (state.businesses || []).find(x => x.id === bizId);
    if (b) {
      b.package = newPlan.toUpperCase();
      b.subscription = { plan: newPlan.toLowerCase(), status: 'active', startedAt: Date.now() };
    }
    renderApp();
  });
}
