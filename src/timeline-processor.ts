import { Component, MarkdownRenderer, type MarkdownPostProcessorContext } from 'obsidian';
import type TimelinePlugin from './main';
import { SINGLE_LINE_REGEX } from './constants';
import { parseDateTime } from './date-parser';
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

/**
 * Parses timeline events from code block text.
 * Source directive lines are skipped, so nested directives in
 * referenced files are silently ignored.
 */
function parseEvents(source: string): TimelineEvent[] {
	const events: TimelineEvent[] = [];
	const lines = source.split('\n');

	let currentEvent: TimelineEvent | null = null;
	let currentContent: string[] = [];

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
			if (currentEvent) {
				currentEvent.content = currentContent.join('\n').trim();
				if (currentEvent.content) {
					events.push(currentEvent);
				}
			}

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

	if (currentEvent) {
		currentEvent.content = currentContent.join('\n').trim();
		if (currentEvent.content) {
			events.push(currentEvent);
		}
	}

	return events;
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
	let events = parseEvents(source);
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
			events = mergeEvents(events, parseEvents(result.text));
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

	// Container
	const timelineContainer = el.createDiv({
		cls: 'timeline-container',
		attr: {
			style: `--timeline-color: ${plugin.settings.timelineColor}; --dot-size: ${plugin.settings.dotSize}px; --line-width: ${plugin.settings.lineWidth}px; --item-spacing: ${plugin.settings.itemSpacing}px;`,
		},
	});

	// Source directive failed: show error, but still render inline events
	if (sourceError) {
		const errorEl = timelineContainer.createDiv({
			cls: 'timeline-error',
		});
		errorEl.createEl('strong', { text: T.timelineParseError });
		errorEl.createEl('p', { text: sourceError });
	}

	// Non-empty block with no events and no source error: show syntax error
	if (events.length === 0 && source.trim() !== '' && !sourceError) {
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

		// Hover tooltip
		if (plugin.settings.showTooltip) {
			const tooltipEl = contentEl.createDiv({
				cls: 'timeline-tooltip',
			});

			if (daysDiff === 0) {
				tooltipEl.setText(TR.tooltipToday);
			} else if (daysDiff > 0) {
				tooltipEl.setText(TR.tooltipDaysFromNow(daysDiff));
			} else {
				tooltipEl.setText(TR.tooltipDaysAgo(Math.abs(daysDiff)));
			}

			let hoverTimer: number | null = null;

			plugin.registerDomEvent(contentEl, 'mouseenter', () => {
				hoverTimer = window.setTimeout(() => {
					tooltipEl.addClass('visible');
				}, plugin.settings.tooltipDelay);
			});

			plugin.registerDomEvent(contentEl, 'mouseleave', () => {
				if (hoverTimer !== null) {
					window.clearTimeout(hoverTimer);
					hoverTimer = null;
				}
				tooltipEl.removeClass('visible');
			});
		}

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
