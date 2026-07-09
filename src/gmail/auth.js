import fs from 'node:fs/promises';
import { google } from 'googleapis';
import { parseJsonEnv, readJsonFile } from '../utils.js';

export const GMAIL_SCOPES = {
  readonly: ['https://www.googleapis.com/auth/gmail.readonly'],
  modify: ['https://www.googleapis.com/auth/gmail.modify'],
  compose: ['https://www.googleapis.com/auth/gmail.compose'],
  send: ['https://www.googleapis.com/auth/gmail.send'],
  full: ['https://mail.google.com/']
};

export function scopesForMode(mode = 'modify') {
  if (mode === 'readonly') return GMAIL_SCOPES.readonly;
  if (mode === 'compose') return [...GMAIL_SCOPES.modify, ...GMAIL_SCOPES.compose];
  if (mode === 'send') return [...GMAIL_SCOPES.modify, ...GMAIL_SCOPES.compose, ...GMAIL_SCOPES.send];
  if (mode === 'full') return GMAIL_SCOPES.full;
  return GMAIL_SCOPES.modify;
}

export async function loadGoogleCredentials() {
  const envCredentials = parseJsonEnv('GOOGLE_CREDENTIALS_JSON');
  if (envCredentials) return envCredentials;
  const filePath = process.env.GOOGLE_CREDENTIALS_PATH || 'credentials.json';
  return readJsonFile(filePath, null);
}

export async function loadGoogleToken() {
  const envToken = parseJsonEnv('GOOGLE_TOKEN_JSON');
  if (envToken) return envToken;
  const filePath = process.env.GOOGLE_TOKEN_PATH || 'token.json';
  return readJsonFile(filePath, null);
}

export async function saveGoogleToken(token) {
  if (process.env.GOOGLE_TOKEN_JSON) return;
  const filePath = process.env.GOOGLE_TOKEN_PATH || 'token.json';
  await fs.writeFile(filePath, `${JSON.stringify(token, null, 2)}\n`, 'utf8');
}

export function buildOAuthClient(credentials, redirectUriOverride = '') {
  const config = credentials.installed || credentials.web || credentials;
  const redirectUri = redirectUriOverride || config.redirect_uris?.[0] || 'http://localhost:3000/oauth2callback';
  return new google.auth.OAuth2(config.client_id, config.client_secret, redirectUri);
}

export async function getOAuthClient() {
  const credentials = await loadGoogleCredentials();
  if (!credentials) {
    throw new Error('Credenciais do Google não encontradas. Configure GOOGLE_CREDENTIALS_JSON ou credentials.json.');
  }
  const token = await loadGoogleToken();
  if (!token) {
    throw new Error('Token do Gmail não encontrado. Rode npm run auth:gmail e configure GOOGLE_TOKEN_JSON.');
  }
  const oauth2Client = buildOAuthClient(credentials);
  oauth2Client.setCredentials(token);
  return oauth2Client;
}

export async function getGmailClient() {
  const auth = await getOAuthClient();
  return google.gmail({ version: 'v1', auth });
}

export async function getProfile(gmail) {
  try {
    const response = await gmail.users.getProfile({ userId: 'me' });
    return response.data;
  } catch (error) {
    throw explainGoogleAuthError(error);
  }
}

export function tokenHasScope(token, scope) {
  const value = String(token?.scope || '');
  return value.split(/\s+/).includes(scope);
}

export function explainGoogleAuthError(error) {
  const message = [
    error?.message,
    error?.response?.data?.error,
    error?.response?.data?.error_description
  ].filter(Boolean).join(' ');

  if (/invalid_grant/i.test(message)) {
    return new Error([
      'Token do Gmail inválido ou expirado (invalid_grant).',
      'Isso normalmente acontece quando o acesso foi revogado, o token ficou velho ou o GOOGLE_TOKEN_JSON não combina com o credentials.json.',
      'Correção local: rode npm.cmd run auth:gmail, autorize novamente e gere um novo token.json.',
      'Correção no GitHub: copie o novo token.json inteiro e atualize o Secret GOOGLE_TOKEN_JSON.'
    ].join(' '));
  }

  if (/invalid_client/i.test(message)) {
    return new Error([
      'Credencial OAuth do Google inválida (invalid_client).',
      'Confira se o credentials.json ou o Secret GOOGLE_CREDENTIALS_JSON pertence ao mesmo app OAuth usado para gerar o token.'
    ].join(' '));
  }

  if (/insufficient|permission|scope/i.test(message)) {
    return new Error([
      'Permissão Gmail insuficiente.',
      'Rode npm.cmd run auth:gmail novamente para autorizar os escopos necessários.'
    ].join(' '));
  }

  return error;
}
