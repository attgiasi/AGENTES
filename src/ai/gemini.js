import { EMAIL_DECISION_SCHEMA, validateDecision } from './schema.js';
import { buildClassifierPrompt } from './prompt.js';
import { safeJsonParse } from '../utils.js';

export async function classifyWithGemini(emailContext, settings) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || !settings.ai.gemini.enabled) {
    return { skipped: true, warning: 'Gemini desligado ou GEMINI_API_KEY ausente.' };
  }

  const baseUrl = (process.env.GEMINI_BASE_URL || settings.ai.gemini.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
  const model = process.env.GEMINI_MODEL || settings.ai.gemini.model;
  const endpoint = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent`;
  const prompt = buildClassifierPrompt(emailContext, settings);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: settings.ai.gemini.temperature,
        responseMimeType: 'application/json',
        responseSchema: EMAIL_DECISION_SCHEMA
      }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      skipped: true,
      warning: `Gemini retornou erro ${response.status}: ${data.error?.message || response.statusText}`
    };
  }

  const parsed = safeJsonParse(extractGeminiText(data));
  if (!parsed) {
    return { skipped: true, warning: 'Gemini respondeu fora do JSON esperado.', raw: data };
  }
  const validation = validateDecision(parsed);
  if (!validation.ok) {
    return { skipped: true, warning: `JSON do Gemini não passou na validação: ${validation.errors.join('; ')}`, raw: parsed };
  }
  return {
    source: 'gemini',
    ...parsed
  };
}

export function extractGeminiText(data = {}) {
  const chunks = [];
  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (typeof part.text === 'string') chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}
