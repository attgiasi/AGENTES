import { EMAIL_DECISION_SCHEMA, validateDecision } from './schema.js';
import { buildClassifierPrompt } from './prompt.js';
import { safeJsonParse } from '../utils.js';

export async function classifyWithOpenAI(emailContext, settings) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { skipped: true, warning: 'OPENAI_API_KEY não configurada.' };
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || settings.ai.openai.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = process.env.OPENAI_MODEL || settings.ai.openai.model;
  const prompt = buildClassifierPrompt(emailContext, settings);

  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'gmail_agent_email_decision',
          strict: true,
          schema: EMAIL_DECISION_SCHEMA
        }
      },
      temperature: settings.ai.openai.temperature
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      skipped: true,
      warning: `OpenAI retornou erro ${response.status}: ${data.error?.message || response.statusText}`
    };
  }

  const parsed = safeJsonParse(extractOpenAIText(data));
  if (!parsed) {
    return { skipped: true, warning: 'OpenAI respondeu fora do JSON esperado.', raw: data };
  }

  const validation = validateDecision(parsed);
  if (!validation.ok) {
    return { skipped: true, warning: `JSON da OpenAI não passou na validação: ${validation.errors.join('; ')}`, raw: parsed };
  }

  return {
    source: 'openai',
    ...parsed
  };
}

export function extractOpenAIText(data = {}) {
  if (typeof data.output_text === 'string') return data.output_text;
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') chunks.push(content.text);
      if (typeof content.output_text === 'string') chunks.push(content.output_text);
    }
  }
  return chunks.join('\n').trim();
}

