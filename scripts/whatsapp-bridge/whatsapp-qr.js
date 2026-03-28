const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const sessionDir = path.join(process.env.HOME || '~', '.hermes', 'whatsapp', 'session');

async function main() {
  let { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('QR code received, generating image...');
      const qrPath = '/tmp/whatsapp-qr.png';
      await qrcode.toFile(qrPath, qr, { width: 400 });
      console.log('QR saved to:', qrPath);
      const base64 = fs.readFileSync(qrPath).toString('base64');
      console.log('BASE64_QR:' + base64);
      process.exit(0);
    }
    
    if (connection === 'close') {
      const reason = new (require('boom').Boom)(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log('Logged out');
      }
      process.exit(1);
    }
    
    if (connection === 'open') {
      console.log('Already connected!');
      process.exit(0);
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

main().catch(console.error);
