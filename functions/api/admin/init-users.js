export const onRequest = async (context) => {
    const { env } = context;

    // 使用与 createUser/getAllUsers 相同的存储方式
    const data = await env.INDO_LEARN_KV.get('all_users');
    const users = data ? JSON.parse(data) : [];

    if (users.length === 0) {
        const adminUser = {
            username: 'admin',
            password: 'admin123',
            name: '系统管理员',
            role: 'admin',
            userType: 'employee',
            companyCode: 'SYS',
            empNo: '000000',
            createdAt: new Date().toISOString(),
        };
        users.push(adminUser);
        await env.INDO_LEARN_KV.put('all_users', JSON.stringify(users));

        return new Response(JSON.stringify({
            success: true,
            message: '已初始化默认管理员: admin / admin123',
            userCount: 1
        }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
        success: true,
        message: '已有用户，跳过初始化',
        userCount: users.length
    }), { headers: { 'Content-Type': 'application/json' } });
};
