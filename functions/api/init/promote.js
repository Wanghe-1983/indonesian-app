import { getAllUsers, saveAllUsers, json } from "../../_shared/utils.js";

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

    if (request.method === 'POST') {
        const { username, role } = await request.json();
        const users = await getAllUsers(env);
        const idx = users.findIndex(u => u.username === username);
        if (idx === -1) return json({ error: '用户不存在' }, 404);
        users[idx].role = role || 'admin';
        await saveAllUsers(users, env);
        return json({ success: true, user: { username: users[idx].username, role: users[idx].role } });
    }
    return json({ error: 'method not allowed' }, 405);
}
