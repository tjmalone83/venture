export async function onRequest(context) {
  const { env } = context;

  const domain       = env.EGNYTE_DOMAIN;
  const clientId     = env.EGNYTE_CLIENT_ID;
  const clientSecret = env.EGNYTE_CLIENT_SECRET;
  const username     = env.EGNYTE_USERNAME;
  const password     = env.EGNYTE_PASS;

  const debug = {
    EGNYTE_DOMAIN:        domain        ? domain.slice(0,8)+'...'        : 'MISSING',
    EGNYTE_CLIENT_ID:     clientId      ? clientId.slice(0,6)+'...'      : 'MISSING',
    EGNYTE_CLIENT_SECRET: clientSecret  ? clientSecret.slice(0,4)+'...'  : 'MISSING',
    EGNYTE_USERNAME:      username      ? username.slice(0,4)+'...'      : 'MISSING',
    EGNYTE_PASS:          password      ? 'SET ('+password.length+' chars)'  : 'MISSING',
  };

  if (!domain || !clientId || !clientSecret || !username || !password) {
    return new Response(JSON.stringify({ error: 'Missing credentials', debug }),
      { status: 500, headers: { 'Content-Type': 'application/json' }});
  }

  try {
    const body = new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      username,
      password,
      grant_type:    'password',
    });

    const r = await fetch(`https://${domain}/puboauth/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    const json = await r.json();

    if (!r.ok) {
      return new Response(JSON.stringify({ error: 'Egnyte token request failed', detail: json, debug }),
        { status: r.status, headers: { 'Content-Type': 'application/json' }});
    }

    return new Response(JSON.stringify({
      access_token: json.access_token,
      expires_in:   json.expires_in,
      message:      'Success — copy access_token and update EGNYTE_TOKEN in Cloudflare Pages, then redeploy.'
    }), { status: 200, headers: { 'Content-Type': 'application/json' }});

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, debug }),
      { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
}
