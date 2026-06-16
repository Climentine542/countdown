/**
 * 倒计时 - 农历转换模块
 * 基于 1900-2100 年农历数据表
 * 参考算法: 香港天文台农历数据
 */

// ==================== 农历数据表 ====================
// 每年一个16进制数，共201年 (1900-2100)
// 编码规则:
//   bit 0-3:   闰月月份 (0 = 无闰月)
//   bit 4-15:  1-12月的大小月 (1=30天, 0=29天)
//   bit 16-19: 闰月大小 (bit 16: 1=30天, 0=29天)
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
  0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, // 1970-1979
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, // 2050-2059
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, // 2060-2069
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, // 2070-2079
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, // 2080-2089
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252, // 2090-2099
  0x0d520, // 2100
];

const START_YEAR = 1900;

// 天干
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
// 地支
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 生肖
const SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

// ==================== 基础查询函数 ====================

/**
 * 获取农历年的闰月月份 (0 = 无闰月)
 */
function getLeapMonth(lunarYear) {
  const idx = lunarYear - START_YEAR;
  if (idx < 0 || idx >= LUNAR_INFO.length) return 0;
  return LUNAR_INFO[idx] & 0xf;
}

/**
 * 获取农历年某月的天数 (29 或 30)
 * @param {number} lunarYear - 农历年
 * @param {number} lunarMonth - 农历月 (1-12, 闰月用负数如 -6 表示闰六月)
 * @returns {number}
 */
function getLunarMonthDays(lunarYear, lunarMonth) {
  const idx = lunarYear - START_YEAR;
  if (idx < 0 || idx >= LUNAR_INFO.length) return 30;

  const leapMonth = getLeapMonth(lunarYear);
  const isLeap = (lunarMonth < 0);
  const actualMonth = Math.abs(lunarMonth);

  if (isLeap && actualMonth === leapMonth) {
    // 闰月天数
    return (LUNAR_INFO[idx] & 0x10000) ? 30 : 29;
  }

  // 非闰月天数 (bit 4 = 正月, bit 5 = 二月, ..., bit 15 = 十二月)
  const bitPos = 4 + actualMonth - 1;
  return (LUNAR_INFO[idx] & (1 << bitPos)) ? 30 : 29;
}

/**
 * 获取农历年的总天数
 */
function getLunarYearDays(lunarYear) {
  const idx = lunarYear - START_YEAR;
  if (idx < 0 || idx >= LUNAR_INFO.length) return 365;

  let sum = 0;
  // 12个普通月
  for (let m = 1; m <= 12; m++) {
    sum += getLunarMonthDays(lunarYear, m);
  }
  // 闰月
  const leap = getLeapMonth(lunarYear);
  if (leap > 0) {
    sum += (LUNAR_INFO[idx] & 0x10000) ? 30 : 29;
  }
  return sum;
}

// ==================== 公历 ↔ 农历 互转 ====================

/**
 * 公历转农历
 * @param {Date} solarDate
 * @returns {{ year: number, month: number, day: number, isLeap: boolean, yearName: string }}
 */
function solarToLunar(solarDate) {
  const baseDate = new Date(1900, 0, 31); // 1900-01-31 = 农历1900年正月初一
  let offset = Math.floor((solarDate - baseDate) / 86400000);

  // 找到农历年份
  let lunarYear = 1900;
  let yearDays = getLunarYearDays(lunarYear);
  while (offset >= yearDays) {
    offset -= yearDays;
    lunarYear++;
    yearDays = getLunarYearDays(lunarYear);
  }

  // 找到农历月份
  let lunarMonth = 1;
  let isLeap = false;
  const leapMonth = getLeapMonth(lunarYear);

  while (offset >= 0) {
    const monthDays = getLunarMonthDays(lunarYear, isLeap ? -lunarMonth : lunarMonth);
    if (offset < monthDays) break;
    offset -= monthDays;

    if (leapMonth > 0 && lunarMonth === leapMonth && !isLeap) {
      isLeap = true;
    } else {
      isLeap = false;
      lunarMonth++;
    }
  }

  const lunarDay = offset + 1;

  // 年份名称
  const yearName = GAN[(lunarYear - 4) % 10] + ZHI[(lunarYear - 4) % 12] + '年';

  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeap: isLeap,
    yearName: yearName,
  };
}

/**
 * 农历转公历
 * @param {number} lunarYear - 农历年
 * @param {number} lunarMonth - 农历月 (1-12)
 * @param {number} lunarDay - 农历日
 * @param {boolean} isLeap - 是否为闰月
 * @returns {Date|null}
 */
function lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeap) {
  const idx = lunarYear - START_YEAR;
  if (idx < 0 || idx >= LUNAR_INFO.length) return null;

  // 验证月份
  if (lunarMonth < 1 || lunarMonth > 12) return null;

  const leapMonth = getLeapMonth(lunarYear);
  if (isLeap && lunarMonth !== leapMonth) return null; // 该年这个月没有闰月

  // 验证日期
  const maxDay = getLunarMonthDays(lunarYear, isLeap ? -lunarMonth : lunarMonth);
  const validDay = Math.min(lunarDay, maxDay);

  // 从1900年正月初一开始累加天数
  const baseDate = new Date(1900, 0, 31);
  let totalDays = 0;

  // 累加到目标农历年
  for (let y = 1900; y < lunarYear; y++) {
    totalDays += getLunarYearDays(y);
  }

  // 累加到目标农历月
  let currentIsLeap = false;
  for (let m = 1; m < lunarMonth; m++) {
    totalDays += getLunarMonthDays(lunarYear, m);
    // 如果当前月是闰月，加上闰月天数
    if (m === leapMonth) {
      totalDays += getLunarMonthDays(lunarYear, -m); // 闰月
    }
  }

  // 如果目标月就是闰月，先加上平月天数
  if (isLeap) {
    totalDays += getLunarMonthDays(lunarYear, lunarMonth);
  }

  // 加上日期
  totalDays += validDay - 1;

  const result = new Date(baseDate);
  result.setDate(result.getDate() + totalDays);
  result.setHours(0, 0, 0, 0);
  return result;
}

// ==================== 倒计时专用 ====================

/**
 * 获取农历日期下一次出现的公历日期
 * 用于倒计时计算
 * @param {number} lunarMonth - 农历月 (1-12)
 * @param {number} lunarDay - 农历日 (1-30)
 * @returns {Date} 下一次该农历日期对应的公历日期
 */
function getNextLunarDate(lunarMonth, lunarDay) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 获取今天的农历日期
  const todayLunar = solarToLunar(today);
  const thisLunarYear = todayLunar.year;

  // 验证日期有效性
  const maxDay = getLunarMonthDays(thisLunarYear, lunarMonth);
  const validDay = Math.min(lunarDay, maxDay);

  // 尝试今年的农历对应日期（非闰月）
  let targetSolar = lunarToSolar(thisLunarYear, lunarMonth, validDay, false);

  // 如果今年该月有闰月，且目标日期在闰月之前，直接使用非闰月
  // 如果 targetSolar 在今天之前（或等于今天），需要往后找

  if (targetSolar && targetSolar.getTime() > today.getTime()) {
    // 今年的还没过
    return targetSolar;
  }

  // 检查今年的闰月版本（如果有闰月且目标在闰月之后）
  const leapMonth = getLeapMonth(thisLunarYear);
  if (leapMonth === lunarMonth) {
    const leapMaxDay = getLunarMonthDays(thisLunarYear, -lunarMonth);
    const leapValidDay = Math.min(lunarDay, leapMaxDay);
    const targetLeap = lunarToSolar(thisLunarYear, lunarMonth, leapValidDay, true);
    if (targetLeap && targetLeap.getTime() > today.getTime()) {
      return targetLeap;
    }
  }

  // 今年的已经过了，试明年
  const nextYear = thisLunarYear + 1;
  const nextMaxDay = getLunarMonthDays(nextYear, lunarMonth);
  const nextValidDay = Math.min(lunarDay, nextMaxDay);
  let nextTarget = lunarToSolar(nextYear, lunarMonth, nextValidDay, false);

  // 如果明年的非闰月仍在今天之前（极少情况），再往后一年
  if (!nextTarget || nextTarget.getTime() <= today.getTime()) {
    const year2 = nextYear + 1;
    const maxDay2 = getLunarMonthDays(year2, lunarMonth);
    const validDay2 = Math.min(lunarDay, maxDay2);
    nextTarget = lunarToSolar(year2, lunarMonth, validDay2, false);
  }

  return nextTarget || new Date(today.getFullYear() + 1, 0, 1);
}

/**
 * 计算距离农历日期还有多少天
 * @param {number} lunarMonth
 * @param {number} lunarDay
 * @returns {number}
 */
function getLunarCountdownDays(lunarMonth, lunarDay) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetSolar = getNextLunarDate(lunarMonth, lunarDay);
  const diffTime = targetSolar.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 格式化农历日期显示
 */
function formatLunarDate(month, day) {
  const lunarMonthNames = ['', '正月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '冬月', '腊月'];
  const lunarDayNames = ['', '初一', '初二', '初三', '初四', '初五', '初六',
    '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五',
    '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四',
    '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

  return `农历${lunarMonthNames[month]}${lunarDayNames[day]}`;
}
