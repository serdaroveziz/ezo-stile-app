/* EZO STİLE - Multi-Tenant Business Data Isolation Module v1.0 */

const DEFAULT_MAIN_BUSINESS = {
  id: 'ezo-stile-main',
  name: 'EZO STİLE VIP Berber & Kuaför',
  logo: './logo.png',
  phone: '05338000000',
  address: 'Girne Cad. VIP Berber Sk. No:14',
  description: 'Erkek Saç, Sakal & VIP Cilt Bakım Salonu',
  status: 'active',
  package: 'Pro',
  aiLimit: 500,
  createdAt: '2026-01-01'
};

function getActiveBusinesses() {
  if (typeof state === 'undefined') return [DEFAULT_MAIN_BUSINESS];
  const list = state.businesses || [];
  if (!list.find(b => b.id === DEFAULT_MAIN_BUSINESS.id)) {
    list.unshift(DEFAULT_MAIN_BUSINESS);
  }
  return list;
}

function registerNewBusiness(businessData, callback) {
  if (typeof state === 'undefined') return;
  const newBiz = {
    id: 'biz-' + Date.now(),
    name: businessData.name,
    logo: businessData.logo || './logo.png',
    phone: businessData.phone,
    address: businessData.address || 'Belirtilmedi',
    description: businessData.description || 'VIP Erkek Kuaför Salonu',
    status: 'pending', // Requires Super Admin approval
    package: 'Ücretsiz',
    aiLimit: 50,
    createdAt: new Date().toISOString().split('T')[0]
  };

  state.businesses = state.businesses || [DEFAULT_MAIN_BUSINESS];
  state.businesses.push(newBiz);
  localStorage.setItem('gc_businesses', JSON.stringify(state.businesses));
  
  if (typeof syncToCloud === 'function') syncToCloud();
  if (callback) callback(newBiz);
}
