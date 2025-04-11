import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import fs from 'fs';

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

    const msgText = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    const isCmd = msgText.startsWith('!');
    const cmd = isCmd ? msgText.slice(1).split(' ')[0].toLowerCase() : null;

    if (cmd === 'log') {
      const info = m.message?.extendedTextMessage?.contextInfo?.forwardedNewsletterMessageInfo;

      if (!info) {
        await sock.sendMessage(m.key.remoteJid, { text: '❌ No forwarded newsletter message info.' }, { quoted: m });
      } else {
        await sock.sendMessage(m.key.remoteJid, {
          text: `✅ Channel Info:\n\n*Name:* ${info.newsletterName}\n*JID:* ${info.newsletterJid}\n*Msg ID:* ${info.serverMessageId}`
        }, { quoted: m });
      }
    }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    }
  });
};

startBot();
