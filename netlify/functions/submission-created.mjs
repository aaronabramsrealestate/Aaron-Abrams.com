/**
 * Website lead -> Follow Up Boss
 *
 * Netlify runs this automatically every time someone submits a form on the
 * site (the file name "submission-created" is what tells Netlify to do that).
 * It sends the lead to Follow Up Boss as an event, which creates the contact
 * (or updates an existing one, matched by email or phone) and can kick off
 * your action plans and automations.
 *
 * Setup: in Netlify, add an environment variable named FUB_API_KEY with your
 * Follow Up Boss API key (Follow Up Boss > Admin > API). Optional:
 * FUB_X_SYSTEM_KEY if you register the integration with Follow Up Boss.
 */

const FUB_URL = 'https://api.followupboss.com/v1/events';
const SOURCE = 'aaronabrams.com';
const SYSTEM = 'AaronAbrams-Website';

function clean(v) {
  return typeof v === 'string' ? v.trim().slice(0, 2000) : '';
}

export function buildEvent(payload) {
  const d = payload.data || {};
  const form = payload.form_name || d['form-name'] || 'contact';
  const isHomeValue = form === 'home-value';

  const name = clean(d.name);
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || '';
  const lastName = parts.join(' ');

  const interest = clean(d.interest) || (isHomeValue ? 'Home value review' : 'Website inquiry');
  const isSeller = isHomeValue || /sell|valuation|value review/i.test(interest);
  const page = clean(d.page) || (isHomeValue ? 'Home Value' : 'Website');

  const details = [
    `Form: ${isHomeValue ? 'Home Value Review' : 'Contact'}`,
    `Interested in: ${interest}`,
    `Page: ${page}`,
  ];
  if (isHomeValue) {
    if (d.address) details.push(`Property: ${clean(d.address)}`);
    if (d.beds || d.baths) details.push(`Beds/Baths: ${clean(d.beds) || '?'} bd, ${clean(d.baths) || '?'} ba`);
    if (d.timeline) details.push(`Selling timeline: ${clean(d.timeline)}`);
  }

  const tags = ['Website Lead', isHomeValue ? 'Home Value Request' : 'Website Contact'];
  if (page && !['Website', 'Home Value'].includes(page)) tags.push(`Web: ${page}`);

  const event = {
    source: SOURCE,
    system: SYSTEM,
    type: isSeller ? 'Seller Inquiry' : 'General Inquiry',
    message: clean(d.message) || (isHomeValue ? `Requested a home value review for ${clean(d.address)}` : interest),
    description: details.join('\n'),
    person: {
      firstName,
      lastName,
      emails: d.email ? [{ value: clean(d.email) }] : [],
      phones: d.phone ? [{ value: clean(d.phone) }] : [],
      tags,
    },
  };
  if (isHomeValue && d.address) event.property = { street: clean(d.address) };
  return event;
}

export default async (req) => {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response('Bad payload', { status: 400 });
  }
  const payload = body.payload || {};
  const d = payload.data || {};

  if (d['bot-field']) return new Response('Ignored spam');
  if (!d.email && !d.phone) return new Response('No contact info, skipped');

  const key = process.env.FUB_API_KEY;
  if (!key) {
    console.log('FUB_API_KEY is not set, lead was saved in Netlify Forms only.');
    return new Response('FUB not configured');
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64'),
    'X-System': SYSTEM,
  };
  if (process.env.FUB_X_SYSTEM_KEY) headers['X-System-Key'] = process.env.FUB_X_SYSTEM_KEY;

  const event = buildEvent(payload);
  try {
    const res = await fetch(FUB_URL, { method: 'POST', headers, body: JSON.stringify(event) });
    const text = await res.text();
    if (!res.ok) {
      console.error(`Follow Up Boss error ${res.status}: ${text.slice(0, 500)}`);
      return new Response('FUB error', { status: 502 });
    }
    console.log(`Lead sent to Follow Up Boss (${res.status}), form: ${payload.form_name || "contact"}`);
    return new Response('OK');
  } catch (err) {
    console.error('Could not reach Follow Up Boss:', err && err.message);
    return new Response('FUB unreachable', { status: 502 });
  }
};
