export async function onRequest(context) {
  const { env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const domain   = env.EGNYTE_DOMAIN;
  const token    = env.EGNYTE_TOKEN;
  const filePath = env.EGNYTE_FILE_PATH;

  if (!domain || !token || !filePath) {
    return new Response(JSON.stringify({
      error: 'Missing environment variables',
      debug: {
        EGNYTE_DOMAIN:    domain   ? domain.slice(0, 8) + '...'          : 'MISSING',
        EGNYTE_TOKEN:     token    ? 'SET (' + token.length + ' chars)'  : 'MISSING',
        EGNYTE_FILE_PATH: filePath ? filePath.slice(0, 20) + '...'       : 'MISSING',
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = `https://${domain}/pubapi/v1/fs-content${filePath}`;

    const fileRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!fileRes.ok) {
      if (fileRes.status === 401) {
        return new Response(JSON.stringify({
          error:   'token_expired',
          message: 'Your Egnyte access token has expired. Visit /api/refresh to get a new token, then update EGNYTE_TOKEN in Cloudflare and redeploy.'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const text = await fileRes.text();
      return new Response(JSON.stringify({
        error: `Egnyte error (${fileRes.status}): ${text}`
      }), {
        status: fileRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const buffer = await fileRes.arrayBuffer();
    const bytes  = new Uint8Array(buffer);
    let binary   = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);

    return new Response(JSON.stringify({ file: base64 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
