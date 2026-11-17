// 临时图片代理：加速拉取外部生成的图片资源（仅允许 lingxi.wps.cn 域名）
// 用途：将 AI 生成的角色立绘经 Cloudflare 网络中转，避免源站限速导致下载截断
// 注意：使用完毕后可删除此文件
export async function onRequestGet(context) {
    const { request, env } = context;
    const u = new URL(request.url);
    const target = u.searchParams.get('url');
    if (!target || !target.startsWith('https://lingxi.wps.cn/')) {
        return new Response(JSON.stringify({ error: 'invalid url' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const range = request.headers.get('range');
    const upstream = await fetch(target, {
        headers: range ? { Range: range } : {},
        cf: { cacheTtl: 300 }
    });
    const headers = new Headers();
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag']) {
        const v = upstream.headers.get(h);
        if (v) headers.set(h, v);
    }
    headers.set('access-control-allow-origin', '*');
    headers.set('cache-control', 'no-store');
    return new Response(upstream.body, { status: upstream.status, headers });
}
