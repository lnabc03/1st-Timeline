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

export interface ParsedDateRange {
	start: Date;
	end: Date;
	/** 规范化显示：YYYY-MM-DD ~ YYYY-MM-DD */
	display: string;
	title: string;
}

/** 格式化为 YYYY-MM-DD */
export function formatISODate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
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
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- noUncheckedIndexedAccess requires non-null assertions on destructured array elements
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
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- noUncheckedIndexedAccess requires non-null assertions on destructured array elements
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

/**
 * 仅解析纯日期（YYYY-MM-DD 或 YYYY年MM月DD日），不接受时间部分
 */
export function parsePureDate(dateStr: string): Date | null {
	const s = dateStr.trim();
	if (ISO_DATE_REGEX.test(s)) {
		const [year, month, day] = s.split('-').map(Number);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- noUncheckedIndexedAccess requires non-null assertions on destructured array elements
		return new Date(year!, month! - 1, day!);
	}
	const chineseMatch = s.match(CHINESE_DATE_ONLY_REGEX);
	if (chineseMatch) {
		const [, year, month, day] = chineseMatch;
		return new Date(Number(year), Number(month) - 1, Number(day));
	}
	return null;
}

/**
 * 解析时间段语法：日期A<～|~|至|到>日期B[：内容]
 * 起止日期仅接受纯日期；A > B 时自动交换；
 * A = B 时由调用方退化为普通时间点事件。
 */
export function parseDateRangeLine(line: string): ParsedDateRange | null {
	const rangeMatch = line.match(/^(.+?)\s*[～~至到]\s*(.+)$/);
	if (!rangeMatch) return null;

	const start = parsePureDate(rangeMatch[1]!);
	if (!start) return null;

	const rest = rangeMatch[2]!;
	let end: Date | null = null;
	let title = '';

	// <结束日期><分隔符><内容>，分隔符为冒号或两个空格
	const contentMatch = rest.match(/^(.+?)(?:\s*[:：]\s*| {2})([\s\S]*)$/);
	if (contentMatch) {
		end = parsePureDate(contentMatch[1]!);
		if (end) title = contentMatch[2]!.trim();
	}
	// 无内容：整段即为结束日期
	if (!end) {
		end = parsePureDate(rest);
		if (!end) return null;
	}

	if (start.getTime() > end.getTime()) {
		return {
			start: end,
			end: start,
			display: `${formatISODate(end)} ~ ${formatISODate(start)}`,
			title,
		};
	}
	return {
		start,
		end,
		display: `${formatISODate(start)} ~ ${formatISODate(end)}`,
		title,
	};
}
