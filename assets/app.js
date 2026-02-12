const endpoints = [
  { id: 'discover', label: 'Discover', method: 'POST', path: 'discover', fields: [
    { name: 'company', label: 'Company', required: true, placeholder: 'Stripe' },
    { name: 'domain', label: 'Domain', placeholder: 'stripe.com' },
    { name: 'type', label: 'Type', placeholder: 'company' },
  ]},
  { id: 'domain-search', label: 'Domain Search', method: 'GET', path: 'domain-search', fields: [
    { name: 'domain', label: 'Domain', required: true, placeholder: 'stripe.com' },
    { name: 'limit', label: 'Limit', placeholder: '10' },
    { name: 'offset', label: 'Offset', placeholder: '0' },
    { name: 'department', label: 'Department', placeholder: 'engineering' },
  ]},
  { id: 'email-finder', label: 'Email Finder', method: 'GET', path: 'email-finder', fields: [
    { name: 'domain', label: 'Domain', required: true, placeholder: 'reddit.com' },
    { name: 'first_name', label: 'First name', required: true, placeholder: 'Alexis' },
    { name: 'last_name', label: 'Last name', required: true, placeholder: 'Ohanian' },
  ]},
  { id: 'email-verifier', label: 'Email Verification', method: 'GET', path: 'email-verifier', fields: [
    { name: 'email', label: 'Email', required: true, placeholder: 'name@company.com' },
  ]},
  { id: 'companies-find', label: 'Company Lookup', method: 'GET', path: 'companies/find', fields: [
    { name: 'domain', label: 'Domain', required: true, placeholder: 'stripe.com' },
  ]},
  { id: 'people-find', label: 'Person Lookup', method: 'GET', path: 'people/find', fields: [
    { name: 'email', label: 'Email', required: true, placeholder: 'name@company.com' },
    { name: 'linkedin_url', label: 'Profile URL', placeholder: 'https://linkedin.com/in/...' },
  ]},
  { id: 'combined-find', label: 'Combined Lookup', method: 'GET', path: 'combined/find', fields: [
    { name: 'email', label: 'Email', required: true, placeholder: 'name@company.com' },
    { name: 'domain', label: 'Domain', placeholder: 'company.com' },
  ]},
];

const tabs = document.querySelector('#tabs');
const form = document.querySelector('#endpointForm');
const statusEl = document.querySelector('#status');
const resultEl = document.querySelector('#result');
let active = endpoints[0];
let lastResult = null;

const humanize = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

function setStatus(message, type = '') {
  statusEl.className = `status ${type}`.trim();
  statusEl.textContent = message;
}

function renderTabs() {
  tabs.innerHTML = '';
  endpoints.forEach((endpoint) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tab ${endpoint.id === active.id ? 'active' : ''}`;
    button.textContent = endpoint.label;
    button.onclick = () => {
      active = endpoint;
      renderTabs();
      renderForm();
      setStatus(`Ready: ${endpoint.label}`);
    };
    tabs.appendChild(button);
  });
}

function renderForm() {
  form.innerHTML = '';
  active.fields.forEach((field) => {
    const group = document.createElement('div');
    group.className = 'field-group';

    const label = document.createElement('label');
    label.setAttribute('for', field.name);
    label.textContent = `${field.label}${field.required ? ' *' : ''}`;

    const input = document.createElement('input');
    input.id = field.name;
    input.name = field.name;
    input.placeholder = field.placeholder || '';
    input.required = Boolean(field.required);

    group.append(label, input);
    form.appendChild(group);
  });
}

function getPayload() {
  const params = {};
  for (const field of active.fields) {
    const value = form.elements[field.name].value.trim();
    if (field.required && !value) throw new Error(`${field.label} is required.`);
    if (value) params[field.name] = value;
  }
  return { endpoint: active.path, method: active.method, params };
}

function makeKvBlock(title, obj) {
  const block = document.createElement('div');
  block.className = 'result-block';
  const h = document.createElement('h3');
  h.className = 'result-title';
  h.textContent = title;
  block.appendChild(h);

  const kv = document.createElement('div');
  kv.className = 'kv';
  Object.entries(obj).forEach(([k, v]) => {
    if (v && typeof v === 'object') return;
    const key = document.createElement('div');
    key.className = 'k';
    key.textContent = humanize(k);
    const val = document.createElement('div');
    val.className = 'v';
    val.textContent = v === null || v === undefined || v === '' ? '—' : String(v);
    kv.append(key, val);
  });

  if (!kv.children.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No simple fields available.';
    block.appendChild(empty);
  } else {
    block.appendChild(kv);
  }
  return block;
}

function makeTable(title, list) {
  if (!Array.isArray(list) || !list.length) return null;
  const keys = [...new Set(list.flatMap((item) => Object.keys(item || {})).slice(0, 8))];

  const block = document.createElement('div');
  block.className = 'result-block';
  const h = document.createElement('h3');
  h.className = 'result-title';
  h.textContent = title;
  block.appendChild(h);

  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  keys.forEach((k) => {
    const th = document.createElement('th');
    th.textContent = humanize(k);
    trh.appendChild(th);
  });
  thead.appendChild(trh);

  const tbody = document.createElement('tbody');
  list.slice(0, 50).forEach((item) => {
    const tr = document.createElement('tr');
    keys.forEach((k) => {
      const td = document.createElement('td');
      const value = item?.[k];
      td.textContent = typeof value === 'object' ? JSON.stringify(value) : (value ?? '—');
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  wrap.appendChild(table);
  block.appendChild(wrap);
  return block;
}

function renderResult(data) {
  resultEl.innerHTML = '';
  if (!data || typeof data !== 'object') {
    resultEl.className = 'result-empty';
    resultEl.textContent = 'No result.';
    return;
  }

  resultEl.className = '';
  const payload = data.data && typeof data.data === 'object' ? data.data : data;
  resultEl.appendChild(makeKvBlock('Summary', payload));

  Object.entries(payload).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      const table = makeTable(humanize(key), value);
      if (table) resultEl.appendChild(table);
    } else if (value && typeof value === 'object') {
      resultEl.appendChild(makeKvBlock(humanize(key), value));
    }
  });
}

async function runSearch() {
  try {
    setStatus('Searching...');
    const res = await fetch('/api/hunter-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getPayload()),
    });
    const data = await res.json();
    lastResult = data;
    renderResult(data);
    if (!res.ok) return setStatus(data.error || `Request failed (${res.status})`, 'error');
    setStatus('Done.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

document.querySelector('#submitBtn').addEventListener('click', runSearch);
document.querySelector('#resetBtn').addEventListener('click', () => {
  form.reset();
  setStatus('Form cleared.');
});
document.querySelector('#copyBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2));
    setStatus('Copied.', 'success');
  } catch {
    setStatus('Could not copy.', 'error');
  }
});

renderTabs();
renderForm();
setStatus(`Ready: ${active.label}`);
