// ===================== 应用初始化 =====================
function init() {
  loadData(); // 加载本地存储数据
  renderUnitList(); // 渲染单元列表
  renderFavoriteList(); // 渲染收藏列表
  renderWrongList(); // 渲染错题本
  bindAdminUnlock(); // 绑定管理员解锁事件
}

// ===================== 页面切换 =====================
function switchPage(pageName) {
  // 隐藏所有页面+取消导航按钮激活状态
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  
  // 显示目标页面+激活导航按钮
  document.getElementById(`${pageName}Page`).classList.add('active');
  event.target.classList.add('active');

  // 页面切换后的初始化逻辑
  switch (pageName) {
    case 'unit':
      renderUnitList();
      break;
    case 'course':
      renderCurrentUnitHeader('currentUnitHeader');
      filterLessons('all'); // 默认显示所有类型题目
      break;
    case 'study':
      renderCurrentUnitHeader('studyUnitHeader');
      renderLessonDetail();
      break;
    case 'exercise':
      renderCurrentUnitHeader('exerciseUnitHeader');
      renderExercise();
      break;
    case 'admin':
      renderAdminUnitList();
      renderAdminLessonList();
      updateUnitSelect();
      break;
  }
}

// ===================== 管理员解锁 =====================
function bindAdminUnlock() {
  const titleEl = document.getElementById('title');
  titleEl.addEventListener('click', () => {
    adminClickCount++;
    // 点击5次解锁管理员
    if (adminClickCount >= 5) {
      const password = prompt('请输入管理员密码：');
      if (password === 'admin123') {
        isAdmin = true;
        localStorage.setItem('indonesian_admin', 'true'); // 保存管理员状态
        document.getElementById('adminNav').style.display = 'block';
        alert('管理员权限已解锁！');
        // 更新管理员页面内容
        renderAdminUnitList();
        renderAdminLessonList();
        updateUnitSelect();
      } else {
        alert('密码错误！');
      }
      adminClickCount = 0; // 重置计数
    }
  });
}

// ===================== 启动应用 =====================
window.onload = init;