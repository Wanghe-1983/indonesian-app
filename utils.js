// ===================== 本地存储工具 =====================
// 保存单元数据
function saveUnits() {
  localStorage.setItem('indonesian_units', JSON.stringify(units));
}

// 保存题目数据
function saveLessons() {
  localStorage.setItem('indonesian_lessons', JSON.stringify(lessons));
}

// 保存收藏数据
function saveFavorites() {
  localStorage.setItem('indonesian_favs', JSON.stringify(favLessons));
}

// 保存错题数据
function saveWrongs() {
  localStorage.setItem('indonesian_wrongs', JSON.stringify(wrongLessons));
}

// 保存学习进度
function saveProgress() {
  localStorage.setItem('indonesian_progress', JSON.stringify(learningProgress));
}

// ===================== 播放控制工具 =====================
// 停止所有播放（音频+定时器）
function stopAllPlay() {
  if (audio) {
    audio.pause();
    audio = null;
  }
  if (autoPlayTimer) {
    clearTimeout(autoPlayTimer);
    autoPlayTimer = null;
  }
}

// 播放指定内容的语音（印尼语）
function playVoice(content, speed = 1) {
  stopAllPlay();
  // Google TTS接口（印尼语：tl=id）
  const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(content)}&tl=id&total=1&idx=0&textlen=${content.length}&speed=${speed}&client=gtx`;
  
  audio = new Audio(voiceUrl);
  // 播放失败时降级为浏览器原生语音合成
  audio.play().catch(() => fallbackSpeechSynthesis(content, speed));

  // 自动播放/循环播放逻辑
  if (isLoopPlay || document.getElementById('autoPlayToggle').checked) {
    const playDuration = content.length * 500 / speed; // 粗略计算播放时长
    autoPlayTimer = setTimeout(() => {
      if (isLoopPlay) playVoice(content, speed); // 循环播放当前内容
      else nextLesson(); // 自动播放下一课
    }, playDuration);
  }
}

// 降级语音合成（浏览器原生）
function fallbackSpeechSynthesis(text, speed = 1) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID'; // 印尼语
    utterance.rate = speed; // 语速
    speechSynthesis.speak(utterance);
  }
}

// 播放当前题目的语音
function playCurrentVoice() {
  if (!currentLessonId) return;
  const lesson = lessons.find(item => item.id === currentLessonId);
  if (lesson) playVoice(lesson.indonesian, playSpeed);
}

// ===================== 通用工具 =====================
// 加载本地存储数据（初始化时调用）
function loadData() {
  // 加载单元
  const savedUnits = localStorage.getItem('indonesian_units');
  if (savedUnits) units = JSON.parse(savedUnits);
  else {
    // 默认单元（无题库时初始化）
    units = [
      { id: 1, name: "默认单元", desc: "初始默认单元", createTime: new Date().toISOString() }
    ];
    saveUnits();
  }

  // 加载题目
  const savedLessons = localStorage.getItem('indonesian_lessons');
  if (savedLessons) lessons = JSON.parse(savedLessons);
  else {
    // 默认题目（无题库时初始化）
    lessons = [
      { id: 1, indonesian: "Halo", chinese: "你好", type: "生词", unitId: 1 },
      { id: 2, indonesian: "Terima kasih", chinese: "谢谢", type: "生词", unitId: 1 }
    ];
    saveLessons();
  }

  // 加载收藏、错题、进度
  favLessons = JSON.parse(localStorage.getItem('indonesian_favs')) || [];
  wrongLessons = JSON.parse(localStorage.getItem('indonesian_wrongs')) || [];
  learningProgress = JSON.parse(localStorage.getItem('indonesian_progress')) || {};

  // 加载管理员状态
  isAdmin = localStorage.getItem('indonesian_admin') === 'true';
  if (isAdmin) document.getElementById('adminNav').style.display = 'block';
}

// 切换播放速度
function changeSpeed(speed) {
  playSpeed = parseFloat(speed);
  stopAllPlay();
  playCurrentVoice();
}

// 切换自动播放
function toggleAutoPlay() {
  stopAllPlay();
  const isAuto = document.getElementById('autoPlayToggle').checked;
  if (isAuto && currentLessonId) playCurrentVoice();
}

// 切换循环播放
function toggleLoopPlay() {
  stopAllPlay();
  isLoopPlay = document.getElementById('loopPlayToggle').checked;
  if (isLoopPlay && currentLessonId) playCurrentVoice();
}