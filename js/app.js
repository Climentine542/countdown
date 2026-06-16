/**
 * 倒计时 - 主应用逻辑
 */

// ==================== 日期计算 ====================

/**
 * 判断是否为闰年
 */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * 获取某月的最大天数
 */
function getMaxDays(month, year) {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return daysInMonth[month - 1];
}

/**
 * 计算距离目标日期还有多少天
 * 如果今年已过，则自动算到明年
 * @param {number} month
 * @param {number} day
 * @param {string} calendarType - 'solar' | 'lunar'
 */
function getCountdownDays(month, day, calendarType) {
  if (calendarType === 'lunar') {
    return getLunarCountdownDays(month, day);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 校验日期有效性
  const maxDay = getMaxDays(month, today.getFullYear());
  const validDay = Math.min(day, maxDay);

  // 尝试今年
  let eventDate = new Date(today.getFullYear(), month - 1, validDay);
  eventDate.setHours(0, 0, 0, 0);

  // 如果已过，用明年；如果是今天，倒计时为0天
  if (eventDate.getTime() < today.getTime()) {
    const nextMaxDay = getMaxDays(month, today.getFullYear() + 1);
    const nextValidDay = Math.min(day, nextMaxDay);
    eventDate = new Date(today.getFullYear() + 1, month - 1, nextValidDay);
    eventDate.setHours(0, 0, 0, 0);
  }

  const diffTime = eventDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 格式化月份和日期为显示文字
 */
function formatDate(month, day, calendarType) {
  if (calendarType === 'lunar') {
    return formatLunarDate(month, day);
  }
  return `${month}月${day}日`;
}

/**
 * 获取日历类型标签
 */
function getCalendarLabel(calendarType) {
  return calendarType === 'lunar' ? '农历' : '公历';
}

/**
 * 获取倒计时显示文本
 */
function getCountdownText(days) {
  if (days === 0) {
    return '就是今天';
  }
  return `${days} 天`;
}

// ==================== 事件排序 ====================

/**
 * 排序事件列表：
 * 1. 特别关心置顶
 * 2. 各组内按倒计天数由少到多
 */
function sortEvents(events) {
  return events.slice().sort((a, b) => {
    const daysA = getCountdownDays(a.month, a.day, a.calendarType);
    const daysB = getCountdownDays(b.month, b.day, b.calendarType);

    // 特别关心优先
    if (a.isSpecialCare && !b.isSpecialCare) return -1;
    if (!a.isSpecialCare && b.isSpecialCare) return 1;

    // 同组内按倒计天数升序
    return daysA - daysB;
  });
}

// ==================== UI 渲染 ====================

let currentEditId = null; // 当前正在编辑的事件ID（null = 新增模式）

/**
 * 渲染整个事件列表
 */
async function renderEventList() {
  const events = await getAllEvents();
  const sorted = sortEvents(events);
  const emptyState = document.getElementById('emptyState');
  const specialSection = document.getElementById('specialSection');
  const normalSection = document.getElementById('normalSection');

  const specialEvents = sorted.filter(e => e.isSpecialCare);
  const normalEvents = sorted.filter(e => !e.isSpecialCare);

  // 更新统计
  document.getElementById('totalCount').textContent = events.length;
  if (specialEvents.length > 0) {
    document.getElementById('specialCount').textContent = specialEvents.length;
  }

  if (events.length === 0) {
    emptyState.classList.remove('hidden');
    specialSection.classList.add('hidden');
    normalSection.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');

    // 渲染特别关心区
    if (specialEvents.length > 0) {
      specialSection.classList.remove('hidden');
      renderEventGroup('specialEventList', specialEvents);
    } else {
      specialSection.classList.add('hidden');
    }

    // 渲染普通事件区
    if (normalEvents.length > 0) {
      normalSection.classList.remove('hidden');
      renderEventGroup('normalEventList', normalEvents);
    } else {
      normalSection.classList.add('hidden');
    }
  }
}

/**
 * 渲染一组事件
 */
function renderEventGroup(containerId, events) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  events.forEach(event => {
    const days = getCountdownDays(event.month, event.day, event.calendarType);
    const card = createEventCard(event, days);
    container.appendChild(card);
  });
}

/**
 * 创建单个事件卡片
 */
function createEventCard(event, days) {
  const card = document.createElement('div');
  card.className = 'event-card';
  card.setAttribute('data-id', event.id);

  // 点击卡片进入编辑
  card.addEventListener('click', (e) => {
    // 如果点的是星标按钮，不触发编辑
    if (e.target.closest('.star-btn')) return;
    openEditPanel(event.id);
  });

  // 倒计时是否在通知范围内（用于视觉提示）
  const isNotifyMilestone = event.isSpecialCare && days <= event.notifyRange && days % 10 === 0 && days >= 0;
  const daysClass = isNotifyMilestone ? 'countdown-days milestone' : 'countdown-days';

  // 星标图标
  const starIcon = event.isSpecialCare
    ? `<svg width="26" height="26" viewBox="0 0 24 24" fill="#FFC107" stroke="#FFA000" stroke-width="1.5">
         <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/>
       </svg>`
    : `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#BDBDBD" stroke-width="1.5">
         <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/>
       </svg>`;

  card.innerHTML = `
    <button class="star-btn" data-id="${event.id}" title="${event.isSpecialCare ? '取消特别关心' : '设为特别关心'}">
      ${starIcon}
    </button>
    <div class="card-body">
      <div class="event-name">${escapeHtml(event.name)}</div>
      <div class="event-date">${formatDate(event.month, event.day, event.calendarType)}</div>
      <div class="event-meta">
        ${event.isSpecialCare ? '<span class="special-badge">特别关心</span>' : ''}
        <span class="calendar-badge">${getCalendarLabel(event.calendarType)}</span>
      </div>
    </div>
    <div class="card-right">
      <div class="${daysClass}">${getCountdownText(days)}</div>
      ${event.isSpecialCare ? `<div class="notify-info">通知范围: ${event.notifyRange}天</div>` : ''}
    </div>
  `;

  // 星标按钮事件
  const starBtn = card.querySelector('.star-btn');
  starBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await toggleSpecialCare(event.id);
    await renderEventList();
    // 如果特别关心状态改变，重新检查通知
    scheduleNextCheck();
  });

  return card;
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== 底部面板（新增/编辑） ====================

/**
 * 打开新增面板
 */
function openAddPanel() {
  currentEditId = null;
  document.getElementById('panelTitle').textContent = '添加事件';
  document.getElementById('eventName').value = '';
  document.getElementById('eventMonth').value = '';
  document.getElementById('eventDay').value = '';
  document.getElementById('calendarToggle').classList.remove('active');
  document.getElementById('specialToggle').classList.remove('active');
  document.getElementById('notifyRangeGroup').classList.add('hidden');
  document.getElementById('notifyRange').value = '30';
  document.getElementById('deleteBtn').classList.add('hidden');
  showPanel();
}

/**
 * 打开编辑面板
 */
async function openEditPanel(id) {
  const event = await getEventById(id);
  if (!event) return;

  currentEditId = id;
  document.getElementById('panelTitle').textContent = '编辑事件';
  document.getElementById('eventName').value = event.name;
  document.getElementById('eventMonth').value = event.month;
  document.getElementById('eventDay').value = event.day;

  // 公历/农历切换
  const calToggle = document.getElementById('calendarToggle');
  if (event.calendarType === 'lunar') {
    calToggle.classList.add('active');
  } else {
    calToggle.classList.remove('active');
  }

  if (event.isSpecialCare) {
    document.getElementById('specialToggle').classList.add('active');
    document.getElementById('notifyRangeGroup').classList.remove('hidden');
    document.getElementById('notifyRange').value = event.notifyRange;
  } else {
    document.getElementById('specialToggle').classList.remove('active');
    document.getElementById('notifyRangeGroup').classList.add('hidden');
    document.getElementById('notifyRange').value = '30';
  }

  document.getElementById('deleteBtn').classList.remove('hidden');
  showPanel();
}

/**
 * 显示底部面板
 */
function showPanel() {
  const overlay = document.getElementById('overlay');
  const panel = document.getElementById('editPanel');
  overlay.classList.add('active');
  panel.classList.add('active');
  // 延迟聚焦，等动画完成
  setTimeout(() => {
    document.getElementById('eventName').focus();
  }, 300);
}

/**
 * 隐藏底部面板
 */
function hidePanel() {
  const overlay = document.getElementById('overlay');
  const panel = document.getElementById('editPanel');
  overlay.classList.remove('active');
  panel.classList.remove('active');
  currentEditId = null;
}

/**
 * 保存事件（新增或更新）
 */
async function saveEvent() {
  const name = document.getElementById('eventName').value.trim();
  const month = parseInt(document.getElementById('eventMonth').value);
  const day = parseInt(document.getElementById('eventDay').value);
  const calendarType = document.getElementById('calendarToggle').classList.contains('active') ? 'lunar' : 'solar';
  const isSpecialCare = document.getElementById('specialToggle').classList.contains('active');
  const notifyRange = parseInt(document.getElementById('notifyRange').value) || 30;

  // 表单验证
  if (!name) {
    showToast('请输入活动名称');
    return;
  }
  if (!month || month < 1 || month > 12) {
    showToast('请输入有效的月份 (1-12)');
    return;
  }
  if (calendarType === 'lunar') {
    if (!day || day < 1 || day > 30) {
      showToast('农历日期请输入 1-30');
      return;
    }
  } else {
    const maxDay = getMaxDays(month, new Date().getFullYear());
    if (!day || day < 1 || day > maxDay) {
      showToast(`请输入有效的日期 (${month}月最多${maxDay}天)`);
      return;
    }
  }

  try {
    if (currentEditId) {
      // 更新
      await updateEvent({
        id: currentEditId,
        name,
        month,
        day,
        calendarType,
        isSpecialCare,
        notifyRange,
      });
      showToast('事件已更新');
    } else {
      // 新增
      await addEvent({
        name,
        month,
        day,
        calendarType,
        isSpecialCare,
        notifyRange,
      });
      showToast('事件已添加');
    }

    hidePanel();
    await renderEventList();
    scheduleNextCheck();
  } catch (err) {
    console.error('保存失败:', err);
    showToast('保存失败，请重试');
  }
}

/**
 * 删除事件
 */
async function deleteCurrentEvent() {
  if (!currentEditId) return;

  const event = await getEventById(currentEditId);
  if (!event) return;

  const confirmed = confirm(`确定要删除「${event.name}」吗？\n此操作不可撤销。`);
  if (!confirmed) return;

  try {
    await deleteEvent(currentEditId);
    showToast('事件已删除');
    hidePanel();
    await renderEventList();
    scheduleNextCheck();
  } catch (err) {
    console.error('删除失败:', err);
    showToast('删除失败，请重试');
  }
}

/**
 * Toast 提示
 */
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// ==================== 通知系统 ====================

let notificationPermission = 'default';
let checkTimer = null;

/**
 * 请求通知权限
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('此浏览器不支持通知');
    return;
  }

  const permission = await Notification.requestPermission();
  notificationPermission = permission;
  return permission;
}

/**
 * 检查是否需要发送通知
 */
async function checkAndNotify() {
  if (notificationPermission !== 'granted') return;

  const events = await getAllEvents();
  const specialEvents = events.filter(e => e.isSpecialCare);

  for (const event of specialEvents) {
    const days = getCountdownDays(event.month, event.day, event.calendarType);

    // 判断是否应该通知：个位为0 且 在通知范围内 且 天数>=0
    if (days % 10 !== 0) continue;
    if (days > event.notifyRange) continue;
    if (days < 0) continue;

    // 检查是否已经通知过
    const alreadyNotified = await hasNotified(event.id, days);
    if (alreadyNotified) continue;

    // 发送通知
    sendNotification(event, days);
    await recordNotification(event.id, days, event.name);
  }
}

/**
 * 发送单条通知
 */
function sendNotification(event, days) {
  if (!('Notification' in window)) return;

  let title, body;
  if (days === 0) {
    title = '🎉 就是今天！';
    body = `「${event.name}」就在今天！`;
  } else {
    title = `⏰ 倒计时 ${days} 天`;
    body = `「${event.name}」还有 ${days} 天（${formatDate(event.month, event.day)}）`;
  }

  const options = {
    body: body,
    icon: 'icon.svg',
    badge: 'icon.svg',
    tag: `countdown-${event.id}-${days}`,
    renotify: false,
    requireInteraction: days === 0,
    vibrate: [200, 100, 200],
  };

  try {
    new Notification(title, options);
    console.log(`通知已发送: ${event.name} - ${days}天`);
  } catch (e) {
    console.error('发送通知失败:', e);
  }
}

/**
 * 计算到下一个早上8点的毫秒数
 */
function getMillisUntilNext8AM() {
  const now = new Date();
  const eightAM = new Date(now);
  eightAM.setHours(8, 0, 0, 0);

  if (now >= eightAM) {
    // 今天8点已过，设为明天8点
    eightAM.setDate(eightAM.getDate() + 1);
  }

  return eightAM.getTime() - now.getTime();
}

/**
 * 安排下一次通知检查
 */
function scheduleNextCheck() {
  if (checkTimer) {
    clearTimeout(checkTimer);
    checkTimer = null;
  }

  const millis = getMillisUntilNext8AM();

  // setTimeout 最大约 24.8 天，我们的每日检查足够
  checkTimer = setTimeout(async () => {
    await checkAndNotify();
    // 递归安排下一次
    scheduleNextCheck();
  }, millis);

  console.log(`下次通知检查: ${new Date(Date.now() + millis).toLocaleString('zh-CN')}`);
}

// ==================== 日期联动 ====================

/**
 * 根据月份更新日期选择器的天数范围
 */
function updateDayOptions() {
  const monthInput = document.getElementById('eventMonth');
  const dayInput = document.getElementById('eventDay');
  const month = parseInt(monthInput.value);

  if (!month || month < 1 || month > 12) return;

  const maxDays = getMaxDays(month, new Date().getFullYear());

  // 如果当前天数超出范围，调整
  const currentDay = parseInt(dayInput.value);
  if (currentDay && currentDay > maxDays) {
    dayInput.value = maxDays;
  }

  // 更新提示
  dayInput.setAttribute('max', maxDays);
  dayInput.setAttribute('placeholder', `1-${maxDays}`);

  // 显示提示文字
  const dayHint = document.getElementById('dayHint');
  if (dayHint) {
    dayHint.textContent = `${month}月最多${maxDays}天`;
  }
}

// ==================== Service Worker 注册 ====================

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        console.log('Service Worker 注册成功:', reg.scope);
      })
      .catch(err => {
        console.warn('Service Worker 注册失败:', err);
      });
  }
}

// ==================== 初始化 ====================

async function init() {
  try {
    // 1. 打开数据库
    await openDB();
    console.log('数据库已就绪');

    // 2. 渲染列表
    await renderEventList();

    // 3. 请求通知权限
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      // 立即检查一次今天的通知
      await checkAndNotify();
      // 安排后续检查
      scheduleNextCheck();
    }

    // 4. 注册 Service Worker
    registerServiceWorker();

    // 5. 监听页面可见性变化，重新可见时刷新
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        await renderEventList();
        if (notificationPermission === 'granted') {
          await checkAndNotify();
          scheduleNextCheck();
        }
      }
    });

    console.log('应用初始化完成');
  } catch (err) {
    console.error('初始化失败:', err);
    showToast('应用加载失败，请刷新页面');
  }
}

// ==================== 事件绑定 ====================

document.addEventListener('DOMContentLoaded', () => {
  // FAB 添加按钮
  document.getElementById('fabAdd').addEventListener('click', openAddPanel);

  // 面板关闭
  document.getElementById('overlay').addEventListener('click', hidePanel);
  document.getElementById('cancelBtn').addEventListener('click', hidePanel);
  document.getElementById('cancelBtn2').addEventListener('click', hidePanel);

  // 保存
  document.getElementById('saveBtn').addEventListener('click', saveEvent);

  // 删除
  document.getElementById('deleteBtn').addEventListener('click', deleteCurrentEvent);

  // 公历/农历切换
  document.getElementById('calendarToggle').addEventListener('click', function() {
    this.classList.toggle('active');
  });

  // 特别关心切换
  document.getElementById('specialToggle').addEventListener('click', function() {
    this.classList.toggle('active');
    const notifyGroup = document.getElementById('notifyRangeGroup');
    if (this.classList.contains('active')) {
      notifyGroup.classList.remove('hidden');
    } else {
      notifyGroup.classList.add('hidden');
    }
  });

  // 月份变化时更新日期范围
  document.getElementById('eventMonth').addEventListener('input', updateDayOptions);
  document.getElementById('eventMonth').addEventListener('change', updateDayOptions);

  // 回车键保存
  document.getElementById('eventName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEvent();
  });

  // 触摸面板外关闭（移动端滑动关闭）
  let touchStartY = 0;
  const panel = document.getElementById('editPanel');
  panel.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  panel.addEventListener('touchmove', (e) => {
    const deltaY = e.touches[0].clientY - touchStartY;
    if (deltaY > 80) {
      hidePanel();
    }
  }, { passive: true });

  // 启动应用
  init();
});
