import dotenv from 'dotenv';
import {
  GMAIL_SCOPES,
  getGmailClient,
  getProfile,
  loadGoogleCredentials,
  loadGoogleToken,
  tokenHasScope
} from '../src/gmail/auth.js';

dotenv.config({ quiet: true });

try {
  const credentials = await loadGoogleCredentials();
  const token = await loadGoogleToken();

  console.log(`Credencial Google: ${credentials ? 'encontrada' : 'não encontrada'}`);
  console.log(`Token Gmail: ${token ? 'encontrado' : 'não encontrado'}`);

  if (token) {
    console.log(`Refresh token: ${token.refresh_token ? 'presente' : 'ausente'}`);
    console.log(`Escopo gmail.modify: ${tokenHasScope(token, GMAIL_SCOPES.modify[0]) ? 'presente' : 'ausente'}`);
    if (token.expiry_date) console.log(`Access token expira em: ${new Date(Number(token.expiry_date)).toISOString()}`);
    if (token.refresh_token_expires_in) {
      const days = Math.round(Number(token.refresh_token_expires_in) / 86400);
      console.warn(`Aviso: este token informa expiração do refresh token em aproximadamente ${days} dias. Se o app OAuth estiver em Testing, o token do GitHub pode expirar e causar invalid_grant. Publique o app como Production e gere novo token.`);
    }
  }

  const gmail = await getGmailClient();
  const profile = await getProfile(gmail);
  console.log(`Gmail conectado com sucesso: ${profile.emailAddress}`);
  console.log(`Total aproximado de mensagens: ${profile.messagesTotal}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
