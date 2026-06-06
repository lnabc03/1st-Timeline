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
 * Scans all vault Markdown files and aggregates them by frontmatter date field,
 * generating timeline code block content.
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
				console.error(`Error processing note ${file.path}:`, err);
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
			return 'No notes found in the selected date range.';
		}

		return timelineContent;
	} catch (err) {
		console.error('Error generating notes summary:', err);
		return `Error generating notes summary: ${err instanceof Error ? err.message : String(err)}`;
	}
}

/** Date range selection modal */
export class DateRangeModal extends Modal {
	plugin: TimelinePlugin;

	constructor(app: App, plugin: TimelinePlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Notes summary' });

		const paragraph = contentEl.createEl('p');
		paragraph.appendText(
			'Enter a date range (YYYY-MM-DD,YYYY-MM-DD)'
		);
		paragraph.appendChild(activeDocument.createElement('br'));
		paragraph.appendText(
			`Timeline will summarize notes by the property "${this.plugin.settings.createdDateField}"`
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
			text: 'Cancel',
		});
		this.plugin.registerDomEvent(cancelButton, 'click', () => {
			this.close();
		});

		const confirmButton = buttonContainer.createEl('button', {
			text: 'Confirm',
			cls: 'mod-cta',
		});
		confirmButton.addClass('timeline-modal-confirm');

		this.plugin.registerDomEvent(confirmButton, 'click', async () => {
			const dateRange = dateRangeInput.getValue().split(',');
			if (dateRange.length !== 2) {
				new Notice(
					'Invalid date range. Use the format yyyy-mm-dd,yyyy-mm-dd'
				);
				return;
			}
			const [startDate, endDate] = dateRange;
			if (
				!DATE_RANGE_REGEX.test(startDate!) ||
				!DATE_RANGE_REGEX.test(endDate!)
			) {
				new Notice('Invalid date format. Use yyyy-mm-dd');
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
				new Notice('Notes timeline generated');
			} else {
				new Notice('Unable to insert timeline. Make sure an editor is open.');
			}
			this.close();
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
