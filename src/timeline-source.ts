import type { App } from 'obsidian';

/** source 指令行：source: 或 源：（中英文冒号均可） */
export const SOURCE_DIRECTIVE_REGEX = /^(?:source|源)\s*[:：]\s*(.+)$/i;

/** Obsidian 内链 [[路径]] 或 [[路径|别名]] */
const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/;

/** 提取 ```timeline 代码块内容 */
const TIMELINE_BLOCK_REGEX = /```timeline[^\S\n]*\n([\s\S]*?)```/g;

export type LoadSourceResult =
	| { ok: true; text: string }
	| { ok: false; reason: 'not-found' | 'no-timeline-block'; link: string };

/**
 * Parses a single line as a source directive.
 * Returns the link target, or null if the line is not a directive.
 */
export function parseSourceDirective(line: string): string | null {
	const match = line.match(SOURCE_DIRECTIVE_REGEX);
	if (!match) return null;
	const raw = match[1]!.trim();
	const wikilink = raw.match(WIKILINK_REGEX);
	return (wikilink ? wikilink[1]! : raw).trim();
}

/**
 * Finds the first source directive in a code block source.
 * Only the first one is used; later ones are ignored.
 */
export function findSourceDirective(source: string): string | null {
	for (const line of source.split('\n')) {
		const link = parseSourceDirective(line.trim());
		if (link) return link;
	}
	return null;
}

/**
 * Resolves the directive link via Obsidian's link resolution,
 * reads the file, and extracts the content of all ```timeline blocks.
 * Nested source directives inside the blocks are ignored downstream.
 */
export async function loadSourceText(
	app: App,
	link: string,
	sourcePath: string
): Promise<LoadSourceResult> {
	const file = app.metadataCache.getFirstLinkpathDest(link, sourcePath);
	if (!file) {
		return { ok: false, reason: 'not-found', link };
	}

	const content = await app.vault.cachedRead(file);
	const blocks: string[] = [];
	for (const match of content.matchAll(TIMELINE_BLOCK_REGEX)) {
		blocks.push(match[1]!);
	}
	if (blocks.length === 0) {
		return { ok: false, reason: 'no-timeline-block', link: file.basename };
	}
	return { ok: true, text: blocks.join('\n') };
}
