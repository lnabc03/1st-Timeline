/* eslint-disable obsidianmd/ui/sentence-case */

import {
	type App,
	MarkdownView,
	Modal,
	Notice,
	type TFile,
	TextComponent,
} from 'obsidian';
import type TimelinePlugin from './main';
import { DATE_RANGE_REGEX } from './constants';

/**
 * 扫描 vault 中所有 Markdown 文件，按 frontmatter 日期字段汇总，
 * 生成 timeline 代码块内容。
 */
export async function generateNotesTimeline(
	plugin: TimelinePlugin,
	startDate: string,
	endDate: string
): Promise<string> {
	try {
		const files: TFile[] = plugin.app.vault.getMarkdownFiles();
		const notesByDate: Record<string, TFile[]> = {};
		const start = new Date(startDate);
		start.setHours(0, 0, 0, 0);
		const end = new Date(endDate);
		end.setHours(23, 59, 59, 999);

		for (const file of files) {
			try {
				const metadata =
					plugin.app.metadataCache.getFileCache(file)?.frontmatter;
				if (metadata) {
					const dateField = plugin.settings.createdDateField;
					// 动态 frontmatter 属性需要类型断言
					const dateValue = (metadata as Record<string, unknown>)[
						dateField
					];

					let createdDate: Date | null = null;
					if (typeof dateValue === 'string' && dateValue.includes('_')) {
						const [dateStr] = dateValue.split('_');
						createdDate = new Date(dateStr!);
					} else if (typeof dateValue === 'string') {
						createdDate = new Date(dateValue);
					} else if (dateValue instanceof Date) {
						createdDate = dateValue;
					}

					if (
						createdDate &&
						!isNaN(createdDate.getTime()) &&
						createdDate >= start &&
						createdDate <= end
					) {
						const dateKey = createdDate.toISOString().split('T')[0]!;
						if (!notesByDate[dateKey]) {
							notesByDate[dateKey] = [];
						}
						const bucket = notesByDate[dateKey];
						if (bucket) {
							bucket.push(file);
						}
					}
				}
			} catch (err) {
				console.error(`处理笔记 ${file.path} 时出错:`, err);
			}
		}

		let timelineContent = '';
		const sortedDates = Object.keys(notesByDate).sort();
		if (plugin.settings.sortDirection === 'desc') {
			sortedDates.reverse();
		}

		for (const dateKey of sortedDates) {
			const notes = notesByDate[dateKey];
			if (notes && notes.length > 0) {
				timelineContent += `${dateKey}  \n`;
				for (const note of notes) {
					const fileName = note.basename;
					timelineContent += `- [[${fileName}]]\n`;
				}
				timelineContent += '\n';
			}
		}

		if (!timelineContent) {
			return '所选日期范围内没有找到任何笔记。';
		}

		return timelineContent;
	} catch (err) {
		console.error('生成笔记汇总时出错:', err);
		return `生成笔记汇总时出错: ${err instanceof Error ? err.message : String(err)}`;
	}
}

/** 日期范围选择弹窗 */
export class DateRangeModal extends Modal {
	plugin: TimelinePlugin;

	constructor(app: App, plugin: TimelinePlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '笔记汇总' });

		const paragraph = contentEl.createEl('p');
		paragraph.appendText(
			'请输入日期范围（YYYY-MM-DD,YYYY-MM-DD）'
		);
		paragraph.appendChild(activeDocument.createElement('br'));
		paragraph.appendText(
			`1st-Timeline将基于时间属性"${this.plugin.settings.createdDateField}"汇总笔记`
		);

		const inputContainer = contentEl.createDiv();
		const dateRangeInput = new TextComponent(inputContainer);

		const now = new Date();
		const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
		const lastDay = new Date(
			now.getFullYear(),
			now.getMonth() + 1,
			0
		);

		const formatDate = (date: Date): string => {
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		};

		dateRangeInput.setValue(
			`${formatDate(firstDay)},${formatDate(lastDay)}`
		);
		dateRangeInput.inputEl.addClass('timeline-modal-input');

		const buttonContainer = contentEl.createDiv();
		buttonContainer.addClass('timeline-modal-buttons');

		const cancelButton = buttonContainer.createEl('button', {
			text: '取消',
		});
		this.plugin.registerDomEvent(cancelButton, 'click', () => {
			this.close();
		});

		const confirmButton = buttonContainer.createEl('button', {
			text: '确认',
			cls: 'mod-cta',
		});
		confirmButton.addClass('timeline-modal-confirm');

		this.plugin.registerDomEvent(confirmButton, 'click', async () => {
			const dateRange = dateRangeInput.getValue().split(',');
			if (dateRange.length !== 2) {
				new Notice(
					'请输入有效的日期范围，格式：YYYY-MM-DD,YYYY-MM-DD'
				);
				return;
			}
			const [startDate, endDate] = dateRange;
			if (
				!DATE_RANGE_REGEX.test(startDate!) ||
				!DATE_RANGE_REGEX.test(endDate!)
			) {
				new Notice('日期格式无效，请使用 YYYY-MM-DD 格式');
				return;
			}

			const timelineContent = await generateNotesTimeline(
				this.plugin,
				startDate!,
				endDate!
			);

			const markdownView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (markdownView?.editor) {
				const cursor = markdownView.editor.getCursor();
				markdownView.editor.replaceRange(
					`\`\`\`timeline\n${timelineContent}\`\`\`\n`,
					cursor
				);
				new Notice('笔记汇总时间轴已生成');
			} else {
				new Notice('无法插入时间轴，请确保有打开的编辑器');
			}
			this.close();
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
