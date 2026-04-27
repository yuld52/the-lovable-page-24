
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, cert } from 'firebase-admin/app';
import fs from 'fs';
import path from 'path';

async function check() {
  const env = fs.readFileSync('.env', 'utf8');
  const privateKeyMatch = env.match(/FIREBASE_PRIVATE_KEY="(.+?)"/s);
  const clientEmailMatch = env.match(/FIREBASE_CLIENT_EMAIL="(.+?)"/);
  
  if (!privateKeyMatch || !clientEmailMatch) {
    console.error("Could not find credentials in .env");
    return;
  }
  
  const privateKey = privateKeyMatch[1].replace(/\\n/g, '\n');
  const clientEmail = clientEmailMatch[1];
  
  initializeApp({
    credential: cert({
      projectId: 'meteorfy-11bff',
      clientEmail: clientEmail,
      privateKey: privateKey
    })
  });
  
  const user = await getAuth().getUser('WAJaA3PSNlWyTqvdKcb9rlZ4LAD3');
  console.log("USER INFO:", JSON.stringify({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName
  }, null, 2));
}

check().catch(console.error);
