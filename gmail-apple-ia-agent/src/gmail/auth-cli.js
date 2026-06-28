import http from 'node:http';
import { URL } from 'node:url';
import dotenv from 'dotenv';
import { buildOAuthClient, loadGoogleCredentials, saveGoogleToken, scopesForMode } from './auth.js';

dotenv.config({ quiet: true });

const args = new Set(process.argv.slice(2));
const mode = args.has('--readonly') ? 'readonly'
  : args.has('--compose') ? 'compose'
    : args.has('--send') ? 'send'
      : args.has('--full-access') ? 'full'
        : 'modify';
const port = Number(process.env.OAUTH_PORT || getArgValue('--port') || 3000);

const credentials = await loadGoogleCredentials();
if (!credentials) {
  console.error('Não encontrei credentials.json nem GOOGLE_CREDENTIALS_JSON.');
  process.exit(1);
}

const redirectUri = `http://localhost:${port}/oauth2callback`;
const oauth2Client = buildOAuthClient(credentials, redirectUri);
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: scopesForMode(mode)
});

console.log('Abra este link completo no navegador para autorizar o Gmail:');
console.log(authUrl);
console.log('');
console.log(`Depois da autorização, o navegador precisa voltar para: ${redirectUri}`);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (!['/', '/oauth2callback'].includes(url.pathname)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const code = url.searchParams.get('code');
    if (!code) {
      res.writeHead(400);
      res.end('Código OAuth ausente.');
      return;
    }
    const { tokens } = await oauth2Client.getToken(code);
    await saveGoogleToken(tokens);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Autorização concluída</h1><p>Você já pode voltar ao terminal.</p>');
    console.log('Token salvo com sucesso.');
    server.close();
  } catch (error) {
    res.writeHead(500);
    res.end(`Erro: ${error.message}`);
    console.error(error);
    server.close();
  }
});

server.listen(port, () => {
  console.log(`Aguardando retorno OAuth em http://localhost:${port}/oauth2callback`);
});

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}
