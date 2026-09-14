export default async function handler(req, res) {
if (req.method !== 'POST') {
res.setHeader('Allow', 'POST');
return res.status(405).json({ error: 'Method not allowed' });
}

try {
const body = req.body || {};
const { ime, telefon, eposta, izkusnje, gotcha, soglasje, cvFilename, cvBase64 } = body;

// Honeypot: silently accept spam bot submissions without sending mail.
if (gotcha) return res.status(200).json({ ok: true });

if (!ime || !telefon || !eposta) {
return res.status(400).json({ error: 'Missing required fields' });
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)) {
return res.status(400).json({ error: 'Invalid email' });
}
if (!soglasje) {
return res.status(400).json({ error: 'Consent required' });
}

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
console.error('RESEND_API_KEY is not configured');
return res.status(500).json({ error: 'Email service not configured' });
}

const lines = [
`Ime: ${ime}`,
`Telefon: ${telefon}`,
`E-pošta: ${eposta}`,
izkusnje ? `Izkušnje: ${izkusnje}` : null,
cvFilename ? `Priložen CV: ${cvFilename}` : null,
'',
'Soglasje z obdelavo osebnih podatkov: DA'
].filter(Boolean).join('\n');

const payload = {
from: 'Šauperl spletna stran <info@sauperl.com>',
to: ['sautrans@gmail.com'],
reply_to: eposta,
subject: `Prijava za zaposlitev – ${ime}`,
text: lines
};

if (cvFilename && cvBase64) {
payload.attachments = [{ filename: cvFilename, content: cvBase64 }];
}

const resendRes = await fetch('https://api.resend.com/emails', {
method: 'POST',
headers: {
'Authorization': `Bearer ${apiKey}`,
'Content-Type': 'application/json'
},
body: JSON.stringify(payload)
});

if (!resendRes.ok) {
const errText = await resendRes.text();
console.error('Resend error:', errText);
return res.status(502).json({ error: 'Failed to send email' });
}

return res.status(200).json({ ok: true });
} catch (err) {
console.error('Career handler error:', err);
return res.status(500).json({ error: 'Internal error' });
}
}
