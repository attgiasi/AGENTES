import dotenv from 'dotenv';
import { getGmailClient, getProfile } from '../src/gmail/auth.js';

dotenv.config({ quiet: true });

try {
  const gmail = await getGmailClient();
  const profile = await getProfile(gmail);
  console.log(`Gmail conectado com sucesso: ${profile.emailAddress}`);
  console.log(`Total aproximado de mensagens: ${profile.messagesTotal}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
