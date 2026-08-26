import {
	type App,
	type Editor,
	MarkdownView,
	Modal,
	Notice,
	TextAreaComponent,
	TextComponent,
} from 'obsidian';
import type TimelinePlugin from './main';
import { parseDateRangeLine, parseDateTime } from './date-parser';
import { t } from './i18n';

/** 一个 ```timeline 代码块在编辑器中的位置（行号，0 起） */
interface TimelineBlockLocation {
	/** ```timeline 所在行 */
	startLine: number;
	/** 闭合 ``` 所在行 */
	endLine: number;
}

/**
 * Scans the editor for ```timeline fenced blocks and returns
 * their line ranges. Unclosed blocks are ignored.
 */
function findTimelineBlocks(editor: Editor): TimelineBlockLocation[] {
	const blocks: TimelineBlockLocation[] = [];
	let start = -1;
	for (let i = 0; i < editor.lineCount(); i++) {
		const trimmed = editor.getLine(i).trim();
		if (start < 0) {
			if (/^```timeline$/.test(trimmed)) start = i;
		} else if (trimmed === '```') {
			blocks.push({ startLine: start, endLine: i });
			start = -1;
		}
	}
	return blocks;
}

/**
 * Inserts event lines at the end of a timeline block, just before
 * the closing fence; trailing blank lines inside the block are
 * skipped so the new lines stick to the last existing event.
 */
function insertIntoBlock(
	editor: Editor,
	block: TimelineBlockLocation,
	lines: string[]
): void {
	let insertLine = block.endLine;
	while (
		insertLine - 1 > block.startLine &&
		editor.getLine(insertLine - 1).trim() === ''
	) {
		insertLine--;
	}
	editor.replaceRange(lines.join('\n') + '\n', { line: insertLine, ch: 0 });
}

/**
 * Writes the composed event lines into the active note:
 * 0 blocks → create a new block at the cursor;
 * 1 block → append to it;
 * N blocks → ask the user which one via TimelineBlockPickerModal.
 */
function insertEventLines(plugin: TimelinePlugin, lines: string[]): void {
	const T = t();
	const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!view?.editor) {
		new Notice(T.noticeNoEditor);
		return;
	}
	const editor = view.editor;
	const blocks = findTimelineBlocks(editor);

	if (blocks.length === 0) {
		// 无代码块：在光标所在行之后写入新块。
		// 光标前可能有字符，直接插入会破坏围栏，因此
		// 非空行先换行（隔一个空行）再写入；空行则就地写入
		const cursor = editor.getCursor();
		const lineText = editor.getLine(cursor.line);
		const blockText = '```timeline\n' + lines.join('\n') + '\n```\n';
		if (lineText.trim() === '') {
			editor.replaceRange(blockText, { line: cursor.line, ch: 0 });
		} else {
			editor.replaceRange('\n\n' + blockText, {
				line: cursor.line,
				ch: lineText.length,
			});
		}
		new Notice(T.noticeEventAdded(lines.length));
	} else if (blocks.length === 1) {
		insertIntoBlock(editor, blocks[0]!, lines);
		new Notice(T.noticeEventAdded(lines.length));
	} else {
		new TimelineBlockPickerModal(plugin.app, blocks, (block) => {
			insertIntoBlock(editor, block, lines);
			new Notice(T.noticeEventAdded(lines.length));
		}).open();
	}
}

/**
 * Modal shown when the active note contains multiple timeline
 * blocks: lets the user pick which one receives the new events,
 * labeled by ordinal and the line number of the opening fence.
 */
class TimelineBlockPickerModal extends Modal {
	private readonly blocks: TimelineBlockLocation[];
	private readonly onPick: (block: TimelineBlockLocation) => void;

	constructor(
		app: App,
		blocks: TimelineBlockLocation[],
		onPick: (block: TimelineBlockLocation) => void
	) {
		super(app);
		this.blocks = blocks;
		this.onPick = onPick;
	}

	onOpen(): void {
		const { contentEl } = this;
		const T = t();

		contentEl.createEl('h2', { text: T.addEventPickTitle });
		contentEl.createEl('p', { text: T.addEventPickPrompt });

		const listEl = contentEl.createDiv({
			cls: 'timeline-block-picker-list',
		});
		this.blocks.forEach((block, index) => {
			const button = listEl.createEl('button', {
				text: T.addEventBlockOption(index + 1, block.startLine + 1),
				cls: 'timeline-block-picker-option',
			});
			button.addEventListener('click', () => {
				this.onPick(block);
				this.close();
			});
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

/**
 * "Add new event" modal: a time input (short) and an event input
 * (long). A live preview at the top shows the composed line
 * (time：event); "继续新增" fixes the line into the pending list
 * and clears the inputs, "保存并退出" writes everything into the
 * timeline block of the active note.
 */
export class AddEventModal extends Modal {
	private readonly plugin: TimelinePlugin;
	/** 已通过“继续新增”固定的新增行 */
	private pendingLines: string[] = [];

	constructor(app: App, plugin: TimelinePlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		const { contentEl } = this;
		const T = t();

		this.modalEl.addClass('timeline-add-event-modal');
		contentEl.createEl('h2', { text: T.addEventModalTitle });

		// 新增行预览区：已固定的行 + 当前输入的实时预览
		const previewEl = contentEl.createDiv({
			cls: 'timeline-add-event-preview',
		});

		const timeInput = new TextComponent(contentEl);
		timeInput.setPlaceholder(T.addEventTimePlaceholder);
		timeInput.inputEl.addClass('timeline-modal-input');

		const contentInput = new TextAreaComponent(contentEl);
		contentInput.setPlaceholder(T.addEventContentPlaceholder);
		contentInput.inputEl.addClass('timeline-add-event-content');

		const renderPreview = () => {
			previewEl.empty();
			for (const line of this.pendingLines) {
				previewEl.createDiv({
					cls: 'timeline-add-event-line',
					text: line,
				});
			}
			const time = timeInput.getValue().trim();
			const event = contentInput.getValue().trim();
			if (time || event) {
				previewEl.createDiv({
					cls: 'timeline-add-event-line timeline-add-event-line-current',
					text: `${time}：${event}`,
				});
			}
		};
		renderPreview();

		this.plugin.registerDomEvent(timeInput.inputEl, 'input', () => {
			renderPreview();
		});
		this.plugin.registerDomEvent(contentInput.inputEl, 'input', () => {
			renderPreview();
		});

		/** 校验当前输入并合成为一行；不合法时提示并返回 null */
		const composeLine = (): string | null => {
			const time = timeInput.getValue().trim();
			const event = contentInput.getValue().trim();
			if (!time && !event) return '';
			if (!time || !event) {
				new Notice(
					!time ? T.noticeInvalidEventTime : T.noticeEmptyEventContent
				);
				return null;
			}
			// 支持所有日期/时间格式，以及时间段（起～止）写法
			if (
				!parseDateTime(time) &&
				!parseDateRangeLine(`${time}：x`)
			) {
				new Notice(T.noticeInvalidEventTime);
				return null;
			}
			return `${time}：${event}`;
		};

		const buttonContainer = contentEl.createDiv();
		buttonContainer.addClass('timeline-modal-buttons');

		const continueButton = buttonContainer.createEl('button', {
			text: T.addEventContinue,
		});
		this.plugin.registerDomEvent(continueButton, 'click', () => {
			const line = composeLine();
			if (line === null) return;
			if (line === '') {
				new Notice(T.noticeNothingToSave);
				return;
			}
			this.pendingLines.push(line);
			timeInput.setValue('');
			contentInput.setValue('');
			renderPreview();
			timeInput.inputEl.focus();
		});

		const saveButton = buttonContainer.createEl('button', {
			text: T.addEventSave,
			cls: 'mod-cta',
		});
		saveButton.addClass('timeline-modal-confirm');
		this.plugin.registerDomEvent(saveButton, 'click', () => {
			const line = composeLine();
			if (line === null) return;
			const lines = [...this.pendingLines];
			if (line !== '') lines.push(line);
			if (lines.length === 0) {
				new Notice(T.noticeNothingToSave);
				return;
			}
			this.close();
			insertEventLines(this.plugin, lines);
		});

		timeInput.inputEl.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
