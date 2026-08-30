export function GET() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? '';
  const publisherMatch = /^ca-(pub-\d+)$/.exec(clientId);
  const body = publisherMatch
    ? `google.com, ${publisherMatch[1]}, DIRECT, f08c47fec0942fa0\n`
    : '# La monetización de este sitio todavía no está configurada.\n';

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
