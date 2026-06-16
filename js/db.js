/**
 * 倒计时 - IndexedDB 数据存储层
 */

const DB_NAME = 'countdownDB';
const DB_VERSION = 1;
const STORE_EVENTS = 'events';
const STORE_NOTIFICATIONS = 'notifications';

let db = null;

/**
 * 打开数据库并初始化
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // 事件存储
      if (!database.objectStoreNames.contains(STORE_EVENTS)) {
        const eventsStore = database.createObjectStore(STORE_EVENTS, { keyPath: 'id' });
        eventsStore.createIndex('isSpecialCare', 'isSpecialCare', { unique: false });
        eventsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 通知记录存储（用于避免重复通知）
      if (!database.objectStoreNames.contains(STORE_NOTIFICATIONS)) {
        const notifStore = database.createObjectStore(STORE_NOTIFICATIONS, { keyPath: 'id' });
        notifStore.createIndex('eventId', 'eventId', { unique: false });
        notifStore.createIndex('date', 'date', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('数据库打开失败:', event.target.error);
      reject(event.target.error);
    };
  });
}

// ==================== 事件 CRUD ====================

/**
 * 获取所有事件（按排序规则）
 */
function getAllEvents() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_EVENTS], 'readonly');
    const store = transaction.objectStore(STORE_EVENTS);
    const request = store.getAll();

    request.onsuccess = () => {
      const events = request.result;
      resolve(events);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * 根据 ID 获取单个事件
 */
function getEventById(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_EVENTS], 'readonly');
    const store = transaction.objectStore(STORE_EVENTS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 添加新事件
 */
function addEvent(eventData) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_EVENTS], 'readwrite');
    const store = transaction.objectStore(STORE_EVENTS);

    const event = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      name: eventData.name.trim(),
      month: eventData.month,
      day: eventData.day,
      isSpecialCare: eventData.isSpecialCare || false,
      notifyRange: eventData.isSpecialCare ? (eventData.notifyRange || 365) : 365,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const request = store.add(event);

    request.onsuccess = () => resolve(event);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 更新事件
 */
function updateEvent(eventData) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_EVENTS], 'readwrite');
    const store = transaction.objectStore(STORE_EVENTS);

    // 先获取原有数据
    const getRequest = store.get(eventData.id);
    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (!existing) {
        reject(new Error('事件不存在'));
        return;
      }

      const updated = {
        ...existing,
        name: eventData.name.trim(),
        month: eventData.month,
        day: eventData.day,
        isSpecialCare: eventData.isSpecialCare,
        notifyRange: eventData.isSpecialCare ? (eventData.notifyRange || 365) : 365,
        updatedAt: Date.now(),
      };

      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve(updated);
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * 删除事件
 */
function deleteEvent(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_EVENTS], 'readwrite');
    const store = transaction.objectStore(STORE_EVENTS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 切换特别关心状态（快速操作）
 */
function toggleSpecialCare(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_EVENTS], 'readwrite');
    const store = transaction.objectStore(STORE_EVENTS);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const event = getRequest.result;
      if (!event) {
        reject(new Error('事件不存在'));
        return;
      }

      event.isSpecialCare = !event.isSpecialCare;
      if (!event.isSpecialCare) {
        event.notifyRange = 365; // 重置通知范围
      }
      event.updatedAt = Date.now();

      const putRequest = store.put(event);
      putRequest.onsuccess = () => resolve(event);
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// ==================== 通知记录 ====================

/**
 * 检查某个事件在某天是否已经发送过通知
 */
function hasNotified(eventId, daysCount) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NOTIFICATIONS], 'readonly');
    const store = transaction.objectStore(STORE_NOTIFICATIONS);
    const notifId = `${eventId}_${daysCount}`;
    const request = store.get(notifId);

    request.onsuccess = () => resolve(!!request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 记录通知已发送
 */
function recordNotification(eventId, daysCount, eventName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NOTIFICATIONS], 'readwrite');
    const store = transaction.objectStore(STORE_NOTIFICATIONS);
    const notifId = `${eventId}_${daysCount}`;

    const record = {
      id: notifId,
      eventId: eventId,
      eventName: eventName,
      daysCount: daysCount,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
    };

    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 清理旧通知记录（可选，保持数据库干净）
 */
function cleanOldNotifications() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NOTIFICATIONS], 'readwrite');
    const store = transaction.objectStore(STORE_NOTIFICATIONS);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
