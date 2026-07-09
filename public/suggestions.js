document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#refreshSuggestions').addEventListener('click', loadSuggestions);
  loadSuggestions();
});

async function loadSuggestions() {
  const data = await api('/api/suggestions');
  const metrics = [
    ['Sugestões', data.totals.suggestions, 'Total de itens para você revisar.'],
    ['Aprovações', data.totals.approvals, 'Aguardam decisão no painel principal.'],
    ['Simulações', data.totals.simulations, 'O agente mostrou o que faria.'],
    ['Bloqueadas', data.totals.blocked, 'Paradas por segurança, limite ou configuração.']
  ];

  document.querySelector('#suggestionMetrics').innerHTML = metrics.map(([title, value, description]) => `
    <article class="metric-card">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(title)}</span>
      <small>${escapeHtml(description)}</small>
    </article>
  `).join('');

  const groups = Object.entries(data.groups || {});
  document.querySelector('#suggestionGroups').innerHTML = groups.map(([key, group]) => renderGroup(key, group)).join('');
}

function renderGroup(key, group) {
  const items = group.items || [];
  return `
    <section class="suggestion-group ${escapeHtml(key)}">
      <div class="section-title">
        <div>
          <h3>${escapeHtml(group.title)} <span class="badge">${escapeHtml(group.count)} item(ns)</span></h3>
          <p class="hint">${escapeHtml(group.description)}</p>
        </div>
      </div>
      <div class="suggestion-grid">
        ${items.length ? items.map(renderSuggestion).join('') : '<p class="empty">Nenhuma sugestão neste bloco.</p>'}
      </div>
    </section>
  `;
}

function renderSuggestion(item) {
  return `
    <article class="suggestion-card">
      <span class="badge">${escapeHtml(sourceLabel(item.source))}</span>
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.summary)}</p>
      <ul>
        <li><strong>Status:</strong> ${escapeHtml(statusLabel(item.status))}</li>
        <li><strong>Risco:</strong> ${escapeHtml(item.risk || 'não informado')}</li>
        <li><strong>E-mail:</strong> ${escapeHtml(item.emailId || 'não informado')}</li>
      </ul>
      <small>${escapeHtml(item.reason || '')}</small>
    </article>
  `;
}

async function api(url) {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha ao carregar sugestões');
  return data;
}

function sourceLabel(source) {
  const labels = {
    approval: 'Aprovação pendente',
    simulation: 'Simulação',
    blocked: 'Bloqueado'
  };
  return labels[source] || source || 'Sugestão';
}

function statusLabel(status) {
  const labels = {
    pending: 'Pendente',
    'dry-run': 'Simulado',
    blocked: 'Bloqueado',
    executed: 'Executado',
    failed: 'Falhou'
  };
  return labels[status] || status || 'Status';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
