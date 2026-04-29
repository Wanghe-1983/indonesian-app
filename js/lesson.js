// ===================== 题库导入（适配无单元名） =====================
// 批量导入题库（支持3字段无单元名/4字段有单元名）
function importLessons() {
  const fileInputEl = document.getElementById('fileInput');
  if (!fileInputEl.files.length) {
    alert('请选择要导入的题库文件！');
    return;
  }

  const file = fileInputEl.files[0];
  // 校验文件格式（仅CSV）
  if (!file.name.endsWith('.csv') && !['text/csv', 'application/vnd.ms-excel'].includes(file.type)) {
    alert('仅支持导入 CSV 格式的题库文件！');
    return;
  }

  // 选择导入模式（无单元名时关键步骤）
  const importMode = prompt(
    '检测到题库可能无单元名，请选择导入模式：\n' +
    '1. 自动分组（按题型创建单元，如“单元-生词”“单元-短句”）\n' +
    '2. 手动指定（所有题目归入一个单元，需输入单元名）\n' +
    '请输入 1 或 2',
    '1' // 默认自动分组
  );

  if (!['1', '2'].includes(importMode)) {
    alert('输入错误，请重新选择 1 或 2！');
    return;
  }

  // 模式2：手动指定单元名
  let customUnitName = '';
  if (importMode === '2') {
    customUnitName = prompt('请输入统一单元名（如“印尼语考试复习题库”）：', '印尼语题库');
    if (!customUnitName.trim()) {
      alert('单元名不能为空！');
      return;
    }
  }

  // 读取文件并解析
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const content = e.target.result;
      // 处理行数据：过滤空行+标题行
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line !== '' && !line.toLowerCase().includes('印尼语,中文,类型'));

      let importedCount = 0; // 成功数量
      let failCount = 0;     // 失败数量
      let failReasons = [];  // 失败原因

      lines.forEach((line, lineIndex) => {
        try {
          const parts = parseCsvLine(line); // 解析CSV（支持含逗号字段）
          
          // 适配3/4字段：提取核心数据
          let indonesian, chinese, type, unitNameFromFile;
          if (parts.length === 3) {
            // 3字段：印尼语,中文,类型（无单元名）
            [indonesian, chinese, type] = parts.map(p => p.trim());
            unitNameFromFile = '';
          } else if (parts.length === 4) {
            // 4字段：印尼语,中文,类型,单元名（有/无单元名均可）
            [indonesian, chinese, type, unitNameFromFile] = parts.map(p => p.trim());
          } else {
            throw new Error(`字段数量错误（需3或4个，实际${parts.length}个）`);
          }

          // 基础校验
          if (!indonesian) throw new Error('印尼语内容不能为空');
          if (!chinese) throw new Error('中文翻译不能为空');
          if (!type) throw new Error('题目类型不能为空');

          // 确定最终单元名
          let finalUnitName;
          if (unitNameFromFile) {
            // 有单元名：用题库中的单元名
            finalUnitName = unitNameFromFile;
          } else {
            // 无单元名：按模式处理
            finalUnitName = importMode === '1' ? `单元-${type}` : customUnitName;
          }

          // 类型兼容：未知类型默认归为“短句”
          const validTypes = ['生词', '短句', '对话', '问句', '表达', '真题', '模拟题'];
          let finalType = validTypes.includes(type) ? type : '短句';
          if (finalType !== type) {
            failReasons.push(`第${lineIndex+1}行：类型“${type}”不支持，已默认归类为“短句”`);
          }

          // 查找/创建单元
          let unit = units.find(u => u.name === finalUnitName);
          if (!unit) {
            const newUnitId = units.length > 0 ? Math.max(...units.map(u => u.id)) + 1 : 1;
            unit = {
              id: newUnitId,
              name: finalUnitName,
              desc: `自动创建：${finalUnitName}（题库导入）`,
              createTime: new Date().toISOString()
            };
            units.push(unit);
            saveUnits();
            failReasons.push(`第${lineIndex+1}行：单元“${finalUnitName}”不存在，已自动创建`);
          }

          // 去重校验：避免重复导入
          const isDuplicate = lessons.some(l => 
            l.indonesian.trim() === indonesian.trim() && l.unitId === unit.id
          );
          if (isDuplicate) throw new Error('题目已存在，跳过导入');

          // 添加题目
          const newLessonId = lessons.length > 0 ? Math.max(...lessons.map(l => l.id)) + 1 : 1;
          lessons.push({
            id: newLessonId,
            indonesian: indonesian.trim(),
            chinese: chinese.trim(),
            type: finalType,
            unitId: unit.id
          });
          importedCount++;

        } catch (err) {
          failCount++;
          failReasons.push(`第${lineIndex+1}行：${err.message}`);
        }
      });

      // 更新单元描述（显示题目数量）
      units.forEach(unit => {
        const lessonCount = lessons.filter(l => l.unitId === unit.id).length;
        unit.desc = `自动创建：${unit.name}（共 ${lessonCount} 道题目）`;
      });
      saveUnits();

      // 保存并更新界面
      if (importedCount > 0) {
        saveLessons();
        renderUnitList();
        renderAdminLessonList();
        updateUnitSelect();
      }

      // 显示导入结果
      let resultMsg = `导入完成！\n成功导入：${importedCount} 道题目\n导入失败：${failCount} 道题目\n`;
      if (failReasons.length > 0) {
        resultMsg += `\n失败详情：\n${failReasons.join('\n')}`;
      }
      alert(resultMsg);

    } catch (globalErr) {
      alert(`文件解析失败：${globalErr.message}，请检查文件格式！`);
    }
  };

  // 强制UTF-8编码，避免中文乱码
  reader.readAsText(file, 'UTF-8');
}

// 辅助函数：解析CSV行（支持双引号包裹的含逗号字段）
function parseCsvLine(line) {
  const parts = [];
  let inQuotes = false;
  let currentPart = '';

  for (let char of line) {
    if (char === '"') {
      inQuotes = !inQuotes; // 切换引号状态
    } else if (char === ',' && !inQuotes) {
      parts.push(currentPart); // 逗号分隔字段（非引号内）
      currentPart = '';
    } else {
      currentPart += char; // 拼接字段内容
    }
  }
  parts.push(currentPart); // 添加最后一个字段
  return parts;
}

// ===================== 题目列表与筛选 =====================
// 筛选题目（按类型）
function filterLessons(filterType) {
  // 更新筛选按钮状态
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  // 筛选当前单元的题目
  let unitLessons = currentUnitId ? lessons.filter(l => l.unitId === currentUnitId) : lessons;
  filteredLessons = filterType === 'all' ? unitLessons : unitLessons.filter(l => l.type === filterType);
  
  renderLessonList(filteredLessons);
}

// 渲染题目列表
function renderLessonList(lessonList) {
  const lessonListEl = document.getElementById('lessonList');
  if (lessonList.length === 0) {
    lessonListEl.innerHTML = '<div class="empty-state">该分类暂无题目</div>';
    return;
  }

  lessonListEl.innerHTML = '';
  lessonList.forEach(lesson => {
    const lessonCard = document.createElement('div');
    lessonCard.className = 'lesson-card';
    lessonCard.innerHTML = `
      <span class="type-tag">${lesson.type}</span>
      <h3>${lesson.indonesian}</h3>
      <div class="content">${lesson.chinese}</div>
    `;

    // 点击题目进入学习页
    lessonCard.onclick = () => {
      currentLessonId = lesson.id;
      learningProgress[currentUnitId] = lesson.id; // 更新进度
      saveProgress();
      switchPage('study');
      renderLessonDetail();
    };

    lessonListEl.appendChild(lessonCard);
  });
}

// ===================== 学习页逻辑 =====================
// 渲染学习页题目详情
function renderLessonDetail() {
  const lessonDetailEl = document.getElementById('lessonDetail');
  const favBtnEl = document.getElementById('favBtn');

  if (!currentLessonId) {
    lessonDetailEl.innerHTML = '<div class="empty-state">请从单元/题目列表选择要学习的内容</div>';
    return;
  }

  const lesson = lessons.find(l => l.id === currentLessonId);
  if (!lesson) {
    lessonDetailEl.innerHTML = '<div class="empty-state">题目不存在</div>';
    return;
  }

  // 更新当前单元（题目所属单元）
  currentUnitId = lesson.unitId;
  renderCurrentUnitHeader('studyUnitHeader');

  // 更新收藏按钮状态
  const isFav = favLessons.includes(currentLessonId);
  favBtnEl.className = isFav ? 'fav-btn active' : 'fav-btn';
  favBtnEl.innerHTML = isFav ? `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
    已收藏
  ` : `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
    收藏
  `;

  // 渲染题目内容
  lessonDetailEl.innerHTML = `
    <h3>${lesson.type} · 学习</h3>
    <div class="indonesian-text">${lesson.indonesian}</div>
    <div class="chinese-text">${lesson.chinese}</div>
  `;
}

// 上一课/下一课（单元内切换）
function prevLesson() {
  if (!currentUnitId || !currentLessonId) {
    alert('请先选择学习单元和题目！');
    return;
  }

  const unitLessons = lessons.filter(l => l.unitId === currentUnitId);
  const currentIndex = unitLessons.findIndex(l => l.id === currentLessonId);

  if (currentIndex > 0) {
    stopAllPlay();
    currentLessonId = unitLessons[currentIndex - 1].id;
    learningProgress[currentUnitId] = currentLessonId; // 更新进度
    saveProgress();
    renderLessonDetail();
    playCurrentVoice();
  } else {
    stopAllPlay();
    alert('已经是本单元第一道题目了！');
  }
}

function nextLesson() {
  if (!currentUnitId || !currentLessonId) {
    alert('请先选择学习单元和题目！');
    return;
  }

  const unitLessons = lessons.filter(l => l.unitId === currentUnitId);
  const currentIndex = unitLessons.findIndex(l => l.id === currentLessonId);

  if (currentIndex < unitLessons.length - 1) {
    stopAllPlay();
    currentLessonId = unitLessons[currentIndex + 1].id;
    learningProgress[currentUnitId] = currentLessonId; // 更新进度
    saveProgress();
    renderLessonDetail();
    playCurrentVoice();
  } else {
    stopAllPlay();
    // 检查是否有下一个单元
    const currentUnitIndex = units.findIndex(u => u.id === currentUnitId);
    if (currentUnitIndex < units.length - 1) {
      if (confirm('已完成本单元所有题目！是否进入下一单元？')) {
        continueStudyUnit(units[currentUnitIndex + 1].id);
      }
    } else {
      alert('已经完成所有单元的题目！');
    }
  }
}

// ===================== 练习页逻辑 =====================
// 渲染练习页
function renderExercise() {
  const exerciseCardEl = document.getElementById('exerciseCard');
  if (!currentLessonId) {
    exerciseCardEl.innerHTML = '<div class="empty-state">请从单元/题目列表选择要练习的内容</div>';
    return;
  }

  const lesson = lessons.find(l => l.id === currentLessonId);
  if (!lesson) {
    exerciseCardEl.innerHTML = '<div class="empty-state">题目不存在</div>';
    return;
  }

  // 更新当前单元
  currentUnitId = lesson.unitId;
  renderCurrentUnitHeader('exerciseUnitHeader');

  // 渲染练习内容
  exerciseCardEl.innerHTML = `
    <h3>请输入对应的印尼语</h3>
    <div class="question">${lesson.chinese}</div>
    <input type="text" class="answer-input" id="answerInput" placeholder="请输入印尼语答案">
    <button class="submit-btn" onclick="checkAnswer()">提交答案</button>
    <div class="feedback" id="feedback"></div>
    <button class="play-btn" onclick="playCurrentVoice()" style="margin-top: 15px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
      播放正确发音
    </button>
  `;
}

// 检查练习答案
function checkAnswer() {
  const answerInputEl = document.getElementById('answerInput');
  const feedbackEl = document.getElementById('feedback');
  const lesson = lessons.find(l => l.id === currentLessonId);

  if (!lesson) return;

  // 宽松匹配：忽略大小写和前后空格
  const userAnswer = answerInputEl.value.trim().toLowerCase();
  const correctAnswer = lesson.indonesian.trim().toLowerCase();

  if (userAnswer === correctAnswer) {
    // 答案正确
    feedbackEl.className = 'feedback correct';
    feedbackEl.textContent = '回答正确！🎉';

    // 从错题本移除（如果存在）
    const wrongIndex = wrongLessons.indexOf(currentLessonId);
    if (wrongIndex > -1) {
      wrongLessons.splice(wrongIndex, 1);
      saveWrongs();
      renderWrongList();
    }

    // 自动跳转到下一题
    setTimeout(() => nextExercise(), 1500);
  } else {
    // 答案错误
    feedbackEl.className = 'feedback incorrect';
    feedbackEl.textContent = `回答错误 😞 正确答案：${lesson.indonesian}`;

    // 添加到错题本（如果不存在）
    if (!wrongLessons.includes(currentLessonId)) {
      wrongLessons.push(currentLessonId);
      saveWrongs();
      renderWrongList();
    }
  }
}

// 上一题/下一题（练习页）
function prevExercise() {
  if (!currentUnitId || !currentLessonId) {
    alert('请先选择学习单元和题目！');
    return;
  }

  const unitLessons = lessons.filter(l => l.unitId === currentUnitId);
  const currentIndex = unitLessons.findIndex(l => l.id === currentLessonId);

  if (currentIndex > 0) {
    currentLessonId = unitLessons[currentIndex - 1].id;
    renderExercise();
  } else {
    alert('已经是本单元第一道题目了！');
  }
}

function nextExercise() {
  if (!currentUnitId || !currentLessonId) {
    alert('请先选择学习单元和题目！');
    return;
  }

  const unitLessons = lessons.filter(l => l.unitId === currentUnitId);
  const currentIndex = unitLessons.findIndex(l => l.id === currentLessonId);

  if (currentIndex < unitLessons.length - 1) {
    currentLessonId = unitLessons[currentIndex + 1].id;
    renderExercise();
  } else {
    const currentUnitIndex = units.findIndex(u => u.id === currentUnitId);
    if (currentUnitIndex < units.length - 1) {
      if (confirm('已完成本单元所有练习！是否进入下一单元？')) {
        currentUnitId = units[currentUnitIndex + 1].id;
        const nextUnitLessons = lessons.filter(l => l.unitId === currentUnitId);
        if (nextUnitLessons.length > 0) {
          currentLessonId = nextUnitLessons[0].id;
          renderExercise();
        } else {
          alert('下一单元暂无练习内容！');
        }
      }
    } else {
      alert('已经完成所有单元的练习！');
    }
  }
}

// ===================== 收藏功能 =====================
// 切换收藏状态
function toggleFavorite() {
  if (!currentLessonId) return;

  const favIndex = favLessons.indexOf(currentLessonId);
  if (favIndex > -1) favLessons.splice(favIndex, 1); // 取消收藏
  else favLessons.push(currentLessonId); // 添加收藏

  // 保存并更新界面
  saveFavorites();
  renderLessonDetail();
  renderFavoriteList();
}

// 渲染收藏列表
function renderFavoriteList() {
  const favoriteListEl = document.getElementById('favoriteList');
  if (favLessons.length === 0) {
    favoriteListEl.innerHTML = '<div class="empty-state">暂无收藏题目</div>';
    return;
  }

  // 筛选收藏的题目数据
  const favLessonData = lessons.filter(l => favLessons.includes(l.id));
  favoriteListEl.innerHTML = '';

  favLessonData.forEach(lesson => {
    const unit = units.find(u => u.id === lesson.unitId);
    const lessonCard = document.createElement('div');
    lessonCard.className = 'lesson-card';
    lessonCard.innerHTML = `
      <span class="type-tag">${unit?.name || '未知单元'}</span>
      <span class="type-tag">${lesson.type}</span>
      <h3>${lesson.indonesian}</h3>
      <div class="content">${lesson.chinese}</div>
      <button class="btn btn-danger" style="margin-top: 10px;" onclick="removeFavorite(${lesson.id})">取消收藏</button>
    `;

    // 点击题目进入学习页（排除按钮点击）
    lessonCard.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        currentLessonId = lesson.id;
        currentUnitId = lesson.unitId;
        switchPage('study');
        renderLessonDetail();
      }
    });

    favoriteListEl.appendChild(lessonCard);
  });
}

// 移除收藏
function removeFavorite(lessonId) {
  const favIndex = favLessons.indexOf(lessonId);
  if (favIndex > -1) {
    favLessons.splice(favIndex, 1);
    saveFavorites();
    renderFavoriteList();
  }
}

// ===================== 错题本功能 =====================
// 渲染错题本列表
function renderWrongList() {
  const wrongListEl = document.getElementById('wrongList');
  if (wrongLessons.length === 0) {
    wrongListEl.innerHTML = '<div class="empty-state">暂无错题</div>';
    return;
  }

  // 筛选错题数据
  const wrongLessonData = lessons.filter(l => wrongLessons.includes(l.id));
  wrongListEl.innerHTML = '';

  wrongLessonData.forEach(lesson => {
    const unit = units.find(u => u.id === lesson.unitId);
    const lessonCard = document.createElement('div');
    lessonCard.className = 'lesson-card';
    lessonCard.innerHTML = `
      <span class="type-tag">${unit?.name || '未知单元'}</span>
      <span class="type-tag">${lesson.type}</span>
      <h3>${lesson.indonesian}</h3>
      <div class="content">${lesson.chinese}</div>
      <button class="btn btn-danger" style="margin-top: 10px;" onclick="removeWrong(${lesson.id})">删除错题</button>
    `;

    // 点击题目进入练习页（排除按钮点击）
    lessonCard.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        currentLessonId = lesson.id;
        currentUnitId = lesson.unitId;
        switchPage('exercise');
        renderExercise();
      }
    });

    wrongListEl.appendChild(lessonCard);
  });
}

// 移除错题
function removeWrong(lessonId) {
  const wrongIndex = wrongLessons.indexOf(lessonId);
  if (wrongIndex > -1) {
    wrongLessons.splice(wrongIndex, 1);
    saveWrongs();
    renderWrongList();
  }
}

// ===================== 管理员题目操作 =====================
// 添加单个题目
function addLesson() {
  const indonesian = document.getElementById('indonesianInput').value.trim();
  const chinese = document.getElementById('chineseInput').value.trim();
  const type = document.getElementById('typeSelect').value;
  const unitId = parseInt(document.getElementById('unitSelect').value);

  // 基础校验
  if (!indonesian || !chinese) {
    alert('请填写完整的印尼语内容和中文翻译！');
    return;
  }
  if (!unitId || !units.some(u => u.id === unitId)) {
    alert('请选择有效的所属单元！');
    return;
  }

  // 去重校验
  const isDuplicate = lessons.some(l => l.indonesian.trim() === indonesian && l.unitId === unitId);
  if (isDuplicate) {
    alert('该题目已存在于当前单元，无需重复添加！');
    return;
  }

  // 生成新题目ID
  const newLessonId = lessons.length > 0 ? Math.max(...lessons.map(l => l.id)) + 1 : 1;
  lessons.push({
    id: newLessonId,
    indonesian,
    chinese,
    type,
    unitId
  });

  // 保存并更新界面
  saveLessons();
  clearForm();
  renderUnitList();
  renderAdminLessonList();
  alert('题目添加成功！');
}

// 清空题目表单
function clearForm() {
  document.getElementById('indonesianInput').value = '';
  document.getElementById('chineseInput').value = '';
  document.getElementById('typeSelect').value = '短句'; // 默认类型
  if (units.length > 0) {
    document.getElementById('unitSelect').value = units[0].id; // 默认单元
  }
}

// 编辑题目
function editLesson(lessonId) {
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return;

  // 填充表单
  document.getElementById('indonesianInput').value = lesson.indonesian;
  document.getElementById('chineseInput').value = lesson.chinese;
  document.getElementById('typeSelect').value = lesson.type;
  document.getElementById('unitSelect').value = lesson.unitId;

  // 替换按钮为保存/取消
  const formActionsEl = document.querySelector('.admin-card:nth-child(2) .form-actions');
  formActionsEl.innerHTML = `
    <button class="btn btn-primary" onclick="saveEdit(${lessonId})">保存修改</button>
    <button class="btn btn-secondary" onclick="cancelEdit()">取消</button>
  `;
}

// 保存题目编辑
function saveEdit(lessonId) {
  const indonesian = document.getElementById('indonesianInput').value.trim();
  const chinese = document.getElementById('chineseInput').value.trim();
  const type = document.getElementById('typeSelect').value;
  const unitId = parseInt(document.getElementById('unitSelect').value);

  // 基础校验
  if (!indonesian || !chinese) {
    alert('请填写完整的印尼语内容和中文翻译！');
    return;
  }
  if (!unitId || !units.some(u => u.id === unitId)) {
    alert('请选择有效的所属单元！');
    return;
  }

  const lessonIndex = lessons.findIndex(l => l.id === lessonId);
  if (lessonIndex > -1) {
    lessons[lessonIndex] = {
      id: lessonId,
      indonesian,
      chinese,
      type,
      unitId
    };

    // 保存并更新界面
    saveLessons();
    clearForm();
    cancelEdit();
    renderUnitList();
    renderAdminLessonList();
    alert('题目修改成功！');
  }
}

// 取消题目编辑
function cancelEdit() {
  clearForm();
  const formActionsEl = document.querySelector('.admin-card:nth-child(2) .form-actions');
  formActionsEl.innerHTML = `
    <button class="btn btn-primary" onclick="addLesson()">添加</button>
    <button class="btn btn-secondary" onclick="clearForm()">清空</button>
  `;
}

// 删除题目
function deleteLesson(lessonId) {
  if (!confirm('确定要删除该题目吗？')) return;

  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return;

  // 删除题目关联数据
  favLessons = favLessons.filter(id => id !== lessonId); // 移除收藏
  wrongLessons = wrongLessons.filter(id => id !== lessonId); // 移除错题
  // 更新进度（如果当前进度是该题目）
  Object.keys(learningProgress).forEach(unitId => {
    if (learningProgress[unitId] === lessonId) {
      const unitLessons = lessons.filter(l => l.unitId === parseInt(unitId));
      learningProgress[unitId] = unitLessons.length > 0 ? unitLessons[0].id : null;
    }
  });

  // 删除题目本身
  lessons = lessons.filter(l => l.id !== lessonId);

  // 重置当前状态（如果删除的是当前题目）
  if (currentLessonId === lessonId) currentLessonId = null;

  // 保存并更新界面
  saveLessons();
  saveFavorites();
  saveWrongs();
  saveProgress();
  renderUnitList();
  renderFavoriteList();
  renderWrongList();
  renderAdminLessonList();
  alert('题目删除成功！');
}

// 渲染管理员题目列表
function renderAdminLessonList() {
  if (!isAdmin) return;

  const adminLessonListEl = document.getElementById('adminLessonList');
  if (lessons.length === 0) {
    adminLessonListEl.innerHTML = '<div class="empty-state">暂无题目数据</div>';
    return;
  }

  adminLessonListEl.innerHTML = '';
  lessons.forEach(lesson => {
    const unit = units.find(u => u.id === lesson.unitId);
    const lessonCard = document.createElement('div');
    lessonCard.className = 'lesson-card';
    lessonCard.innerHTML = `
      <span class="type-tag">${unit?.name || '未知单元'}</span>
      <span class="type-tag">${lesson.type}</span>
      <h3>${lesson.indonesian}</h3>
      <div class="content">${lesson.chinese}</div>
      <div class="form-actions" style="margin-top: 10px;">
        <button class="btn btn-primary" onclick="editLesson(${lesson.id})">编辑</button>
        <button class="btn btn-danger" onclick="deleteLesson(${lesson.id})">删除</button>
      </div>
    `;
    adminLessonListEl.appendChild(lessonCard);
  });
}

// 清空所有题目（谨慎使用）
function clearAllLessons() {
  if (!confirm('确定要清空所有题目吗？此操作不可恢复！')) return;

  // 清空所有关联数据
  lessons = [];
  favLessons = [];
  wrongLessons = [];
  learningProgress = {};

  // 保存并更新界面
  saveLessons();
  saveFavorites();
  saveWrongs();
  saveProgress();
  renderUnitList();
  renderFavoriteList();
  renderWrongList();
  renderAdminLessonList();
  alert('所有题目已清空！');
}