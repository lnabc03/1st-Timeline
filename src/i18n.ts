import { getLanguage } from 'obsidian';

/**
 * Locale interface defining all user-facing strings in the plugin.
 * Template strings (with dynamic values) are functions.
 */
export interface Locale {
	// Settings tab
	headingFirstTimeline: string;
	sortDirection: string;
	sortDirectionDesc: string;
	sortDirectionAscLabel: string;
	sortDirectionDescLabel: string;
	datePropertyForNotes: string;
	datePropertyDesc: string;
	restoreDefault: string;
	noticeDefaultRestored: string;
	timelineColor: string;
	timelineColorDesc: string;
	noticeSetToTheme: (name: string) => string;
	hoverTooltip: string;
	hoverTooltipDesc: string;
	hoverDelay: string;
	hoverDelayDesc: string;
	noticeHoverDelayRestored: string;
	highlightToday: string;
	highlightTodayDesc: string;
	dotSize: string;
	dotSizeDesc: string;
	noticeDotSizeRestored: string;
	lineWidth: string;
	lineWidthDesc: string;
	noticeLineWidthRestored: string;
	eventSpacing: string;
	eventSpacingDesc: string;
	noticeEventSpacingRestored: string;
	autoCollapse: string;
	autoCollapseDesc: string;
	collapseThreshold: string;
	collapseThresholdDesc: string;
	noticeCollapseThresholdRestored: string;
	showWhenCollapsed: string;
	showWhenCollapsedDesc: string;
	noticeShowCountRestored: string;

	// Command
	commandNotesSummary: string;
	commandArchivePastEvents: string;

	// Timeline error messages
	timelineParseError: string;
	noValidEvents: string;
	syntaxColon: string;
	syntaxTwoSpaces: string;
	syntaxMultiline: string;

	// Timeline source directive errors
	sourceFileNotFound: (link: string) => string;
	sourceNoTimelineBlock: (file: string) => string;

	// Timeline tooltips
	tooltipToday: string;
	tooltipDaysFromNow: (days: number) => string;
	tooltipDaysAgo: (days: number) => string;

	// Today badge
	todayLabel: string;

	// Collapse button
	collapseShowAll: (count: number) => string;
	collapseCollapse: string;

	// Notes summary modal
	modalTitle: string;
	modalDateRangePrompt: string;
	modalTimelineNote: (field: string) => string;
	modalCancel: string;
	modalConfirm: string;
	noticeInvalidDateRange: string;
	noticeInvalidDateFormat: string;
	noticeTimelineGenerated: string;
	noticeNoEditor: string;
	noticeNoNotesFound: string;
	errorGeneratingSummary: (message: string) => string;

	// Archive past events command
	archiveHeader: string;
	noticeArchived: (count: number) => string;
	noticeNoPastEvents: string;
	noticeNoActiveFile: string;
}

/** English locale */
const EN: Locale = {
	headingFirstTimeline: 'First timeline',
	sortDirection: 'Sort direction',
	sortDirectionDesc: 'Sort order for timeline events',
	sortDirectionAscLabel: 'Ascending (earliest first)',
	sortDirectionDescLabel: 'Descending (latest first)',
	datePropertyForNotes: 'Date property for notes summary',
	datePropertyDesc: 'Frontmatter property containing a date (yyyy-mm-dd)',
	restoreDefault: 'Restore default',
	noticeDefaultRestored: 'Default property name restored',
	timelineColor: 'Timeline color',
	timelineColorDesc: 'Color of the timeline line and dots',
	noticeSetToTheme: (name: string) => `Set to ${name} theme`,
	hoverTooltip: 'Hover tooltip',
	hoverTooltipDesc: 'Show days until or since on hover',
	hoverDelay: 'Hover delay',
	hoverDelayDesc: 'Delay before the tooltip appears (milliseconds)',
	noticeHoverDelayRestored: 'Default hover delay restored',
	highlightToday: 'Highlight today',
	highlightTodayDesc: 'Highlight events on the current day',
	dotSize: 'Dot size',
	dotSizeDesc: 'Size of timeline dots',
	noticeDotSizeRestored: 'Default dot size restored',
	lineWidth: 'Line width',
	lineWidthDesc: 'Width of the timeline line',
	noticeLineWidthRestored: 'Default line width restored',
	eventSpacing: 'Event spacing',
	eventSpacingDesc: 'Spacing between timeline events',
	noticeEventSpacingRestored: 'Default event spacing restored',
	autoCollapse: 'Auto collapse',
	autoCollapseDesc:
		'Auto-collapse timeline when events exceed threshold, showing only events closest to today',
	collapseThreshold: 'Collapse threshold',
	collapseThresholdDesc: 'Number of events that triggers auto-collapse',
	noticeCollapseThresholdRestored: 'Default collapse threshold restored',
	showWhenCollapsed: 'Show when collapsed',
	showWhenCollapsedDesc: 'Number of events to show when collapsed',
	noticeShowCountRestored: 'Default show count restored',

	commandNotesSummary: 'Notes summary',
	commandArchivePastEvents: 'Archive past events',

	timelineParseError: 'Timeline parse error',
	noValidEvents: 'No valid events could be parsed. Check the syntax:',
	syntaxColon: 'Date: content (colon separator)',
	syntaxTwoSpaces: 'Date  content (two spaces separator)',
	syntaxMultiline: 'Date (followed by newline and multi-line content)',

	sourceFileNotFound: (link: string) => `File not found: ${link}`,
	sourceNoTimelineBlock: (file: string) =>
		`No timeline code block found in: ${file}`,

	tooltipToday: 'Today',
	tooltipDaysFromNow: (days: number) => `${days} days from now`,
	tooltipDaysAgo: (days: number) => `${days} days ago`,

	todayLabel: 'Today',

	collapseShowAll: (count: number) => `Show all (+${count})`,
	collapseCollapse: 'Collapse',

	modalTitle: 'Notes summary',
	modalDateRangePrompt: 'Enter a date range (YYYY-MM-DD,YYYY-MM-DD)',
	modalTimelineNote: (field: string) =>
		`Timeline will summarize notes by the property "${field}"`,
	modalCancel: 'Cancel',
	modalConfirm: 'Confirm',
	noticeInvalidDateRange:
		'Invalid date range. Use the format yyyy-mm-dd,yyyy-mm-dd',
	noticeInvalidDateFormat: 'Invalid date format. Use yyyy-mm-dd',
	noticeTimelineGenerated: 'Notes timeline generated',
	noticeNoEditor:
		'Unable to insert timeline. Make sure an editor is open.',
	noticeNoNotesFound: 'No notes found in the selected date range.',
	errorGeneratingSummary: (message: string) =>
		`Error generating notes summary: ${message}`,

	archiveHeader: 'Archived:',
	noticeArchived: (count: number) => `Archived ${count} past events`,
	noticeNoPastEvents: 'No past events to archive.',
	noticeNoActiveFile: 'No active Markdown file.',
};

/** Chinese locale */
const ZH: Locale = {
	headingFirstTimeline: '1st Timeline',
	sortDirection: '排序方向',
	sortDirectionDesc: '时间轴事件的排列顺序',
	sortDirectionAscLabel: '升序（最早在前）',
	sortDirectionDescLabel: '降序（最新在前）',
	datePropertyForNotes: '笔记日期属性',
	datePropertyDesc: '包含日期的 frontmatter 属性名（yyyy-mm-dd）',
	restoreDefault: '恢复默认',
	noticeDefaultRestored: '已恢复默认属性名',
	timelineColor: '时间轴颜色',
	timelineColorDesc: '时间轴线条和点的颜色',
	noticeSetToTheme: (name: string) => `已设置为${name}主题`,
	hoverTooltip: '悬停提示框',
	hoverTooltipDesc: '悬停时显示距今天数',
	hoverDelay: '悬停延迟',
	hoverDelayDesc: '提示框出现前的等待时间（毫秒）',
	noticeHoverDelayRestored: '已恢复默认悬停延迟',
	highlightToday: '当天事件高亮',
	highlightTodayDesc: '高亮显示当天的事件',
	dotSize: '时间点大小',
	dotSizeDesc: '时间轴上点的大小',
	noticeDotSizeRestored: '已恢复默认点大小',
	lineWidth: '线条宽度',
	lineWidthDesc: '时间轴竖线的宽度',
	noticeLineWidthRestored: '已恢复默认线宽',
	eventSpacing: '事件间距',
	eventSpacingDesc: '事件卡片之间的间距',
	noticeEventSpacingRestored: '已恢复默认事件间距',
	autoCollapse: '自动折叠',
	autoCollapseDesc:
		'事件数量超过阈值时自动折叠，仅显示距今天最近的事件',
	collapseThreshold: '折叠阈值',
	collapseThresholdDesc: '触发自动折叠的事件数量',
	noticeCollapseThresholdRestored: '已恢复默认折叠阈值',
	showWhenCollapsed: '折叠时显示数量',
	showWhenCollapsedDesc: '折叠后显示的事件数量',
	noticeShowCountRestored: '已恢复默认显示数量',

	commandNotesSummary: '笔记汇总',
	commandArchivePastEvents: '归档过期事件',

	timelineParseError: '时间轴解析错误',
	noValidEvents: '无法解析任何有效事件。请检查语法：',
	syntaxColon: '日期：内容（冒号分隔）',
	syntaxTwoSpaces: '日期  内容（两个空格分隔）',
	syntaxMultiline: '日期（独占一行，后续行为事件内容）',

	sourceFileNotFound: (link: string) => `找不到文件：${link}`,
	sourceNoTimelineBlock: (file: string) =>
		`文件中没有 timeline 代码块：${file}`,

	tooltipToday: '今天',
	tooltipDaysFromNow: (days: number) => `${days} 天后`,
	tooltipDaysAgo: (days: number) => `${days} 天前`,

	todayLabel: '今天',

	collapseShowAll: (count: number) => `显示全部 (+${count})`,
	collapseCollapse: '折叠',

	modalTitle: '笔记汇总',
	modalDateRangePrompt: '输入日期范围（YYYY-MM-DD,YYYY-MM-DD）',
	modalTimelineNote: (field: string) =>
		`将根据笔记属性 "${field}" 汇总时间轴`,
	modalCancel: '取消',
	modalConfirm: '确认',
	noticeInvalidDateRange: '日期范围格式无效。请使用 yyyy-mm-dd,yyyy-mm-dd 格式',
	noticeInvalidDateFormat: '日期格式无效。请使用 yyyy-mm-dd',
	noticeTimelineGenerated: '笔记时间轴已生成',
	noticeNoEditor: '无法插入时间轴。请确保编辑器已打开。',
	noticeNoNotesFound: '在所选日期范围内未找到笔记。',
	errorGeneratingSummary: (message: string) =>
		`生成笔记汇总时出错：${message}`,

	archiveHeader: '已归档：',
	noticeArchived: (count: number) => `已归档 ${count} 个过期事件`,
	noticeNoPastEvents: '没有需要归档的过期事件。',
	noticeNoActiveFile: '没有打开的 Markdown 文件。',
};

/**
 * Returns the current locale based on Obsidian's language setting.
 * Returns ZH for Chinese, EN for everything else.
 */
export function t(): Locale {
	const lang = getLanguage();
	return lang.startsWith('zh') ? ZH : EN;
}
