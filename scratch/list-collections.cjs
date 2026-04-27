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

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'meteorfy-11bff',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });

  const collections = await admin.firestore().listCollections();
  console.log('--- COLLECTIONS ---');
  for (const col of collections) {
    const snapshot = await col.limit(1).get();
    console.log(`- ${col.id} (${snapshot.size} docs sampled)`);
  }
}

run();
