/* eslint-disable obsidianmd/ui/sentence-case */

import { MarkdownRenderer, type MarkdownPostProcessorContext } from 'obsidian';
import type TimelinePlugin from './main';
import { SINGLE_LINE_REGEX } from './constants';
import { parseDateTime } from './date-parser';

interface TimelineEvent {
	date: Date;
	displayDate: string;
	originalDate: string;
	content: string;
}

/**
 * 解析并渲染 timeline 代码块。
 * 由 main.ts 中的代码块处理器回调调用。
 */
export function processTimelineBlock(
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	plugin: TimelinePlugin
): void {
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

	// 排序
	events.sort((a, b) => {
		const direction = plugin.settings.sortDirection === 'asc' ? 1 : -1;
		return direction * (a.date.getTime() - b.date.getTime());
	});

	// 自动折叠
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

	// 容器
	const timelineContainer = el.createEl('div', {
		cls: 'timeline-container',
		attr: {
			style: `--timeline-color: ${plugin.settings.timelineColor}; --dot-size: ${plugin.settings.dotSize}px; --line-width: ${plugin.settings.lineWidth}px; --item-spacing: ${plugin.settings.itemSpacing}px;`,
		},
	});

	// 空块 + 有内容 → 错误提示
	if (events.length === 0 && source.trim() !== '') {
		const errorEl = timelineContainer.createEl('div', {
			cls: 'timeline-error',
		});
		errorEl.createEl('strong', { text: '1st-Timeline 解析错误' });
		errorEl.createEl('p', {
			text: '未能解析出任何有效事件。请检查您的语法是否符合以下格式之一：',
		});
		const listEl = errorEl.createEl('ul');
		listEl.createEl('li', {
			text: '日期：事件内容 (使用中文或英文冒号)',
		});
		listEl.createEl('li', {
			text: '日期  事件内容 (使用两个空格)',
		});
		listEl.createEl('li', {
			text: '日期 (后跟换行和多行内容)',
		});
		return;
	}

	// 渲染每个事件
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	for (const [eventIndex, event] of events.entries()) {
		const timelineItem = timelineContainer.createEl('div', {
			cls: 'timeline-item',
		});
		if (isCollapsed && !collapsedIndices.has(eventIndex)) {
			timelineItem.addClass('timeline-collapsed-item');
		}

		// 日期显示格式化
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

		timelineItem.createEl('div', {
			cls: 'timeline-date',
			text: displayDate,
		});
		timelineItem.createEl('div', { cls: 'timeline-dot' });

		const contentEl = timelineItem.createEl('div', {
			cls: 'timeline-content',
		});

		const eventDate = new Date(event.date);
		eventDate.setHours(0, 0, 0, 0);
		const timeDiff = eventDate.getTime() - today.getTime();
		const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

		if (daysDiff === 0 && plugin.settings.highlightToday) {
			contentEl.addClass('timeline-today');
		}

		// 悬停提示
		if (plugin.settings.showTooltip) {
			const tooltipEl = contentEl.createEl('div', {
				cls: 'timeline-tooltip',
			});

			if (daysDiff === 0) {
				tooltipEl.setText('今天');
			} else if (daysDiff > 0) {
				tooltipEl.setText(`距今还有 ${daysDiff} 天`);
			} else {
				tooltipEl.setText(`已过去 ${Math.abs(daysDiff)} 天`);
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

		// 渲染 Markdown 内容
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		void MarkdownRenderer.renderMarkdown(
			event.content,
			contentEl,
			ctx.sourcePath,
			plugin
		);
	}

	// 折叠/展开按钮
	if (isCollapsed) {
		timelineContainer.addClass('timeline-collapsed');
		const hiddenCount = events.length - collapsedIndices.size;
		const collapseBar = timelineContainer.createEl('div', {
			cls: 'timeline-collapse-bar',
		});
		const collapseGradient = collapseBar.createEl('div', {
			cls: 'timeline-collapse-gradient',
		});
		const collapseBtn = collapseBar.createEl('button', {
			cls: 'timeline-collapse-btn',
		});
		collapseBtn.setText(`展开全部 (+${hiddenCount})`);

		let expanded = false;
		plugin.registerDomEvent(collapseBtn, 'click', () => {
			expanded = !expanded;
			if (expanded) {
				timelineContainer.removeClass('timeline-collapsed');
				collapseBtn.setText('收起');
				collapseGradient.addClass('timeline-collapse-gradient-hidden');
			} else {
				timelineContainer.addClass('timeline-collapsed');
				collapseBtn.setText(`展开全部 (+${hiddenCount})`);
				collapseGradient.removeClass(
					'timeline-collapse-gradient-hidden'
				);
			}
		});
	}
}
