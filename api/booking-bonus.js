/* EZO STİLE - Vercel Serverless Function: Booking Bonus API (+2 AI Credits on Admin Approval) */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { appointmentId, adminPassword } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ error: 'Missing appointmentId parameter' });
    }

    // Verify Admin Password authorization
    if (adminPassword !== '1405') {
      return res.status(401).json({ error: 'Unauthorized Admin Authentication' });
    }

    const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

    // 1. Fetch appointment from Firebase
    const aptRes = await fetch(`${firebaseDatabaseUrl}/ezostile_v5/appointments.json`);
    const appointments = await aptRes.json();

    if (!appointments) {
      return res.status(404).json({ error: 'No appointments found' });
    }

    const aptIndex = appointments.findIndex(a => a && (a.id === appointmentId || a.id == appointmentId));
    if (aptIndex === -1) {
      return res.status(404).json({ error: 'Appointment ID not found' });
    }

    const targetApt = appointments[aptIndex];

    // Check if appointment is approved and bonus has NOT been claimed yet
    if (targetApt.aiBonusClaimed === true) {
      return res.status(400).json({ error: 'Bonus already claimed for this appointment', claimed: true });
    }

    const userId = targetApt.userId || targetApt.customerPhone;
    if (!userId) {
      return res.status(400).json({ error: 'Missing customer identity on appointment' });
    }

    // 2. Fetch customer user record
    const userRes = await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`);
    const userData = await userRes.json();
    const currentCredits = (userData && typeof userData.aiCredits === 'number') ? userData.aiCredits : 3;

    const newCredits = currentCredits + 2;

    // 3. Update customer credits and mark appointment aiBonusClaimed = true
    await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiCredits: newCredits })
    });

    appointments[aptIndex].aiBonusClaimed = true;
    appointments[aptIndex].status = 'approved';

    await fetch(`${firebaseDatabaseUrl}/ezostile_v5.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointments })
    });

    return res.status(200).json({ success: true, bonusAdded: 2, newCredits, appointmentId });
  } catch (error) {
    console.error('Booking Bonus Error:', error);
    return res.status(500).json({ error: 'Internal Serverless Error', details: error.message });
  }
}
