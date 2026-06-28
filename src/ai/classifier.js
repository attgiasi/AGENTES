import { classifyWithOpenAI } from './openai.js';
import { classifyWithGemini } from './gemini.js';
import { fallbackDecision } from './schema.js';
import { buildEmailContext } from '../email/parser.js';
import { classifyWithRules } from '../modules/rules.js';

export async function classifyEmail(email, settings, db = null) {
  const context = buildEmailContext(email, settings);
  const rules = classifyWithRules(email, settings);

  if (!settings.modules.classification) {
    return { ...rules, motivo: 'Módulo de classificação desligado.' };
  }

  const providers = providersFor(settings);
  const attempts = [];
  for (const provider of providers) {
    try {
      const decision = provider === 'openai'
        ? await classifyWithOpenAI(context, settings)
        : await classifyWithGemini(context, settings);
      attempts.push({ provider, decision });
      if (decision && !decision.skipped) {
        return mergeRuleSafety(decision, rules);
      }
    } catch (error) {
      attempts.push({ provider, decision: { skipped: true, warning: error.message } });
      db?.log('warn', 'ai', `Falha no provedor ${provider}`, { error: error.message });
    }
  }

  const fallback = fallbackDecision(email, attempts.map((item) => item.decision?.warning).filter(Boolean).join(' | ') || 'IA indisponível; usei regras locais.');
  return mergeRuleSafety(fallback, rules);
}

function providersFor(settings) {
  if (settings.ai.compareProviders) return ['openai', 'gemini'];
  if (settings.ai.provider === 'gemini') return ['gemini', 'openai'];
  if (settings.ai.provider === 'fallback') return ['openai', 'gemini'];
  return ['openai', 'gemini'];
}

function mergeRuleSafety(decision, rules) {
  if (rules.categoria !== 'outro' && decision.categoria === 'outro') {
    return {
      ...decision,
      categoria: rules.categoria,
      prioridade: rules.prioridade,
      acao_recomendada: rules.acao_recomendada,
      motivo: `${decision.motivo} Regras locais reforçaram categoria ${rules.categoria}.`
    };
  }
  if (rules.prioridade === 'urgente') {
    return {
      ...decision,
      prioridade: 'urgente',
      categoria: decision.categoria === 'newsletter' ? 'outro' : decision.categoria,
      motivo: `${decision.motivo} Regras locais detectaram urgência.`
    };
  }
  return decision;
}
