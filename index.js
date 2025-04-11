import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message) return;

    const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    const cmd = text.startsWith('!') ? text.slice(1).split(' ')[0].toLowerCase() : '';

    if (cmd === 'log') {
      const info = m.message?.extendedTextMessage?.contextInfo?.forwardedNewsletterMessageInfo;

      if (!info) {
        await sock.sendMessage(m.key.remoteJid, { text: '❌ No newsletter info found.' }, { quoted: m });
      } else {
        await sock.sendMessage(m.key.remoteJid, {
          text: `✅ Newsletter Info:\n\n*Name:* ${info.newsletterName}\n*JID:* ${info.newsletterJid}\n*Msg ID:* ${info.serverMessageId}`
        }, { quoted: m });
      }
    }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      startBot();
    }
  });
};

startBot();
