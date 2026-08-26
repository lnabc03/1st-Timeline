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

export interface ParsedMultiDate {
	/** 同一行解析出的多个日期（≥2，已按时间戳去重） */
	dates: ParsedDateTime[];
	content: string;
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

/** 多日期分隔符：中英文逗号、中文顿号、汉字「和」「及」，可混用 */
const MULTI_DATE_SEP_REGEX = /^[,，、和及]\s*/;

interface DatePrefixMatch {
	/** 补全年份后的完整日期串（可交给 parseDateTime 解析） */
	full: string;
	/** 在原串中消耗的长度 */
	len: number;
	year: number;
}

/**
 * 在字符串开头匹配一个日期（时间）前缀，长格式优先：
 * YYYY-M-D_HH:MM → YYYY年M月D日[时间词] → YYYY-M-D；
 * inheritYear 非空时还接受省略年份的
 * M月D日[时间词] / M-D_HH:MM / M-D。
 * 时间词表与 parseDateTime 共用 TIME_PERIOD_MAP。
 */
const TIME_WORD_ALT = Object.keys(TIME_PERIOD_MAP).join('|');
const CHINESE_FULL_PREFIX_REGEX = new RegExp(
	`^(\\d{4})年(\\d{1,2})月(\\d{1,2})日(?:${TIME_WORD_ALT})?`
);
const CHINESE_SHORT_PREFIX_REGEX = new RegExp(
	`^(\\d{1,2})月(\\d{1,2})日(?:${TIME_WORD_ALT})?`
);

function matchDatePrefix(
	s: string,
	inheritYear: number | null
): DatePrefixMatch | null {
	// YYYY-MM-DD_HH:MM 精确时间
	let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(_\d{1,2}:\d{1,2})/);
	if (m) {
		return {
			full: `${m[1]}-${m[2]}-${m[3]}${m[4]}`,
			len: m[0].length,
			year: Number(m[1]),
		};
	}
	// YYYY年M月D日[时间词]
	m = s.match(CHINESE_FULL_PREFIX_REGEX);
	if (m) {
		return { full: m[0], len: m[0].length, year: Number(m[1]) };
	}
	// YYYY-MM-DD
	m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?!_)/);
	if (m) {
		return {
			full: `${m[1]}-${m[2]}-${m[3]}`,
			len: m[0].length,
			year: Number(m[1]),
		};
	}
	if (inheritYear !== null) {
		// M月D日[时间词]
		m = s.match(CHINESE_SHORT_PREFIX_REGEX);
		if (m) {
			return {
				full: `${inheritYear}年${m[0]}`,
				len: m[0].length,
				year: inheritYear,
			};
		}
		// M-D_HH:MM 精确时间
		m = s.match(/^(\d{1,2})-(\d{1,2})(_\d{1,2}:\d{1,2})/);
		if (m) {
			return {
				full: `${inheritYear}-${m[1]}-${m[2]}${m[3]}`,
				len: m[0].length,
				year: inheritYear,
			};
		}
		// M-D
		m = s.match(/^(\d{1,2})-(\d{1,2})(?!\d)/);
		if (m) {
			return {
				full: `${inheritYear}-${m[1]}-${m[2]}`,
				len: m[0].length,
				year: inheritYear,
			};
		}
	}
	return null;
}

/**
 * 解析多日期语法：日期1<分隔>日期2[<分隔>日期3…]<内容分隔符>内容
 * 分隔符支持 , ， 、 和 及（可混用）；
 * 支持纯日期（YYYY-M-D / YYYY年M月D日）、精确时间（_HH:MM）
 * 和中文时间词（早上/上午/中午/下午/晚上）；
 * 第二个及以后的日期可省略年份（与第一个日期同年）；
 * 日期列表独占一行时，后续行作为共同的多行内容。
 * 不足以构成多日期（<2 个日期时间）或语法不合法时返回 null。
 */
export function parseMultiDateLine(line: string): ParsedMultiDate | null {
	const first = matchDatePrefix(line, null);
	if (!first) return null;

	const dates: ParsedDateTime[] = [];
	const seen = new Set<number>();
	const pushDate = (full: string): boolean => {
		const parsed = parseDateTime(full);
		if (!parsed) return false;
		if (!seen.has(parsed.date.getTime())) {
			dates.push(parsed);
			seen.add(parsed.date.getTime());
		}
		return true;
	};

	if (!pushDate(first.full)) return null;
	let rest = line.slice(first.len);

	while (true) {
		const afterWs = rest.replace(/^\s+/, '');
		const sep = afterWs.match(MULTI_DATE_SEP_REGEX);
		if (!sep) break;
		const afterSep = afterWs.slice(sep[0].length);
		const next = matchDatePrefix(afterSep, first.year);
		// 分隔符后必须是日期，否则整行不符合多日期语法
		if (!next || !pushDate(next.full)) return null;
		rest = afterSep.slice(next.len);
	}

	if (dates.length < 2) return null;

	// 日期列表之后：行尾（多行内容模式），或内容分隔符（冒号 / 两个空格）
	if (rest.trim() === '') {
		return { dates, content: '' };
	}
	const contentMatch = rest.match(/^\s*(?: {2,}|[:：])\s*([\s\S]*)$/);
	if (!contentMatch) return null;
	return { dates, content: contentMatch[1]!.trim() };
}
