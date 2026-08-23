import crypto from 'crypto';

const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
const HMAC_SECRET = process.env.HMAC_SECRET || 'ezostile-server-only-secret-key-2026';

function verifyUserToken(userId, token) {
  if (!userId || !token) return false;
  try {
    const [timestampStr, signature] = token.split('.');
    if (!timestampStr || !signature) return false;
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    if (isNaN(timestamp) || (now - timestamp) > 86400000) return false;

    const expectedSignature = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(`${userId}.${timestamp}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (err) {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { action, userId, userToken, adTransactionId, starsToConvert } = req.body;

    if (!userId || !userToken) {
      return res.status(400).json({ error: 'Missing userId or userToken' });
    }

    if (!verifyUserToken(userId, userToken)) {
      return res.status(401).json({ error: 'Unauthorized session token signature' });
    }

    // Fetch System Economy Config
    const configRes = await fetch(`${firebaseDatabaseUrl}/system_config/economy.json`);
    const systemConfig = (await configRes.json()) || {
      starsPerAd: 50,
      starsPerCredit: 100,
      dailyAdLimit: 6,
      initialFreeCredits: 3,
      appointmentBonusCredits: 2
    };

    // Fetch User Record
    const userRes = await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`);
    const userData = (await userRes.json()) || {};

    const todayStr = new Date().toISOString().split('T')[0];
    const lastDate = userData.lastRewardDate || '';
    let dailyAds = (lastDate === todayStr) ? (userData.dailyRewardedAds || 0) : 0;
    let currentStars = userData.aiStars || 0;
    let economyCredits = userData.economyCredits || 0;

    // -------------------------------------------------------------
    // ACTION 1: CLAIM REWARDED AD STARS
    // -------------------------------------------------------------
    if (action === 'claim_ad_reward') {
      if (!adTransactionId) {
        return res.status(400).json({ error: 'Missing adTransactionId' });
      }

      // Check Idempotency (Ad transaction ID reuse)
      const txCheckRes = await fetch(`${firebaseDatabaseUrl}/ad_transactions/${adTransactionId}.json`);
      const txCheckData = await txCheckRes.json();
      if (txCheckData) {
        return res.status(409).json({ error: 'Duplicate ad transaction ID. Reward already claimed.' });
      }

      // Check Daily Ad Limit
      if (dailyAds >= systemConfig.dailyAdLimit) {
        return res.status(429).json({ error: `Daily ad limit reached (${systemConfig.dailyAdLimit} ads/day)` });
      }

      const rewardStars = systemConfig.starsPerAd;
      const newStars = currentStars + rewardStars;
      const newLifetime = (userData.lifetimeStarsEarned || 0) + rewardStars;
      dailyAds += 1;

      // Update User Star Wallet & Log Ad Transaction
      await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiStars: newStars,
          lifetimeStarsEarned: newLifetime,
          dailyRewardedAds: dailyAds,
          lastRewardDate: todayStr
        })
      });

      await fetch(`${firebaseDatabaseUrl}/ad_transactions/${adTransactionId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          starsAwarded: rewardStars,
          timestamp: Date.now(),
          status: 'VERIFIED'
        })
      });

      return res.status(200).json({
        success: true,
        action: 'claim_ad_reward',
        starsAwarded: rewardStars,
        totalStars: newStars,
        dailyAdsUsed: dailyAds,
        dailyAdLimit: systemConfig.dailyAdLimit
      });
    }

    // -------------------------------------------------------------
    // ACTION 2: CONVERT STARS TO ECONOMY AI CREDIT
    // -------------------------------------------------------------
    else if (action === 'convert_stars') {
      const requiredStars = systemConfig.starsPerCredit;

      if (currentStars < requiredStars) {
        return res.status(400).json({
          error: 'Insufficient stars for conversion',
          currentStars,
          requiredStars
        });
      }

      const newStars = currentStars - requiredStars;
      const newLifetimeSpent = (userData.lifetimeStarsSpent || 0) + requiredStars;
      const newEconomyCredits = economyCredits + 1;

      await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiStars: newStars,
          lifetimeStarsSpent: newLifetimeSpent,
          economyCredits: newEconomyCredits
        })
      });

      return res.status(200).json({
        success: true,
        action: 'convert_stars',
        convertedCredit: 1,
        remainingStars: newStars,
        totalEconomyCredits: newEconomyCredits
      });
    } else {
      return res.status(400).json({ error: 'Invalid action. Must be claim_ad_reward or convert_stars' });
    }
  } catch (err) {
    console.error('AI Star Wallet Serverless Error:', err);
    return res.status(500).json({ error: 'Serverless Wallet Error', details: err.message });
  }
}
