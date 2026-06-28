import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

export function mergeDeep(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override === undefined ? base : override;
  }
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : override;
  }
  const output = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    output[key] = mergeDeep(base[key], value);
  }
  return output;
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJsonFile(filePath, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw new Error(`JSON inválido em ${filePath}: ${error.message}`);
  }
}

export async function writeJsonFile(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function parseJsonEnv(name) {
  const raw = process.env[name];
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`A variável ${name} precisa conter JSON válido: ${error.message}`);
  }
}

export function safeJsonParse(raw) {
  if (!raw) return null;
  const text = String(raw)
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(text.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function stripHtml(html = '') {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function clampText(value, maxLength = 4000) {
  const text = String(value ?? '');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 22))}\n...[texto cortado]`;
}

export function getHeader(headers = [], name) {
  const found = headers.find((header) => header.name?.toLowerCase() === name.toLowerCase());
  return found?.value ?? '';
}

export function parseEmailAddress(value = '') {
  const text = String(value);
  const angleMatch = text.match(/<([^>]+)>/);
  const email = (angleMatch?.[1] ?? text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
  const name = text.replace(/<[^>]+>/g, '').replace(/"/g, '').trim();
  return {
    name,
    email: email.toLowerCase(),
    domain: email.includes('@') ? email.split('@').pop().toLowerCase() : ''
  };
}

export function parseEmailAddresses(value = '') {
  const matches = String(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return [...new Set(matches.map((email) => email.toLowerCase()))];
}

export function decodeBase64Url(value = '') {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

export function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function includesAny(text, keywords = []) {
  const haystack = String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  return keywords.some((keyword) => {
    const needle = String(keyword ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
    return needle && haystack.includes(needle);
  });
}

export function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function nowIso() {
  return new Date().toISOString();
}

export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function stableId(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function daysBetweenNow(dateLike) {
  if (!dateLike) return Number.NaN;
  const time = new Date(dateLike).getTime();
  if (!Number.isFinite(time)) return Number.NaN;
  return (Date.now() - time) / 86400000;
}

