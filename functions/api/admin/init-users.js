import { onRequest, getAllUsers, createUser } from "../../_shared/utils.js";

export const onRequest = async (context) => {
    const { env } = context;

    // 检查是否已有用户
    const users = await getAllUsers(env);

    if (users.length === 0) {
        // 首次访问：初始化默认超级管理员
        await createUser({
            username: 'admin',
            password: 'admin123',
            name: '系统管理员',
            role: 'admin',
            userType: 'employee',
            companyCode: 'SYS',
            empNo: '000000',
            verified: true,
        }, env);

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
