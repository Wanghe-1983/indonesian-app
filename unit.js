// ===================== 单元列表渲染 =====================
// 渲染单元列表（学习页用）
function renderUnitList() {
  const unitListEl = document.getElementById('unitList');
  if (units.length === 0) {
    unitListEl.innerHTML = '<div class="empty-state">暂无学习单元</div>';
    return;
  }

  unitListEl.innerHTML = '';
  units.forEach(unit => {
    // 计算单元内题目数量和学习进度
    const unitLessons = lessons.filter(lesson => lesson.unitId === unit.id);
    const lessonCount = unitLessons.length;
    let progress = 0;

    if (lessonCount > 0 && learningProgress[unit.id]) {
      const lastLessonIndex = unitLessons.findIndex(l => l.id === learningProgress[unit.id]);
      progress = lastLessonIndex >= 0 ? Math.round(((lastLessonIndex + 1) / lessonCount) * 100) : 0;
    }

    // 创建单元卡片
    const unitCard = document.createElement('div');
    unitCard.className = 'unit-card';
    unitCard.innerHTML = `
      <h3>${unit.name}</h3>
      <div class="unit-info">${unit.desc}</div>
      <div class="unit-info">题目数量：${lessonCount} 道</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="unit-info">学习进度：${progress}%</div>
      ${lessonCount > 0 ? `<div class="continue-btn" onclick="continueStudyUnit(${unit.id})">继续学习</div>` : ''}
    `;

    // 点击单元卡片进入课程列表
    unitCard.addEventListener('click', (e) => {
      if (!e.target.classList.contains('continue-btn')) {
        currentUnitId = unit.id;
        switchPage('course');
      }
    });

    unitListEl.appendChild(unitCard);
  });
}

// 继续学习单元（从上次进度开始）
function continueStudyUnit(unitId) {
  currentUnitId = unitId;
  const unitLessons = lessons.filter(l => l.unitId === unitId);
  
  if (unitLessons.length === 0) {
    alert('该单元暂无题目！');
    switchPage('course');
    return;
  }

  // 确定目标题目（上次进度或第一课）
  let targetLessonId = learningProgress[unitId] || unitLessons[0].id;
  const lessonExists = unitLessons.some(l => l.id === targetLessonId);
  if (!lessonExists) targetLessonId = unitLessons[0].id;

  // 更新状态并跳转
  currentLessonId = targetLessonId;
  learningProgress[unitId] = targetLessonId;
  saveProgress();
  switchPage('study');
  renderLessonDetail();
  playCurrentVoice();
}

// 渲染当前单元头部（显示在课程/学习/练习页顶部）
function renderCurrentUnitHeader(headerId) {
  const headerEl = document.getElementById(headerId);
  if (!currentUnitId) {
    headerEl.innerHTML = '';
    return;
  }

  const unit = units.find(u => u.id === currentUnitId);
  if (!unit) {
    headerEl.innerHTML = '';
    return;
  }

  const lessonCount = lessons.filter(l => l.unitId === currentUnitId).length;
  headerEl.innerHTML = `
    <h3>${unit.name}</h3>
    <div class="unit-desc">${unit.desc} | 共 ${lessonCount} 道题目</div>
  `;
}

// ===================== 管理员单元操作 =====================
// 添加单元（手动添加）
function addUnit() {
  const unitName = document.getElementById('unitNameInput').value.trim();
  const unitDesc = document.getElementById('unitDescInput').value.trim() || '无描述';

  if (!unitName) {
    alert('请填写单元名称！');
    return;
  }

  // 生成新单元ID
  const newUnitId = units.length > 0 ? Math.max(...units.map(u => u.id)) + 1 : 1;
  units.push({
    id: newUnitId,
    name: unitName,
    desc: unitDesc,
    createTime: new Date().toISOString()
  });

  // 保存并更新界面
  saveUnits();
  clearUnitForm();
  renderUnitList();
  renderAdminUnitList();
  updateUnitSelect();
  alert('单元添加成功！');
}

// 清空单元表单
function clearUnitForm() {
  document.getElementById('unitNameInput').value = '';
  document.getElementById('unitDescInput').value = '';
}

// 编辑单元
function editUnit(unitId) {
  const unit = units.find(u => u.id === unitId);
  if (!unit) return;

  // 填充表单
  document.getElementById('unitNameInput').value = unit.name;
  document.getElementById('unitDescInput').value = unit.desc;

  // 替换按钮为保存/取消
  const formActionsEl = document.querySelector('.admin-card:nth-child(1) .form-actions');
  formActionsEl.innerHTML = `
    <button class="btn btn-primary" onclick="saveUnitEdit(${unitId})">保存修改</button>
    <button class="btn btn-secondary" onclick="cancelUnitEdit()">取消</button>
  `;
}

// 保存单元编辑
function saveUnitEdit(unitId) {
  const unitName = document.getElementById('unitNameInput').value.trim();
  const unitDesc = document.getElementById('unitDescInput').value.trim() || '无描述';

  if (!unitName) {
    alert('请填写单元名称！');
    return;
  }

  const unitIndex = units.findIndex(u => u.id === unitId);
  if (unitIndex > -1) {
    units[unitIndex] = {
      ...units[unitIndex],
      name: unitName,
      desc: unitDesc
    };

    // 保存并更新界面
    saveUnits();
    clearUnitForm();
    cancelUnitEdit();
    renderUnitList();
    renderAdminUnitList();
    updateUnitSelect();
    alert('单元修改成功！');
  }
}

// 取消单元编辑
function cancelUnitEdit() {
  clearUnitForm();
  const formActionsEl = document.querySelector('.admin-card:nth-child(1) .form-actions');
  formActionsEl.innerHTML = `
    <button class="btn btn-primary" onclick="addUnit()">添加单元</button>
    <button class="btn btn-secondary" onclick="clearUnitForm()">清空</button>
  `;
}

// 删除单元
function deleteUnit(unitId) {
  const unitLessons = lessons.filter(l => l.unitId === unitId);
  // 有题目时提示确认
  if (unitLessons.length > 0 && !confirm(`该单元包含 ${unitLessons.length} 道题目，删除单元会同时删除这些题目！确定要删除吗？`)) {
    return;
  }

  // 删除单元关联数据
  lessons = lessons.filter(l => l.unitId !== unitId); // 删除单元内题目
  favLessons = favLessons.filter(id => !unitLessons.some(l => l.id === id)); // 移除收藏
  wrongLessons = wrongLessons.filter(id => !unitLessons.some(l => l.id === id)); // 移除错题
  delete learningProgress[unitId]; // 删除进度

  // 删除单元本身
  units = units.filter(u => u.id !== unitId);

  // 重置当前状态（如果删除的是当前单元）
  if (currentUnitId === unitId) {
    currentUnitId = null;
    currentLessonId = null;
  }

  // 保存并更新界面
  saveUnits();
  saveLessons();
  saveFavorites();
  saveWrongs();
  saveProgress();
  renderUnitList();
  renderAdminUnitList();
  renderFavoriteList();
  renderWrongList();
  updateUnitSelect();
  alert('单元删除成功！');
}

// 渲染管理员单元列表
function renderAdminUnitList() {
  if (!isAdmin) return;

  const adminUnitListEl = document.getElementById('adminUnitList');
  if (units.length === 0) {
    adminUnitListEl.innerHTML = '<div class="empty-state">暂无单元数据</div>';
    return;
  }

  adminUnitListEl.innerHTML = '';
  units.forEach(unit => {
    const lessonCount = lessons.filter(l => l.unitId === unit.id).length;
    const unitCard = document.createElement('div');
    unitCard.className = 'unit-card';
    unitCard.innerHTML = `
      <h3>${unit.name}</h3>
      <div class="unit-info">${unit.desc}</div>
      <div class="unit-info">包含题目：${lessonCount} 道</div>
      <div class="form-actions" style="margin-top: 10px;">
        <button class="btn btn-primary" onclick="editUnit(${unit.id})">编辑</button>
        <button class="btn btn-danger" onclick="deleteUnit(${unit.id})">删除</button>
      </div>
    `;
    adminUnitListEl.appendChild(unitCard);
  });
}

// 更新单元选择下拉框（添加/编辑题目时用）
function updateUnitSelect() {
  const unitSelectEl = document.getElementById('unitSelect');
  unitSelectEl.innerHTML = '';

  if (units.length === 0) {
    unitSelectEl.innerHTML = '<option value="">暂无可用单元</option>';
    return;
  }

  units.forEach(unit => {
    const option = document.createElement('option');
    option.value = unit.id;
    option.textContent = unit.name;
    unitSelectEl.appendChild(option);
  });
}