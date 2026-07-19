import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * HTTP Cloud Function to set admin custom claim on a user
 * This is a temporary function to bootstrap the first admin
 *
 * IMPORTANT: After creating the first admin, this function should be removed or restricted
 *
 * Call with: POST https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/setAdminClaim
 * Body: { "email": "admin@example.com", "secret": "YOUR_SECRET_KEY" }
 */
export const setAdminClaim = functions.https.onRequest(async (req, res) => {
  // Restricted CORS headers - only allow specific origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://admin.community.com', // Production admin dashboard
  ];

  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }

  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { email, secret } = req.body;

    // IMPORTANT: Set this secret in your environment
    // firebase functions:config:set admin.bootstrap_secret="YOUR_SECURE_SECRET"
    const expectedSecret = functions.config().admin?.bootstrap_secret;

    if (!expectedSecret || expectedSecret === 'CHANGE_ME_IN_PRODUCTION') {
      console.error('Admin bootstrap secret not properly configured');
      res.status(503).json({
        error: 'Service not configured',
        message: 'Admin bootstrap secret must be set in Firebase config'
      });
      return;
    }

    if (!email || !secret) {
      res.status(400).json({ error: 'Email and secret are required' });
      return;
    }

    if (secret !== expectedSecret) {
      res.status(403).json({ error: 'Invalid secret' });
      return;
    }

    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      permissions: [
        'moderate_users',
        'moderate_venues',
        'moderate_content',
        'manage_partners',
        'view_analytics',
        'manage_admins',
      ],
    });

    // Update Firestore user document
    await admin.firestore().collection('users').doc(userRecord.uid).update({
      moderationStatus: 'approved',
      verified: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Admin claim set for user: ${email} (${userRecord.uid})`);

    res.status(200).json({
      success: true,
      message: `Admin role granted to ${email}`,
      uid: userRecord.uid,
    });
  } catch (error: any) {
    console.error('Error setting admin claim:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});
