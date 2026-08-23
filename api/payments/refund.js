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
    const { userId, userToken, paymentId, requestedRefundAmount } = req.body;

    if (!userId || !userToken || !paymentId) {
      return res.status(400).json({ error: 'Missing required parameters (userId, userToken, paymentId)' });
    }

    if (!verifyUserToken(userId, userToken)) {
      return res.status(401).json({ error: 'Unauthorized session token signature' });
    }

    // Fetch Payment Record
    const paymentRes = await fetch(`${firebaseDatabaseUrl}/payments/${paymentId}.json`);
    const paymentData = await paymentRes.json();

    if (!paymentData || paymentData.userId !== userId) {
      return res.status(404).json({ error: 'Payment record not found or user mismatch' });
    }

    if (paymentData.status !== 'success') {
      return res.status(400).json({ error: `Cannot refund payment with status: ${paymentData.status}` });
    }

    // Fetch User Credit Balance & Ledger
    const userRes = await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`);
    const userData = (await userRes.json()) || {};

    const creditType = paymentData.creditType || 'economyCredits';
    const creditsPurchased = paymentData.creditAmount || 10;
    const originalAmount = paymentData.amount || 29.99;

    // Calculate Consumed vs Remaining Credits from Ledger
    const ledgerRes = await fetch(`${firebaseDatabaseUrl}/users/${userId}/credit_ledger.json`);
    const ledgerData = (await ledgerRes.json()) || {};
    const ledgerList = Object.values(ledgerData);

    const purchaseEntry = ledgerList.find(l => l.paymentId === paymentId && l.type === 'purchase');
    const creditsConsumed = purchaseEntry ? (purchaseEntry.creditsConsumed || 0) : 0;
    const creditsRemaining = Math.max(0, creditsPurchased - creditsConsumed);

    // Calculate Pro-Rata Maximum Refundable Amount (Prevents Free AI Consumption Exploit!)
    const proRataRefundableAmount = parseFloat(((creditsRemaining / creditsPurchased) * originalAmount).toFixed(2));

    if (creditsConsumed > 0 && requestedRefundAmount && requestedRefundAmount > proRataRefundableAmount) {
      return res.status(400).json({
        error: 'Full refund blocked: AI credits have been partially consumed.',
        creditsPurchased,
        creditsConsumed,
        creditsRemaining,
        proRataRefundableAmount: `${proRataRefundableAmount} TL`,
        message: `Bu ödemeye ait ${creditsConsumed} adet AI hakkı kullanıldığı için tam iade yapılamaz. Azami kısmi iade tutarı: ${proRataRefundableAmount} TL'dir.`
      });
    }

    const actualRefundAmount = requestedRefundAmount ? Math.min(requestedRefundAmount, proRataRefundableAmount) : proRataRefundableAmount;

    // Atomically Deduct Remaining Unconsumed Credits & Write Ledger Record
    const currentBalance = userData[creditType] || 0;
    const newBalance = Math.max(0, currentBalance - creditsRemaining);

    await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [creditType]: newBalance })
    });

    const ledgerId = 'led_ref_' + Date.now();
    const ledgerEntry = {
      ledgerId,
      userId,
      type: 'refund',
      paymentId,
      creditType,
      creditsAmount: -creditsRemaining,
      refundedAmountTRY: actualRefundAmount,
      timestamp: Date.now()
    };

    await fetch(`${firebaseDatabaseUrl}/users/${userId}/credit_ledger/${ledgerId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ledgerEntry)
    });

    await fetch(`${firebaseDatabaseUrl}/payments/${paymentId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'refunded',
        refundedAt: Date.now(),
        refundedAmount: actualRefundAmount,
        creditsRemaining: 0,
        creditsConsumed
      })
    });

    return res.status(200).json({
      success: true,
      paymentId,
      status: 'refunded',
      refundedAmountTRY: `${actualRefundAmount} TL`,
      deductedCredits: creditsRemaining,
      newBalance
    });
  } catch (err) {
    console.error('Pro-Rata Refund Error:', err);
    return res.status(500).json({ error: 'Serverless Refund Error', details: err.message });
  }
}
