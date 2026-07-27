import { Component, MarkdownRenderer, type MarkdownPostProcessorContext } from 'obsidian';
import type TimelinePlugin from './main';
import { SINGLE_LINE_REGEX } from './constants';
import { formatISODate, parseDateRangeLine, parseDateTime } from './date-parser';
import {
	findSourceDirective,
	loadSourceText,
	parseSourceDirective,
} from './timeline-source';
import { t } from './i18n';

interface TimelineEvent {
	date: Date;
	displayDate: string;
	originalDate: string;
	content: string;
}

interface TimelineRange {
	start: Date;
	end: Date;
	display: string;
	title: string;
}

/**
 * Parses timeline events from code block text.
 * Source directive lines are skipped, so nested directives in
 * referenced files are silently ignored.
 */
function parseEvents(source: string): {
	events: TimelineEvent[];
	ranges: TimelineRange[];
} {
	const events: TimelineEvent[] = [];
	const ranges: TimelineRange[] = [];
	const lines = source.split('\n');

	let currentEvent: TimelineEvent | null = null;
	let currentContent: string[] = [];

	const flushCurrentEvent = () => {
		if (currentEvent) {
			currentEvent.content = currentContent.join('\n').trim();
			if (currentEvent.content) {
				events.push(currentEvent);
			}
			currentEvent = null;
		}
	};

	for (const line of lines) {
		const trimmedLine = line.trim();

		if (trimmedLine === '') {
			if (currentEvent) {
				currentContent.push(line);
			}
			continue;
		}

		if (parseSourceDirective(trimmedLine) !== null) {
			continue;
		}

		// 时间段语法优先于单行语法（「至/到」可能被误认为中文时间词）
		const range = parseDateRangeLine(trimmedLine);
		if (range) {
			flushCurrentEvent();
			if (range.start.getTime() === range.end.getTime()) {
				// A = B：退化为普通时间点事件
				events.push({
					date: range.start,
					displayDate: formatISODate(range.start),
					originalDate: formatISODate(range.start),
					content: range.title,
				});
			} else {
				ranges.push(range);
			}
			continue;
		}

		let dateMatch = false;
		let dateTimeStr = '';
		let contentStr = '';

		const singleLineMatch = trimmedLine.match(SINGLE_LINE_REGEX);

		if (singleLineMatch) {
			const potentialDate = singleLineMatch[1]!.trim();
			if (parseDateTime(potentialDate)) {
				dateTimeStr = potentialDate;
				contentStr = singleLineMatch[3]!.trim();
				dateMatch = true;
			}
		}

		if (!dateMatch && parseDateTime(trimmedLine)) {
			dateTimeStr = trimmedLine;
			contentStr = '';
			dateMatch = true;
		}

		if (dateMatch) {
			flushCurrentEvent();

			const parsed = parseDateTime(dateTimeStr)!;
			currentEvent = {
				date: parsed.date,
				displayDate: parsed.display,
				originalDate: dateTimeStr,
				content: '',
			};
			currentContent = contentStr ? [contentStr] : [];
		} else if (currentEvent) {
			currentContent.push(line);
		}
	}

	flushCurrentEvent();

	return { events, ranges };
}

/**
 * Merges inline and referenced events, deduplicating entries with
 * identical date and content. Inline events win over sourced ones.
 */
function mergeEvents(
	inlineEvents: TimelineEvent[],
	sourcedEvents: TimelineEvent[]
): TimelineEvent[] {
	const seen = new Set<string>();
	const merged: TimelineEvent[] = [];
	for (const event of [...inlineEvents, ...sourcedEvents]) {
		const key = `${event.date.getTime()}\n${event.content}`;
		if (seen.has(key)) continue;
		seen.add(key);
		merged.push(event);
	}
	return merged;
}

/**
 * Merges inline and referenced ranges, deduplicating entries with
 * identical start, end and title. Inline ranges win over sourced ones.
 */
function mergeRanges(
	inlineRanges: TimelineRange[],
	sourcedRanges: TimelineRange[]
): TimelineRange[] {
	const seen = new Set<string>();
	const merged: TimelineRange[] = [];
	for (const range of [...inlineRanges, ...sourcedRanges]) {
		const key = `${range.start.getTime()}\n${range.end.getTime()}\n${range.title}`;
		if (seen.has(key)) continue;
		seen.add(key);
		merged.push(range);
	}
	return merged;
}

/**
 * Attaches the shared hover tooltip (same style and delay as event
 * cards) to an element. Used by both timeline events and range items
 * so hover feedback is consistent across the whole block.
 */
function attachHoverTooltip(
	plugin: TimelinePlugin,
	el: HTMLElement,
	text: string
): void {
	if (!plugin.settings.showTooltip) return;

	const tooltipEl = el.createDiv({ cls: 'timeline-tooltip' });
	tooltipEl.setText(text);

	let hoverTimer: number | null = null;

	plugin.registerDomEvent(el, 'mouseenter', () => {
		hoverTimer = window.setTimeout(() => {
			tooltipEl.addClass('visible');
		}, plugin.settings.tooltipDelay);
	});

	plugin.registerDomEvent(el, 'mouseleave', () => {
		if (hoverTimer !== null) {
			window.clearTimeout(hoverTimer);
			hoverTimer = null;
		}
		tooltipEl.removeClass('visible');
	});
}

/**
 * Parses and renders a timeline code block.
 * Called by the code block processor callback in main.ts.
 */
export async function processTimelineBlock(
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	plugin: TimelinePlugin
): Promise<void> {
	const T = t();
	const parsed = parseEvents(source);
	let events = parsed.events;
	let ranges = parsed.ranges;
	let sourceError: string | null = null;

	// Source directive: merge events from a referenced file
	const directiveLink = findSourceDirective(source);
	if (directiveLink) {
		const result = await loadSourceText(
			plugin.app,
			directiveLink,
			ctx.sourcePath
		);
		if (result.ok) {
			const sourced = parseEvents(result.text);
			events = mergeEvents(events, sourced.events);
			ranges = mergeRanges(ranges, sourced.ranges);
		} else if (result.reason === 'not-found') {
			sourceError = T.sourceFileNotFound(result.link);
		} else {
			sourceError = T.sourceNoTimelineBlock(result.link);
		}
	}

	// Sort events
	events.sort((a, b) => {
		const direction = plugin.settings.sortDirection === 'asc' ? 1 : -1;
		return direction * (a.date.getTime() - b.date.getTime());
	});

	// Ranges always sort ascending by start date
	ranges.sort((a, b) => a.start.getTime() - b.start.getTime());

	// Auto collapse
	let collapsedIndices = new Set<number>();
	let isCollapsed = false;
	if (
		plugin.settings.autoCollapse &&
		events.length >= plugin.settings.collapseThreshold
	) {
		const todayForCollapse = new Date();
		todayForCollapse.setHours(0, 0, 0, 0);
		const ranked = events.map((ev, idx) => ({
			idx,
			distance: Math.abs(ev.date.getTime() - todayForCollapse.getTime()),
		}));
		ranked.sort((a, b) => a.distance - b.distance);
		const showCount = Math.max(
			1,
			Math.min(plugin.settings.collapseShowCount, events.length)
		);
		for (let i = 0; i < showCount; i++) {
			collapsedIndices.add(ranked[i]!.idx);
		}
		isCollapsed = collapsedIndices.size < events.length;
	}

	// Source directive failed: show error above the timeline,
	// outside the container so the vertical line can't cross it
	if (sourceError) {
		const errorEl = el.createDiv({ cls: 'timeline-error' });
		errorEl.createEl('strong', { text: T.timelineParseError });
		errorEl.createEl('p', { text: sourceError });
	}

	// Render date-range progress bars above the timeline
	const DAY_MS = 1000 * 60 * 60 * 24;
	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0);

	let rangesEl: HTMLElement | null = null;
	if (plugin.settings.showRangeBars && ranges.length > 0) {
		rangesEl = el.createDiv({
			cls: 'timeline-ranges',
			attr: {
				style: `--timeline-color: ${plugin.settings.timelineColor}; --range-delay: ${plugin.settings.tooltipDelay}ms;`,
			},
		});
		if (isCollapsed) {
			rangesEl.addClass('timeline-ranges-collapsed');
		}

		for (const range of ranges) {
			const startDay = new Date(range.start);
			startDay.setHours(0, 0, 0, 0);
			const endDay = new Date(range.end);
			endDay.setHours(0, 0, 0, 0);
			const totalDays = Math.round(
				(endDay.getTime() - startDay.getTime()) / DAY_MS
			);

			let statusCls: string;
			let statusText: string;
			let percent: number;
			if (todayStart.getTime() < startDay.getTime()) {
				statusCls = 'timeline-range-upcoming';
				statusText = T.rangeStartsIn(
					Math.round(
						(startDay.getTime() - todayStart.getTime()) / DAY_MS
					)
				);
				percent = 0;
			} else if (todayStart.getTime() > endDay.getTime()) {
				statusCls = 'timeline-range-ended';
				statusText = T.rangeEndedAgo(
					Math.round(
						(todayStart.getTime() - endDay.getTime()) / DAY_MS
					)
				);
				percent = 100;
			} else {
				statusCls = 'timeline-range-active';
				const elapsed = Math.round(
					(todayStart.getTime() - startDay.getTime()) / DAY_MS
				);
				statusText = T.rangeDayProgress(elapsed, totalDays);
				percent =
					totalDays === 0 ? 100 : (elapsed / totalDays) * 100;
			}

			const item = rangesEl.createDiv({
				cls: `timeline-range-item ${statusCls}`,
			});
			const header = item.createDiv({ cls: 'timeline-range-header' });
			header.createSpan({
				cls: 'timeline-range-title',
				text: range.title,
			});
			header.createSpan({
				cls: 'timeline-range-status',
				text: statusText,
			});
			const track = item.createDiv({ cls: 'timeline-range-track' });
			track.createDiv({
				cls: 'timeline-range-fill',
				attr: { style: `width: ${percent}%;` },
			});

			attachHoverTooltip(plugin, item, range.display);
		}
	}

	// Container
	const timelineContainer = el.createDiv({
		cls: 'timeline-container',
		attr: {
			style: `--timeline-color: ${plugin.settings.timelineColor}; --dot-size: ${plugin.settings.dotSize}px; --line-width: ${plugin.settings.lineWidth}px; --item-spacing: ${plugin.settings.itemSpacing}px;`,
		},
	});

	// Non-empty block with no events and no source error: show syntax error
	if (
		events.length === 0 &&
		ranges.length === 0 &&
		source.trim() !== '' &&
		!sourceError
	) {
		timelineContainer.addClass('timeline-has-error');
		const errorEl = timelineContainer.createDiv({
			cls: 'timeline-error',
		});
		errorEl.createEl('strong', { text: T.timelineParseError });
		errorEl.createEl('p', {
			text: T.noValidEvents,
		});
		const listEl = errorEl.createEl('ul');
		listEl.createEl('li', {
			text: T.syntaxColon,
		});
		listEl.createEl('li', {
			text: T.syntaxTwoSpaces,
		});
		listEl.createEl('li', {
			text: T.syntaxMultiline,
		});
		return;
	}

	// Create a child component for markdown lifecycle management
	const renderComponent = new Component();
	plugin.addChild(renderComponent);

	// Render each event
	const TR = t(); // locale for tooltips and collapse button
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	for (const [eventIndex, event] of events.entries()) {
		const timelineItem = timelineContainer.createDiv({
			cls: 'timeline-item',
		});
		if (isCollapsed && !collapsedIndices.has(eventIndex)) {
			timelineItem.addClass('timeline-collapsed-item');
		}

		// Format date display
		let displayDate = event.displayDate;
		let dateDisplay = '';
		let timeDisplay = '';
		const chineseMatch = displayDate.match(
			/^(\d{4})年(\d{1,2})月(\d{1,2})日(.*)$/
		);
		if (chineseMatch) {
			const [, year, month, day, timePeriod] = chineseMatch;
			const formattedMonth = month!.padStart(2, '0');
			const formattedDay = day!.padStart(2, '0');
			dateDisplay = `${year}-${formattedMonth}-${formattedDay}`;
			timeDisplay = timePeriod ? timePeriod.trim() : '';
		} else if (displayDate.includes('_')) {
			const [date, time] = displayDate.split('_');
			dateDisplay = date!;
			timeDisplay = time!;
		} else {
			dateDisplay = displayDate;
		}
		displayDate = timeDisplay
			? `${dateDisplay}\n${timeDisplay}`
			: dateDisplay;

		timelineItem.createDiv({
			cls: 'timeline-date',
			text: displayDate,
		});
		timelineItem.createDiv({ cls: 'timeline-dot' });

		const contentEl = timelineItem.createDiv({
			cls: 'timeline-content',
		});

		const eventDate = new Date(event.date);
		eventDate.setHours(0, 0, 0, 0);
		const timeDiff = eventDate.getTime() - today.getTime();
		const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

		if (daysDiff === 0 && plugin.settings.highlightToday) {
			contentEl.addClass('timeline-today');
			contentEl.dataset.todayLabel = TR.todayLabel;
		}

		// Hover tooltip (shared with range items)
		let tooltipText: string;
		if (daysDiff === 0) {
			tooltipText = TR.tooltipToday;
		} else if (daysDiff > 0) {
			tooltipText = TR.tooltipDaysFromNow(daysDiff);
		} else {
			tooltipText = TR.tooltipDaysAgo(Math.abs(daysDiff));
		}
		attachHoverTooltip(plugin, contentEl, tooltipText);

		// Render Markdown content
		void MarkdownRenderer.render(
			plugin.app,
			event.content,
			contentEl,
			ctx.sourcePath,
			renderComponent
		);
	}

	// Collapse/expand button
	if (isCollapsed) {
		timelineContainer.addClass('timeline-collapsed');
		const hiddenCount = events.length - collapsedIndices.size;
		const collapseBar = timelineContainer.createDiv({
			cls: 'timeline-collapse-bar',
		});
		const collapseGradient = collapseBar.createDiv({
			cls: 'timeline-collapse-gradient',
		});
		const collapseBtn = collapseBar.createEl('button', {
			cls: 'timeline-collapse-btn',
		});
		collapseBtn.setText(TR.collapseShowAll(hiddenCount));

		let expanded = false;
		plugin.registerDomEvent(collapseBtn, 'click', () => {
			expanded = !expanded;
			rangesEl?.toggleClass('timeline-ranges-collapsed', !expanded);
			if (expanded) {
				timelineContainer.removeClass('timeline-collapsed');
				collapseBtn.setText(TR.collapseCollapse);
				collapseGradient.addClass('timeline-collapse-gradient-hidden');
			} else {
				timelineContainer.addClass('timeline-collapsed');
				collapseBtn.setText(TR.collapseShowAll(hiddenCount));
				collapseGradient.removeClass(
					'timeline-collapse-gradient-hidden'
				);
			}
		});
	}
}
