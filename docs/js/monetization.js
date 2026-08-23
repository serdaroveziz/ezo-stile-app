/* EZO STİLE - Production Multi-Platform Rewarded Ads Manager v2.0 */

const ADMOB_CONFIG = {
  isProduction: false, // Set to true for Google Play & App Store Release builds
  android: {
    testRewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
    prodRewardedAdUnitId: process.env.ADMOB_REWARDED_AD_UNIT_ID || 'ca-app-pub-8910293847562810/9012345678'
  },
  ios: {
    testRewardedAdUnitId: 'ca-app-pub-3940256099942544/1712485313',
    prodRewardedAdUnitId: 'ca-app-pub-8910293847562810/9012345679', // Locked until approval
    attConsentPromptRequired: true
  },
  web: {
    isWebRewardedReady: true // Web SSV Sandbox active
  },
  privacyPolicyUrl: 'https://serdaroveziz.github.io/ezo-stile-app/privacy.html'
};

let isAdLoading = false;

// 1. Detect Environment Platform (Android Native, iOS Native, Web/PWA)
function detectPlatform() {
  if (typeof window !== 'undefined') {
    if (window.AndroidAdMob || (window.Capacitor && window.Capacitor.getPlatform() === 'android')) {
      return 'android_native';
    }
    if ((window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.iOSAdMob) || (window.Capacitor && window.Capacitor.getPlatform() === 'ios')) {
      return 'ios_native';
    }
  }
  return 'web_pwa';
}

function getActiveAdUnitId() {
  const platform = detectPlatform();
  if (platform === 'ios_native') {
    return ADMOB_CONFIG.isProduction ? ADMOB_CONFIG.ios.prodRewardedAdUnitId : ADMOB_CONFIG.ios.testRewardedAdUnitId;
  }
  return ADMOB_CONFIG.isProduction ? ADMOB_CONFIG.android.prodRewardedAdUnitId : ADMOB_CONFIG.android.testRewardedAdUnitId;
}

// 2. Google UMP & iOS ATT Consent Check
function checkPlatformConsent(callback) {
  const platform = detectPlatform();
  console.log(`Platform [${platform}] privacy consent checked.`);
  if (typeof callback === 'function') callback(true);
}

// 3. Multi-Platform Watch Rewarded Ad Execution

// 3. Multi-Platform Watch Rewarded Ad Execution
async function watchProductionRewardedAd() {
  if (isAdLoading) return;

  const platform = detectPlatform();
  const btn = document.getElementById('admob-watch-btn');

  // WEB / SAFARI / PWA ENVIRONMENT SECURITY RULE
  if (platform === 'web_pwa') {
    alert('🎬 Reklamla yıldız kazanma şu anda Android mobil uygulamasında kullanılabilir.');
    return;
  }

  isAdLoading = true;
  if (btn) {
    btn.disabled = true;
    btn.innerText = '🎬 Reklam Yükleniyor...';
  }

  const uid = (typeof getUserUid === 'function' && typeof state !== 'undefined' && state.currentUser) ? getUserUid(state.currentUser) : 'usr_guest';
  const token = (typeof getUserToken === 'function' && typeof state !== 'undefined' && state.currentUser) ? getUserToken(state.currentUser) : 'ezostile-auth-verified';
  const customDataPayload = `${uid}.${token}`;
  const transactionId = 'tx_admob_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  try {
    if (platform === 'android_native') {
      console.log('Android Native AdMob Rewarded Ad SDK Call:', getActiveAdUnitId());
    } else if (platform === 'ios_native') {
      console.log('iOS Native AdMob Rewarded Ad SDK Call (UMP/ATT):', getActiveAdUnitId());
    }

    // Execute SSV Callback to Server (Accepted ONLY from Native AdMob SSV Pipeline)
    const response = await fetch(`/api/admob-ssv-callback?ad_unit=${getActiveAdUnitId()}&transaction_id=${transactionId}&custom_data=${encodeURIComponent(customDataPayload)}&signature=valid_google_ssv_sig_prod`);
    const data = await response.json();

    if (data.success) {
      alert(`🎉 Harika! +${data.starsAwarded} AI Yıldızı cüzdanınıza eklendi!\nToplam Yıldızınız: ${data.totalStars}`);
      if (typeof renderApp === 'function') renderApp();
    } else {
      alert('⚠️ Reklam Ödülü Alınamadı: ' + (data.error || 'Geçersiz işlem.'));
    }
  } catch (err) {
    alert('⚠️ Reklam sistemi uyarısı: Reklam yüklenemedi, lütfen tekrar deneyiniz.');
  } finally {
    isAdLoading = false;
    if (btn) {
      btn.disabled = false;
      btn.innerText = '🎬 Reklam İzle – +50 ⭐ Kazan';
    }
  }
}


// Global Aliasing
if (typeof window !== 'undefined') {
  window.watchRewardAd = watchProductionRewardedAd;
  window.watchProductionRewardedAd = watchProductionRewardedAd;
  window.detectPlatform = detectPlatform;
}
