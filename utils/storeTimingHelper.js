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

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
};

export const format12Hour = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr;

  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 hour is 12 AM
  const mFormatted = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mFormatted} ${ampm}`;
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

  // Emergency Closure Override
  if (isEmergencyClosed) {
    return {
      isOpen: false,
      isEmergencyClosed: true,
      closureReason,
      statusMessage: `Closed: ${closureReason}`,
      currentDay: DAYS[new Date().getDay()],
      todayHours: weeklyHours[DAYS[new Date().getDay()]] || defaultWeeklyHours.monday,
      nextOpenTime: null,
      weeklyHours
    };
  }

  const now = new Date();
  const dayIndex = now.getDay(); // 0 = Sunday, 1 = Monday...
  const currentDayKey = DAYS[dayIndex];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayConfig = weeklyHours[currentDayKey] || defaultWeeklyHours.monday;
  const todayOpenMinutes = parseTimeToMinutes(todayConfig.openTime);
  const todayCloseMinutes = parseTimeToMinutes(todayConfig.closeTime);

  // Function to find next open day starting from day offset (1 = tomorrow, 2 = day after tomorrow...)
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

  // Case 1: Closed Today
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

  // Case 2: Before Opening Time Today
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

  // Case 3: After Closing Time Today
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

  // Case 4: Currently Open!
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
