import { Notice } from 'obsidian';
import type TimelinePlugin from './main';
import { SINGLE_LINE_REGEX } from './constants';
import { parseDateTime } from './date-parser';
import { SOURCE_DIRECTIVE_REGEX } from './timeline-source';
import { t } from './i18n';

/** 匹配 ```timeline 代码块（含位置信息，用于替换） */
const TIMELINE_BLOCK_REGEX = /```timeline[^\S\n]*\n([\s\S]*?)```/g;

/** 归档区标题（中英文两种写法均可识别） */
const ARCHIVE_HEADER_REGEX = /^(?:已归档|Archived)\s*[:：]\s*$/;

interface Segment {
	/** 事件日期；非事件行（序言、source 指令等）为 null */
	date: Date | null;
	lines: string[];
}

/**
 * Splits timeline block text into segments: each dated event
 * (with its following content lines) or non-event preamble lines.
 */
function splitSegments(blockText: string): Segment[] {
	const segments: Segment[] = [];
	let current: Segment | null = null;

	for (const line of blockText.split('\n')) {
		const trimmed = line.trim();

		let date: Date | null = null;
		if (trimmed !== '' && !SOURCE_DIRECTIVE_REGEX.test(trimmed)) {
			const singleLineMatch = trimmed.match(SINGLE_LINE_REGEX);
			if (singleLineMatch) {
				const parsed = parseDateTime(singleLineMatch[1]!.trim());
				if (parsed) date = parsed.date;
			}
			if (!date) {
				const parsed = parseDateTime(trimmed);
				if (parsed) date = parsed.date;
			}
		}

		if (date) {
			current = { date, lines: [line] };
			segments.push(current);
		} else if (current) {
			current.lines.push(line);
		} else {
			segments.push({ date: null, lines: [line] });
		}
	}

	return segments;
}

/**
 * Command: archives past events (date before today) from all timeline
 * blocks in the active file into an "已归档： / Archived:" section
 * in the same file. Creates the section at end of file if absent,
 * otherwise inserts the new batch right after the existing header.
 */
export async function archivePastEvents(
	plugin: TimelinePlugin
): Promise<void> {
	const T = t();

	const file = plugin.app.workspace.getActiveFile();
	if (!file || file.extension !== 'md') {
		new Notice(T.noticeNoActiveFile);
		return;
	}

	const content = await plugin.app.vault.read(file);
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const archivedLines: string[] = [];
	let archivedCount = 0;

	const newContent = content.replace(
		TIMELINE_BLOCK_REGEX,
		(_full, blockText: string) => {
			const kept: string[] = [];
			for (const segment of splitSegments(blockText)) {
				if (segment.date && segment.date.getTime() < today.getTime()) {
					archivedLines.push(...segment.lines);
					archivedCount++;
				} else {
					kept.push(...segment.lines);
				}
			}
			while (kept.length > 0 && kept[kept.length - 1]!.trim() === '') {
				kept.pop();
			}
			return '```timeline\n' + kept.join('\n') + '\n```';
		}
	);

	if (archivedCount === 0) {
		new Notice(T.noticeNoPastEvents);
		return;
	}

	const archivedText = archivedLines.join('\n');
	const lines = newContent.split('\n');
	const headerIndex = lines.findIndex((l) =>
		ARCHIVE_HEADER_REGEX.test(l.trim())
	);

	let finalContent: string;
	if (headerIndex >= 0) {
		lines.splice(headerIndex + 1, 0, archivedText);
		finalContent = lines.join('\n');
	} else {
		finalContent =
			newContent.replace(/\s*$/, '') +
			`\n\n${T.archiveHeader}\n${archivedText}\n`;
	}

	await plugin.app.vault.modify(file, finalContent);
	new Notice(T.noticeArchived(archivedCount));
}
