// 临时图片代理：加速拉取外部生成的图片资源（仅允许 lingxi.wps.cn 域名）
export async function onRequestGet(context) {
    const { request } = context;
    const u = new URL(request.url);
    const target = u.searchParams.get('url');
    if (!target || !target.startsWith('https://lingxi.wps.cn/')) {
        return new Response(JSON.stringify({ error: 'invalid url' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const upstream = await fetch(target, { cf: { cacheTtl: 300 } });
    const headers = new Headers();
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag']) {
        const v = upstream.headers.get(h);
        if (v) headers.set(h, v);
    }
    headers.set('access-control-allow-origin', '*');
    headers.set('cache-control', 'no-store');
    return new Response(upstream.body, { status: upstream.status, headers });
}
