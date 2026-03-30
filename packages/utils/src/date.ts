/**
 * Format a Date object into an ISO 8601 string (UTC).
 *
 * @param date - The date to format
 * @returns ISO 8601 formatted date string
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Format a Date object into a human-readable string.
 *
 * @param date - The date to format
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions,
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
}

/**
 * Convert a Date to a specific timezone and return the formatted string.
 *
 * @param date - The date to convert
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York', 'Europe/London')
 * @param locale - The locale for formatting (default: 'en-US')
 * @returns Formatted date string in the specified timezone
 */
export function formatInTimezone(
  date: Date,
  timezone: string,
  locale: string = 'en-US',
): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  }).format(date);
}

/**
 * Get the current time in a specific timezone as a Date-like object.
 * Returns the local date/time components for the given timezone.
 *
 * @param timezone - IANA timezone identifier
 * @returns Object with date/time components in the specified timezone
 */
export function getTimeInTimezone(timezone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dayOfWeek: number;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '0';

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
    dayOfWeek: weekdayMap[get('weekday')] ?? 0,
  };
}

/**
 * Check if a given time falls within business hours.
 * Useful for determining if a company is currently available.
 *
 * @param timezone - IANA timezone identifier for the company
 * @param schedule - Array of schedule entries with dayOfWeek, startTime, endTime
 * @returns Whether the current time is within business hours
 */
export function isWithinBusinessHours(
  timezone: string,
  schedule: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>,
): boolean {
  const now = getTimeInTimezone(timezone);

  const todaySchedule = schedule.find(
    (s) => s.dayOfWeek === now.dayOfWeek && s.isActive,
  );

  if (!todaySchedule) {
    return false;
  }

  const currentTimeStr = `${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}`;

  return currentTimeStr >= todaySchedule.startTime && currentTimeStr < todaySchedule.endTime;
}

/**
 * Calculate the difference between two dates in various units.
 *
 * @param start - The start date
 * @param end - The end date
 * @returns Object with differences in various units
 */
export function dateDiff(
  start: Date,
  end: Date,
): {
  milliseconds: number;
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
} {
  const ms = end.getTime() - start.getTime();
  return {
    milliseconds: ms,
    seconds: Math.floor(ms / 1000),
    minutes: Math.floor(ms / (1000 * 60)),
    hours: Math.floor(ms / (1000 * 60 * 60)),
    days: Math.floor(ms / (1000 * 60 * 60 * 24)),
  };
}

/**
 * Get a relative time description (e.g., "2 hours ago", "in 3 days").
 *
 * @param date - The date to describe relative to now
 * @param locale - The locale for formatting (default: 'en-US')
 * @returns Relative time string
 */
export function relativeTime(date: Date, locale: string = 'en-US'): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const absDiff = Math.abs(diff);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (absDiff < 60_000) {
    return rtf.format(Math.round(diff / 1000), 'second');
  } else if (absDiff < 3_600_000) {
    return rtf.format(Math.round(diff / 60_000), 'minute');
  } else if (absDiff < 86_400_000) {
    return rtf.format(Math.round(diff / 3_600_000), 'hour');
  } else if (absDiff < 2_592_000_000) {
    return rtf.format(Math.round(diff / 86_400_000), 'day');
  } else if (absDiff < 31_536_000_000) {
    return rtf.format(Math.round(diff / 2_592_000_000), 'month');
  } else {
    return rtf.format(Math.round(diff / 31_536_000_000), 'year');
  }
}
