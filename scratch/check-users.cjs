const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function run() {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach(l => {
      const [k, ...v] = l.split('=');
      if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
    });
  }

  if (process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: 'meteorfy-11bff',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });

    try {
      const authUsers = await admin.auth().listUsers(10);
      console.log('--- AUTH USERS ---');
      authUsers.users.forEach(u => console.log(u.uid, u.email));

      const firestoreUsers = await admin.firestore().collection('users').limit(10).get();
      console.log('--- FIRESTORE USERS ---');
      firestoreUsers.forEach(d => console.log(d.id, d.data().email || d.data().username));
    } catch (e) {
      console.error(e);
    }
  } else {
    console.log('Env keys missing');
  }
}

run();
