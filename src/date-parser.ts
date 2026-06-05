import {
	CHINESE_DATE_ONLY_REGEX,
	CHINESE_DATE_REGEX,
	ISO_DATE_REGEX,
	PRECISE_DATE_REGEX,
	TIME_PERIOD_MAP,
} from './constants';

export interface ParsedDateTime {
	date: Date;
	display: string;
}

/**
 * 解析日期时间字符串，按优先级匹配：
 * 1. YYYY-MM-DD_HH:MM（精确时间）
 * 2. YYYY年MM月DD日[时间词]（中文日期+时间词）
 * 3. YYYY-MM-DD
 * 4. YYYY年MM月DD日
 */
export function parseDateTime(dateTimeStr: string): ParsedDateTime | null {
	let date: Date | null = null;
	const displayStr = dateTimeStr.trim();

	// 优先级 1: YYYY-MM-DD_HH:MM
	const preciseMatch = displayStr.match(PRECISE_DATE_REGEX);
	if (preciseMatch) {
		const [, dateStr, timeStr] = preciseMatch;
		const [year, month, day] = dateStr!.split('-').map(Number);
		const [hour, minute] = timeStr!.split(':').map(Number);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		date = new Date(year!, month! - 1, day!, hour!, minute!);
		return { date, display: `${dateStr}_${timeStr}` };
	}

	// 优先级 2: YYYY年MM月DD日[时间词]
	const chineseMatch = displayStr.match(CHINESE_DATE_REGEX);
	if (chineseMatch) {
		const [, year, month, day, timePeriod] = chineseMatch;
		date = new Date(Number(year), Number(month) - 1, Number(day));
		const timePart = timePeriod!.trim();
		if (timePart) {
			for (const [keyword, hour] of Object.entries(TIME_PERIOD_MAP)) {
				if (timePart.includes(keyword)) {
					date.setHours(hour);
					break;
				}
			}
		}
		return { date, display: displayStr };
	}

	// 优先级 3: YYYY-MM-DD
	if (ISO_DATE_REGEX.test(displayStr)) {
		const [year, month, day] = displayStr.split('-').map(Number);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		date = new Date(year!, month! - 1, day!);
		return { date, display: displayStr };
	}

	// 优先级 4: YYYY年MM月DD日
	const chineseOnlyMatch = displayStr.match(CHINESE_DATE_ONLY_REGEX);
	if (chineseOnlyMatch) {
		const [, year, month, day] = chineseOnlyMatch;
		date = new Date(Number(year), Number(month) - 1, Number(day));
		return { date, display: displayStr };
	}

	return null;
}
