/**
 * 倒计时 - 主应用逻辑
 */

// ==================== 农历日期名称 ====================

const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五',
  '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五',
  '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五',
  '廿六', '廿七', '廿八', '廿九', '三十'
];

/**
 * 填充农历日期下拉选择器
 */
function populateLunarDaySelect() {
  const select = document.getElementById('eventDayLunar');
  if (select.options.length > 0) return; // 已填充
  select.innerHTML = '<option value="">请选择日期</option>';
  LUNAR_DAY_NAMES.forEach((name, index) => {
    const option = document.createElement('option');
    option.value = index + 1;
    option.textContent = name;
    select.appendChild(option);
  });
}

/**
 * 根据日历类型切换日期输入方式
 * @param {string} calendarType - 'solar' | 'lunar'
 */
function swapDayInput(calendarType) {
  const solarGroup = document.getElementById('solarDayGroup');
  const lunarGroup = document.getElementById('lunarDayGroup');
  const dayHint = document.getElementById('dayHint');
  const monthInput = document.getElementById('eventMonth');

  if (calendarType === 'lunar') {
    solarGroup.classList.add('hidden');
    lunarGroup.classList.remove('hidden');
    populateLunarDaySelect();
    monthInput.setAttribute('placeholder', '1');
    dayHint.textContent = '农历每月29或30天，如选30天而该月仅有29天则自动调整';
    dayHint.style.color = 'var(--text-hint)';
  } else {
    lunarGroup.classList.add('hidden');
    solarGroup.classList.remove('hidden');
    monthInput.setAttribute('placeholder', '1');
    updateDayOptions();
  }
}

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
let calendarToggleLocked = false; // 编辑模式下锁定公历/农历切换

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
    // 如果是开启特别关心，先检查/请求通知权限
    if (!event.isSpecialCare && getNotificationPermission() === 'default') {
      await requestNotificationPermission();
    }
    await toggleSpecialCare(event.id);
    await renderEventList();
    // 立即检查通知，并安排后续
    if (getNotificationPermission() === 'granted') {
      await checkAndNotify();
    }
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
  calendarToggleLocked = false;
  document.getElementById('panelTitle').textContent = '添加事件';
  document.getElementById('eventName').value = '';
  document.getElementById('eventMonth').value = '';
  document.getElementById('eventDay').value = '';
  document.getElementById('eventDayLunar').value = '';
  document.getElementById('calendarToggle').classList.remove('active');
  document.getElementById('calendarToggle').classList.remove('locked');
  document.getElementById('calendarLockHint').classList.add('hidden');
  document.getElementById('specialToggle').classList.remove('active');
  document.getElementById('notifyRangeGroup').classList.add('hidden');
  document.getElementById('notifyRange').value = '30';
  document.getElementById('deleteBtn').classList.add('hidden');
  document.getElementById('dayHint').textContent = '';
  // 默认显示公历日期输入
  swapDayInput('solar');
  showPanel();
}

/**
 * 打开编辑面板
 */
async function openEditPanel(id) {
  const event = await getEventById(id);
  if (!event) return;

  currentEditId = id;
  calendarToggleLocked = true;
  document.getElementById('panelTitle').textContent = '编辑事件';
  document.getElementById('eventName').value = event.name;
  document.getElementById('eventMonth').value = event.month;

  // 显示对应的日期输入方式，并锁定
  const calToggle = document.getElementById('calendarToggle');
  const lockHint = document.getElementById('calendarLockHint');
  calToggle.classList.add('locked');
  lockHint.classList.remove('hidden');

  if (event.calendarType === 'lunar') {
    calToggle.classList.add('active');
    swapDayInput('lunar');
    document.getElementById('eventDayLunar').value = event.day;
  } else {
    calToggle.classList.remove('active');
    swapDayInput('solar');
    document.getElementById('eventDay').value = event.day;
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
  calendarToggleLocked = false;
}

/**
 * 保存事件（新增或更新）
 */
async function saveEvent() {
  const name = document.getElementById('eventName').value.trim();
  const month = parseInt(document.getElementById('eventMonth').value);
  const calendarType = document.getElementById('calendarToggle').classList.contains('active') ? 'lunar' : 'solar';

  // 从对应的日期输入框读取日期
  let day;
  if (calendarType === 'lunar') {
    day = parseInt(document.getElementById('eventDayLunar').value);
  } else {
    day = parseInt(document.getElementById('eventDay').value);
  }

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
      showToast('请选择农历日期');
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
    // 如果保存的是特别关心事件，且通知权限未授予，先请求权限
    if (isSpecialCare && getNotificationPermission() === 'default') {
      const perm = await requestNotificationPermission();
      if (perm !== 'granted') {
        showToast('通知权限未开启，请在浏览器设置中允许通知');
      }
    }

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
    // 保存后立即检查通知（尤其是新建特别关心事件时）
    if (isSpecialCare && getNotificationPermission() === 'granted') {
      await checkAndNotify();
    }
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
let swRegistration = null; // Service Worker 注册引用（用于 showNotification）

/**
 * 获取当前通知权限（实时查询，不使用缓存）
 */
function getNotificationPermission() {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * 请求通知权限（必须在用户手势中调用）
 * 如果权限是 denied，不会调用浏览器弹窗，而是显示自定义面板
 */
async function requestNotificationPermission() {
  console.log('[通知] 开始请求权限，当前状态:', Notification.permission);

  if (!('Notification' in window)) {
    console.log('[通知] 此浏览器不支持 Notification API');
    showToast('此浏览器不支持通知功能');
    return 'denied';
  }

  // 如果已经授权，直接返回
  if (Notification.permission === 'granted') {
    notificationPermission = 'granted';
    console.log('[通知] 权限已授予');
    return 'granted';
  }

  // 如果是 denied，无法通过 API 请求，显示面板引导手动开启
  if (Notification.permission === 'denied') {
    console.log('[通知] 权限已被拒绝，显示权限面板');
    showPermissionPanel('denied');
    return 'denied';
  }

  // 只有 'default' 状态才能调用浏览器 API 弹窗
  try {
    console.log('[通知] 调用 Notification.requestPermission()...');
    const permission = await Notification.requestPermission();
    notificationPermission = permission;
    console.log(`[通知] 请求结果: ${permission}`);
    if (permission === 'granted') {
      showToast('✅ 通知权限已开启');
    } else if (permission === 'denied') {
      showPermissionPanel('denied');
    }
    return permission;
  } catch (err) {
    console.error('[通知] requestPermission 异常:', err);
    showToast('请求通知权限失败，请重试');
    return 'denied';
  }
}

/**
 * 通过 Service Worker 发送通知
 * SW 通知可以出现在锁屏、通知中心，即使页面关闭也能显示
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendNotification(event, days) {
  if (!('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  // 确保 Service Worker 已就绪
  if (!swRegistration) {
    console.warn('Service Worker 未就绪，尝试获取...');
    try {
      swRegistration = await navigator.serviceWorker.ready;
    } catch (e) {
      console.error('无法获取 Service Worker:', e);
      return false;
    }
  }

  let title, body;
  if (days === 0) {
    title = '🎉 就是今天！';
    body = `「${event.name}」就在今天！`;
  } else {
    title = `⏰ 倒计时 ${days} 天`;
    body = `「${event.name}」还有 ${days} 天（${formatDate(event.month, event.day, event.calendarType)}）`;
  }

  const options = {
    body: body,
    icon: 'icon.svg',
    badge: 'icon.svg',
    tag: `countdown-${event.id}-${days}`,
    renotify: true,
    requireInteraction: days === 0,
    vibrate: [200, 100, 200],
    silent: false,
    data: {
      eventId: event.id,
      eventName: event.name,
      days: days,
    },
  };

  try {
    await swRegistration.showNotification(title, options);
    console.log(`通知已发送(SW): ${event.name} - ${days}天`);
    return true;
  } catch (e) {
    console.error('发送通知失败:', e);
    return false;
  }
}

/**
 * 显示通知权限请求面板
 * @param {string} reason - 'default' 首次请求 | 'denied' 已被拒绝
 */
/**
 * 显示通知权限请求面板
 * @param {string} reason - 'default' 首次请求 | 'denied' 已被拒绝
 */
function showPermissionPanel(reason) {
  const overlay = document.getElementById('overlay');
  const panel = document.getElementById('permissionPanel');
  const actionBtn = document.getElementById('permActionBtn');
  const hint = document.getElementById('permHint');
  const title = document.getElementById('permTitle');
  const desc = document.getElementById('permDesc');

  // 先隐藏编辑面板（如果有的话）
  const editPanel = document.getElementById('editPanel');
  editPanel.classList.remove('active');

  if (reason === 'denied') {
    title.textContent = '通知已被关闭';
    desc.innerHTML = '该网站的<strong>站点级</strong>通知权限被拒绝。<br>全局浏览器通知开关和站点权限是两回事。';

    // 检测运行环境
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isStandalone && isAndroid) {
      // Android PWA 已安装
      hint.innerHTML = '<strong>尝试以下路径（因手机品牌而异）：</strong><br>'
        + '① 长按桌面上的"倒计时"图标 → ⓘ 应用信息 → 通知 → 允许<br>'
        + '② 或：设置 → 应用 → 搜索"Edge" → 通知 → 找到本站 → 允许<br>'
        + '③ 或：设置 → 应用 → 搜索"倒计时" → 通知 → 允许';
    } else if (isAndroid) {
      // Android 浏览器
      hint.innerHTML = '<strong>尝试以下路径：</strong><br>'
        + '① Edge 菜单(···) → ⚙ 设置 → 站点权限 → 通知 → 找到 climentine542.github.io → 允许<br>'
        + '② 或：Edge 菜单 → 信息图标(i) → 网站权限 → 通知 → 允许';
    } else {
      // 桌面端
      hint.innerHTML = '<strong>如何开启：</strong><br>'
        + '① 点击地址栏左侧的 🔒 或 ⓘ 图标<br>'
        + '② 找到「通知」→ 改为「允许」<br>'
        + '③ 刷新页面后再试';
    }

    actionBtn.textContent = '已开启，重新检测';
    actionBtn.classList.add('btn-outline');
    hint.classList.remove('hidden');
  } else {
    title.textContent = '开启通知';
    desc.innerHTML = '开启通知后，特别关心事件会在<br>倒计时个位为 0 的天数提醒你';
    actionBtn.textContent = '允许通知';
    actionBtn.classList.remove('btn-outline');
    hint.classList.add('hidden');
  }

  overlay.classList.add('active');
  panel.classList.add('active');
}

/**
 * 隐藏通知权限面板
 */
function hidePermissionPanel() {
  document.getElementById('overlay').classList.remove('active');
  document.getElementById('permissionPanel').classList.remove('active');
}

/**
 * 权限面板按钮处理
 */
async function handlePermAction() {
  const currentPerm = getNotificationPermission();
  console.log('[权限面板] 当前权限:', currentPerm);

  if (currentPerm === 'denied') {
    // 用户可能已经去设置中开启了，重新调用 API
    // 有些浏览器在用户手动改回「允许」后，requestPermission() 可以再次弹窗
    try {
      const perm = await Notification.requestPermission();
      console.log('[权限面板] 重新请求结果:', perm);
      notificationPermission = perm;

      if (perm === 'granted') {
        hidePermissionPanel();
        showToast('✅ 通知权限已恢复');
        await sendTestNotificationInner();
        return;
      }
      if (perm === 'default') {
        // 权限从 denied 变成了 default（用户清除了设置）
        // 再调一次就会弹出浏览器原生弹窗
        const perm2 = await Notification.requestPermission();
        notificationPermission = perm2;
        if (perm2 === 'granted') {
          hidePermissionPanel();
          showToast('✅ 通知权限已开启');
          await sendTestNotificationInner();
          return;
        }
        if (perm2 === 'denied') {
          // 又拒绝了，更新面板
          showPermissionPanel('denied');
          return;
        }
      }
    } catch (e) {
      console.log('[权限面板] 重新请求异常:', e);
    }

    // 仍然是 denied，提示用户
    showToast('⚠️ 权限仍未开启，请参照面板中的指引操作');
    return;
  }

  // 'default' 状态：调用浏览器原生弹窗
  const perm = await requestNotificationPermission();
  if (perm === 'granted') {
    hidePermissionPanel();
    await sendTestNotificationInner();
  }
  // denied → requestNotificationPermission 内部会更新面板为 denied 模式
}

/**
 * 发送测试通知的内部实现（不发权限面板）
 */
async function sendTestNotificationInner() {
  console.log('[测试通知] ========== 开始 ==========');
  console.log('[测试通知] Notification API 可用:', 'Notification' in window);
  console.log('[测试通知] 当前权限:', Notification.permission);
  console.log('[测试通知] SW 注册状态:', swRegistration ? '已就绪' : '未注册');

  // 确保 SW 就绪
  if (!swRegistration) {
    console.log('[测试通知] 获取 SW 注册...');
    try {
      swRegistration = await navigator.serviceWorker.ready;
      console.log('[测试通知] SW 已就绪:', swRegistration.scope);
    } catch (e) {
      console.error('[测试通知] SW 获取失败:', e);
      showToast('❌ 通知服务未就绪，请刷新页面后重试');
      return;
    }
  }

  // 发送测试通知
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  try {
    console.log('[测试通知] 调用 showNotification...');
    await swRegistration.showNotification('🔔 测试通知', {
      body: `倒计时应用通知功能正常！\n发送时间：${timeStr}`,
      icon: 'icon.svg',
      badge: 'icon.svg',
      tag: 'test-notification',
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200, 100, 200],
      silent: false,
      data: { isTest: true },
    });
    console.log('[测试通知] ✅ 发送成功');
    showToast('✅ 测试通知已发送，请查看通知中心');
  } catch (e) {
    console.error('[测试通知] ❌ 发送失败:', e);
    showToast('❌ 发送失败：' + e.message);
  }
  console.log('[测试通知] ========== 结束 ==========');
}

/**
 * 发送测试通知（点击铃铛按钮时调用）
 * 如果权限未授予，先弹出权限面板
 */
async function sendTestNotification() {
  console.log('[测试通知] 当前权限:', Notification.permission);

  if (getNotificationPermission() !== 'granted') {
    console.log('[测试通知] 权限未授予，显示权限面板');
    showPermissionPanel(Notification.permission === 'denied' ? 'denied' : 'default');
    return;
  }

  await sendTestNotificationInner();
}

/**
 * 检查是否需要发送通知
 */
async function checkAndNotify() {
  // 实时检查权限，不使用缓存变量
  if (getNotificationPermission() !== 'granted') {
    console.log('通知权限未授予，跳过检查');
    return;
  }

  const events = await getAllEvents();
  const specialEvents = events.filter(e => e.isSpecialCare);

  if (specialEvents.length === 0) {
    console.log('没有特别关心事件，跳过通知检查');
    return;
  }

  console.log(`检查 ${specialEvents.length} 个特别关心事件的通知...`);

  for (const event of specialEvents) {
    const days = getCountdownDays(event.month, event.day, event.calendarType);

    console.log(`  ${event.name}: 倒计时 ${days} 天, 通知范围 ${event.notifyRange}天`);

    // 判断是否应该通知：个位为0 且 在通知范围内 且 天数>=0
    if (days % 10 !== 0) {
      console.log(`    → 跳过 (天数个位不是0)`);
      continue;
    }
    if (days > event.notifyRange) {
      console.log(`    → 跳过 (超出通知范围)`);
      continue;
    }
    if (days < 0) {
      console.log(`    → 跳过 (已过期)`);
      continue;
    }

    // 检查是否已经通知过
    const alreadyNotified = await hasNotified(event.id, days);
    if (alreadyNotified) {
      console.log(`    → 今天已通知过，跳过`);
      continue;
    }

    // 发送通知
    const sent = await sendNotification(event, days);
    if (sent) {
      await recordNotification(event.id, days, event.name);
      console.log(`    → ✅ 通知已发送`);
    }
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
  const month = parseInt(monthInput.value);
  const calendarType = document.getElementById('calendarToggle').classList.contains('active') ? 'lunar' : 'solar';
  const dayHint = document.getElementById('dayHint');

  if (!month || month < 1 || month > 12) return;

  if (calendarType === 'lunar') {
    // 农历模式：显示农历日期提示
    if (dayHint) {
      dayHint.textContent = '请从下拉列表中选择农历日期';
    }
    return;
  }

  // 公历模式
  const dayInput = document.getElementById('eventDay');
  const maxDays = getMaxDays(month, new Date().getFullYear());

  // 如果当前天数超出范围，调整
  const currentDay = parseInt(dayInput.value);
  if (currentDay && currentDay > maxDays) {
    dayInput.value = maxDays;
  }

  // 更新提示
  dayInput.setAttribute('max', maxDays);
  dayInput.setAttribute('placeholder', `1-${maxDays}`);

  if (dayHint) {
    dayHint.textContent = `${month}月最多${maxDays}天`;
  }
}

// ==================== Service Worker 注册 ====================

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('sw.js');
      console.log('Service Worker 注册成功:', swRegistration.scope);

      // 监听 SW 更新
      swRegistration.addEventListener('updatefound', () => {
        const newWorker = swRegistration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('新版本已缓存，刷新页面后生效');
            }
          });
        }
      });
    } catch (err) {
      console.warn('Service Worker 注册失败:', err);
      swRegistration = null;
    }
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

    // 3. 初始化通知权限状态
    if ('Notification' in window) {
      notificationPermission = Notification.permission;
      console.log(`当前通知权限: ${notificationPermission}`);

      // 如果已授权，立即检查并安排后续
      if (Notification.permission === 'granted') {
        console.log('通知已授权，开始检查...');
        await checkAndNotify();
        scheduleNextCheck();
      } else if (Notification.permission === 'default') {
        // 权限未决定，尝试请求（部分浏览器允许非手势调用）
        console.log('通知权限未决定，尝试请求...');
        const perm = await requestNotificationPermission();
        if (perm === 'granted') {
          await checkAndNotify();
          scheduleNextCheck();
        } else {
          console.log('通知权限未获取，将在用户创建特别关心事件时再次请求');
        }
      } else {
        console.log('通知权限已被拒绝，请到系统设置中开启');
      }
    } else {
      console.log('此浏览器不支持通知');
    }

    // 4. 注册 Service Worker（先注册，通知依赖 SW）
    await registerServiceWorker();

    // 5. 监听页面可见性变化，重新可见时刷新列表并检查通知
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        console.log('页面可见，刷新列表并检查通知...');
        await renderEventList();
        // 实时检查权限并尝试通知
        if (getNotificationPermission() === 'granted') {
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

  // 面板关闭（编辑面板 / 权限面板）
  document.getElementById('overlay').addEventListener('click', () => {
    hidePanel();
    hidePermissionPanel();
  });
  document.getElementById('cancelBtn').addEventListener('click', hidePanel);
  document.getElementById('cancelBtn2').addEventListener('click', hidePanel);

  // 保存
  document.getElementById('saveBtn').addEventListener('click', saveEvent);

  // 删除
  document.getElementById('deleteBtn').addEventListener('click', deleteCurrentEvent);

  // 公历/农历切换
  document.getElementById('calendarToggle').addEventListener('click', function() {
    // 编辑模式下不允许切换
    if (calendarToggleLocked) {
      showToast('创建后不可更改公历/农历');
      return;
    }
    this.classList.toggle('active');
    const isLunar = this.classList.contains('active');
    swapDayInput(isLunar ? 'lunar' : 'solar');
    // 清空日期输入
    if (isLunar) {
      document.getElementById('eventDayLunar').value = '';
    } else {
      document.getElementById('eventDay').value = '';
    }
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

  // 测试通知按钮
  document.getElementById('notifyTestBtn').addEventListener('click', sendTestNotification);

  // 通知权限面板按钮
  document.getElementById('permActionBtn').addEventListener('click', handlePermAction);
  document.getElementById('permSkipBtn').addEventListener('click', hidePermissionPanel);

  // 启动应用
  init();
});
