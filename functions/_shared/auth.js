/**
 * 印尼语学习助手 - 认证工具
 * requireAuth/requireAdmin 通过 throw 返回错误，调用方无需判断
 */

// ========== 密码哈希（PBKDF2-SHA256） ==========

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial, 256
    );
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return saltHex + ':' + hashHex;
}

async function verifyPassword(password, stored) {
    if (!stored || !stored.includes(':')) return false;
    const [saltHex, hashHex] = stored.split(':');
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial, 256
    );
    const computedHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return computedHex === hashHex;
}

// ========== Token 工具 ==========

function hashStr(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

function generateToken(username) {
    const raw = `${username}|${Date.now()}|${hashStr(username + Date.now())}`;
    return Buffer.from(raw).toString('base64url');
}

function parseToken(token) {
    try {
        const raw = Buffer.from(token, 'base64url').toString('utf-8');
        const [username, timestamp, sig] = raw.split('|');
        return { username, timestamp: parseInt(timestamp), sig };
    } catch {
        return null;
    }
}

// ========== 认证中间件（throw 模式） ==========

async function verifyToken(context) {
    const { request, env } = context;
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return null;

    const username = await env.INDO_LEARN_KV.get('token_' + token);
    if (!username) return null;

    return parseToken(token) ? { username, token } : null;
}

class AuthError extends Error {
    constructor(message, status = 401) {
        super(message);
        this.status = status;
    }
}

async function requireAuth(context) {
    const auth = await verifyToken(context);
    if (!auth) throw new AuthError('未登录或登录已过期', 401);
    context.username = auth.username;
    return context;
}

async function requireAdmin(context) {
    const auth = await verifyToken(context);
    if (!auth) throw new AuthError('未登录或登录已过期', 401);
    const user = await context.env.INDO_LEARN_DB
        .prepare('SELECT role FROM users WHERE username = ?')
        .bind(auth.username)
        .first();
    if (!user || user.role !== 'admin') throw new AuthError('需要管理员权限', 403);
    context.username = auth.username;
    return context;
}

export { hashPassword, verifyPassword, hashStr, generateToken, parseToken, verifyToken, requireAuth, requireAdmin, AuthError };