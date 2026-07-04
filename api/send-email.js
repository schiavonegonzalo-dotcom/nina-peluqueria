export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://ninapeluqueria.com.ar');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Método no permitido' });

  const {
    cliente_nombre, cliente_email, cliente_wa,
    servicio_name, servicio_dur,
    turno_fecha, turno_hora, nota,
    enviar_cliente,
  } = req.body;

  const BREVO_API_KEY  = process.env.BREVO_API_KEY;
  const SENDER_EMAIL   = process.env.BREVO_SENDER_EMAIL;
  const SALON_EMAIL    = 'ninapeluqueria.mza@gmail.com';

  if (!BREVO_API_KEY || !SENDER_EMAIL) {
    return res.status(500).json({ error: 'Configuración de servidor incompleta' });
  }

  const baseStyle = `font-family:Arial,sans-serif;max-width:520px;margin:0 auto;
    background:#1a1a1a;color:#f0e6d3;padding:32px;border-radius:12px;`;
  const gold = '#c9a96e';

  const salonHtml = `
    <div style="${baseStyle}">
      <h2 style="color:${gold};margin-top:0;">✂️ Nuevo turno reservado</h2>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:7px 0;color:#aaa;width:110px;">Cliente</td>
            <td style="padding:7px 0;font-weight:bold;">${cliente_nombre}</td></tr>
        <tr><td style="padding:7px 0;color:#aaa;">Email</td>
            <td style="padding:7px 0;">${cliente_email}</td></tr>
        <tr><td style="padding:7px 0;color:#aaa;">WhatsApp</td>
            <td style="padding:7px 0;">${cliente_wa || '—'}</td></tr>
        <tr><td style="padding:7px 0;color:#aaa;">Servicio</td>
            <td style="padding:7px 0;font-weight:bold;color:${gold};">${servicio_name}</td></tr>
        <tr><td style="padding:7px 0;color:#aaa;">Duración</td>
            <td style="padding:7px 0;">${servicio_dur}</td></tr>
        <tr><td style="padding:7px 0;color:#aaa;">Fecha</td>
            <td style="padding:7px 0;">${turno_fecha}</td></tr>
        <tr><td style="padding:7px 0;color:#aaa;">Hora</td>
            <td style="padding:7px 0;">${turno_hora}</td></tr>
        <tr><td style="padding:7px 0;color:#aaa;">Nota</td>
            <td style="padding:7px 0;">${nota || '—'}</td></tr>
      </table>
    </div>`;

  const clienteHtml = `
    <div style="${baseStyle}">
      <h2 style="color:${gold};margin-top:0;">✅ Tu turno está confirmado</h2>
      <p style="margin-top:0;">Hola <strong>${cliente_nombre}</strong>, tu reserva fue registrada con éxito.</p>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:7px 0;color:#aaa;width:110px;">Servicio</td>
            <td style="padding:7px 0;font-weight:bold;color:${gold};">${servicio_name}</td></tr>
        <tr><td style="padding:7px 0;color:#aaa;">Duración</td>
            <td style="padding:7px 0;">${servicio_dur}</td></tr>
        <tr><td style="padding:7px 0;color:#aaa;">Fecha</td>
            <td style="padding:7px 0;">${turno_fecha}</td></tr>
        <tr><td style="padding:7px 0;color:#aaa;">Hora</td>
            <td style="padding:7px 0;">${turno_hora}</td></tr>
      </table>
      <p style="margin-top:24px;color:#aaa;font-size:13px;">
        Si necesitás cancelar o reprogramar, contactanos por WhatsApp.<br>
        ¡Te esperamos en Nina Peluquería! 💇‍♀️
      </p>
    </div>`;

  try {
    await sendBrevo({
      apiKey: BREVO_API_KEY,
      senderEmail: SENDER_EMAIL,
      to: [{ email: SALON_EMAIL, name: 'Nina Peluquería' }],
      subject: `Nuevo turno: ${cliente_nombre} — ${servicio_name} (${turno_fecha} ${turno_hora})`,
      html: salonHtml,
    });

    if (enviar_cliente && cliente_email && cliente_email !== 'No proporcionado') {
      await sendBrevo({
        apiKey: BREVO_API_KEY,
        senderEmail: SENDER_EMAIL,
        to: [{ email: cliente_email, name: cliente_nombre }],
        subject: `Confirmación de turno — Nina Peluquería`,
        html: clienteHtml,
      });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error Brevo:', err.message);
    res.status(500).json({ error: 'Error al enviar el email' });
  }
}

async function sendBrevo({ apiKey, senderEmail, to, subject, html }) {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Nina Peluquería', email: senderEmail },
      to,
      subject,
      htmlContent: html,
    }),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(JSON.stringify(err));
  }
}
