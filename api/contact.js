export default async function handler(req, res) {
if (req.method !== 'POST') {
res.setHeader('Allow', 'POST');
return res.status(405).json({ error: 'Method not allowed' });
}

try {
const body = req.body || {};
const { ime, podjetje, eposta, telefon, relacija, tovor, sporocilo, gotcha, soglasje } = body;

// Honeypot: silently accept spam bot submissions without sending mail.
if (gotcha) return res.status(200).json({ ok: true });

if (!ime || !eposta || !sporocilo) {
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
podjetje ? `Podjetje: ${podjetje}` : null,
`E-pošta: ${eposta}`,
telefon ? `Telefon: ${telefon}` : null,
relacija ? `Relacija: ${relacija}` : null,
tovor ? `Vrsta tovora: ${tovor}` : null,
'',
sporocilo,
'',
'Soglasje z obdelavo osebnih podatkov: DA'
].filter(Boolean).join('\n');

const resendRes = await fetch('https://api.resend.com/emails', {
method: 'POST',
headers: {
'Authorization': `Bearer ${apiKey}`,
'Content-Type': 'application/json'
},
body: JSON.stringify({
from: 'Šauperl spletna stran <onboarding@resend.dev>',
to: ['sautrans@gmail.com'],
reply_to: eposta,
subject: `Povpraševanje s spletne strani – ${ime}`,
text: lines
})
});

if (!resendRes.ok) {
const errText = await resendRes.text();
console.error('Resend error:', errText);
return res.status(502).json({ error: 'Failed to send email' });
}

return res.status(200).json({ ok: true });
} catch (err) {
console.error('Contact handler error:', err);
return res.status(500).json({ error: 'Internal error' });
}
}
