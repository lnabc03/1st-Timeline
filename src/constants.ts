/** 颜色预设 */
export const COLOR_PRESETS = [
	{ name: '蓝色', value: '#5588cc' },
	{ name: '绿色', value: '#50C878' },
	{ name: '紫色', value: '#9370DB' },
	{ name: '红色', value: '#FF6B6B' },
	{ name: '橙色', value: '#FF8C42' },
] as const;

/** 单行语法解析：<日期><分隔符><内容> */
export const SINGLE_LINE_REGEX = /^([\w\s\-_.:一-龥]+)( {2}|：|:)(.*)$/;

/** YYYY-MM-DD_HH:MM 精确时间 */
export const PRECISE_DATE_REGEX = /^(\d{4}-\d{1,2}-\d{1,2})_(\d{1,2}:\d{1,2})/;

/** YYYY年MM月DD日[时间词] */
export const CHINESE_DATE_REGEX = /^(\d{4})年(\d{1,2})月(\d{1,2})日(.*)$/;

/** YYYY-MM-DD */
export const ISO_DATE_REGEX = /^\d{4}-\d{1,2}-\d{1,2}$/;

/** YYYY年MM月DD日（无时间词） */
export const CHINESE_DATE_ONLY_REGEX = /^(\d{4})年(\d{1,2})月(\d{1,2})日$/;

/** 日期范围验证 */
export const DATE_RANGE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** 中文时间词 → 小时数映射 */
export const TIME_PERIOD_MAP: Record<string, number> = {
	早上: 7,
	上午: 10,
	中午: 12,
	下午: 15,
	晚上: 20,
};
