// 全局变量：所有模块共用
let units = []; // 单元数据
let lessons = []; // 题库题目数据
let currentUnitId = null; // 当前选中单元ID
let currentLessonId = null; // 当前学习/练习题目ID
let filteredLessons = []; // 筛选后的题目
let favLessons = []; // 收藏题目ID
let wrongLessons = []; // 错题ID
let learningProgress = {}; // 学习进度 {unitId: lastLessonId}
let isAdmin = false; // 是否管理员
let adminClickCount = 0; // 管理员解锁计数

// 播放相关变量
let audio = null; // 音频实例
let autoPlayTimer = null; // 自动播放定时器
let isLoopPlay = false; // 是否循环播放
let playSpeed = 1; // 播放速度（默认1倍速）