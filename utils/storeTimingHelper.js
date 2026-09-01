const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday'
};

/**
 * Parses time string (24h or 12h format e.g. '08:00', '20:00', '8:00 AM', '8:00 PM')
 * into total minutes from midnight (0..1439).
 */
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const cleaned = timeStr.trim();
  const isPM = /pm/i.test(cleaned);
  const isAM = /am/i.test(cleaned);

  const parts = cleaned.replace(/(am|pm)/i, '').trim().split(':');
  let h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  return h * 60 + m;
};

export const format12Hour = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const minutes = parseTimeToMinutes(timeStr);
  let h = Math.floor(minutes / 60);
  const m = minutes % 60;

  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 hour is 12 AM
  const mFormatted = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mFormatted} ${ampm}`;
};

/**
 * Helper to get the current day key and current minutes from midnight
 * in the store's target timezone (default: Asia/Kolkata).
 */
const getStoreNowInfo = (timeZone = 'Asia/Kolkata') => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    let weekdayStr = '';
    let hour = 0;
    let minute = 0;

    for (const part of parts) {
      if (part.type === 'weekday') weekdayStr = part.value.toLowerCase();
      if (part.type === 'hour') hour = parseInt(part.value, 10);
      if (part.type === 'minute') minute = parseInt(part.value, 10);
    }

    if (hour === 24) hour = 0;

    const currentDayKey = DAYS.includes(weekdayStr) ? weekdayStr : DAYS[now.getDay()];
    const currentMinutes = hour * 60 + minute;
    const dayIndex = DAYS.indexOf(currentDayKey);

    return { currentDayKey, currentMinutes, dayIndex };
  } catch (err) {
    const now = new Date();
    const dayIndex = now.getDay();
    return {
      currentDayKey: DAYS[dayIndex],
      currentMinutes: now.getHours() * 60 + now.getMinutes(),
      dayIndex
    };
  }
};

/**
 * Evaluates whether the store is currently open or closed based on system settings.
 * Returns evaluated status, user-friendly message, and next opening time info.
 */
export const evaluateStoreStatus = (settings) => {
  const defaultWeeklyHours = {
    monday: { isClosed: false, openTime: '08:00', closeTime: '22:00' },
    tuesday: { isClosed: false, openTime: '08:00', closeTime: '22:00' },
    wednesday: { isClosed: false, openTime: '08:00', closeTime: '22:00' },
    thursday: { isClosed: false, openTime: '08:00', closeTime: '22:00' },
    friday: { isClosed: false, openTime: '08:00', closeTime: '22:00' },
    saturday: { isClosed: false, openTime: '08:00', closeTime: '22:00' },
    sunday: { isClosed: false, openTime: '08:00', closeTime: '22:00' },
  };

  const storeTimings = settings?.storeTimings || {
    isEmergencyClosed: false,
    closureReason: 'Store is temporarily closed for maintenance',
    weeklyHours: defaultWeeklyHours
  };

  const isEmergencyClosed = !!storeTimings.isEmergencyClosed;
  const closureReason = storeTimings.closureReason || 'Store is temporarily closed for maintenance';
  const rawWeeklyHours = storeTimings.weeklyHours
    ? (typeof storeTimings.weeklyHours.toObject === 'function' ? storeTimings.weeklyHours.toObject() : storeTimings.weeklyHours)
    : {};

  const weeklyHours = {};
  for (const day of Object.keys(defaultWeeklyHours)) {
    weeklyHours[day] = {
      ...defaultWeeklyHours[day],
      ...(rawWeeklyHours[day] || {})
    };
  }

  const { currentDayKey, currentMinutes, dayIndex } = getStoreNowInfo('Asia/Kolkata');
  const todayConfig = weeklyHours[currentDayKey] || defaultWeeklyHours.monday;

  // Emergency Closure Override
  if (isEmergencyClosed) {
    return {
      isOpen: false,
      isEmergencyClosed: true,
      closureReason,
      statusMessage: `Closed: ${closureReason}`,
      currentDay: currentDayKey,
      todayHours: todayConfig,
      nextOpenTime: null,
      weeklyHours
    };
  }

  const todayOpenMinutes = parseTimeToMinutes(todayConfig.openTime);
  const todayCloseMinutes = parseTimeToMinutes(todayConfig.closeTime);

  // Function to find next open day starting from day offset
  const findNextOpenDay = (startOffset = 1) => {
    for (let offset = startOffset; offset <= 7; offset++) {
      const targetIndex = (dayIndex + offset) % 7;
      const targetDayKey = DAYS[targetIndex];
      const targetConfig = weeklyHours[targetDayKey];
      if (targetConfig && !targetConfig.isClosed) {
        return {
          dayKey: targetDayKey,
          dayLabel: offset === 1 ? 'Tomorrow' : DAY_LABELS[targetDayKey],
          openTime: targetConfig.openTime,
          formattedOpenTime: format12Hour(targetConfig.openTime)
        };
      }
    }
    return null;
  };

  // Case 1: Store marked closed for current day
  if (todayConfig.isClosed) {
    const nextOpen = findNextOpenDay(1);
    return {
      isOpen: false,
      isEmergencyClosed: false,
      closureReason: null,
      statusMessage: nextOpen
        ? `Store is closed today. Reopens ${nextOpen.dayLabel} at ${nextOpen.formattedOpenTime}`
        : 'Store is currently closed',
      currentDay: currentDayKey,
      todayHours: todayConfig,
      nextOpenTime: nextOpen ? `${nextOpen.dayLabel} at ${nextOpen.formattedOpenTime}` : null,
      weeklyHours
    };
  }

  // Case 2: Same-day operating hours (e.g. 08:00 to 22:00)
  if (todayOpenMinutes < todayCloseMinutes) {
    if (currentMinutes < todayOpenMinutes) {
      const formattedTodayOpen = format12Hour(todayConfig.openTime);
      return {
        isOpen: false,
        isEmergencyClosed: false,
        closureReason: null,
        statusMessage: `Store is currently closed. Opens today at ${formattedTodayOpen}`,
        currentDay: currentDayKey,
        todayHours: todayConfig,
        nextOpenTime: `Today at ${formattedTodayOpen}`,
        weeklyHours
      };
    }

    if (currentMinutes >= todayCloseMinutes) {
      const nextOpen = findNextOpenDay(1);
      return {
        isOpen: false,
        isEmergencyClosed: false,
        closureReason: null,
        statusMessage: nextOpen
          ? `Store is currently closed. Opens ${nextOpen.dayLabel} at ${nextOpen.formattedOpenTime}`
          : 'Store is currently closed for the day',
        currentDay: currentDayKey,
        todayHours: todayConfig,
        nextOpenTime: nextOpen ? `${nextOpen.dayLabel} at ${nextOpen.formattedOpenTime}` : null,
        weeklyHours
      };
    }
  } else {
    // Case 3: Overnight operating hours (e.g. 20:00 to 04:00 next morning)
    const isCurrentlyOpenOvernight = currentMinutes >= todayOpenMinutes || currentMinutes < todayCloseMinutes;
    if (!isCurrentlyOpenOvernight) {
      const formattedTodayOpen = format12Hour(todayConfig.openTime);
      return {
        isOpen: false,
        isEmergencyClosed: false,
        closureReason: null,
        statusMessage: `Store is currently closed. Opens today at ${formattedTodayOpen}`,
        currentDay: currentDayKey,
        todayHours: todayConfig,
        nextOpenTime: `Today at ${formattedTodayOpen}`,
        weeklyHours
      };
    }
  }

  // Currently Open!
  const formattedClose = format12Hour(todayConfig.closeTime);
  return {
    isOpen: true,
    isEmergencyClosed: false,
    closureReason: null,
    statusMessage: `Store is Open (Closes today at ${formattedClose})`,
    currentDay: currentDayKey,
    todayHours: todayConfig,
    nextOpenTime: null,
    weeklyHours
  };
};
