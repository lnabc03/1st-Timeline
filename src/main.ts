import { Plugin } from 'obsidian';
import {
	type TimelinePluginSettings,
	DEFAULT_SETTINGS,
	TimelineSettingTab,
} from './settings';
import { processTimelineBlock } from './timeline-processor';
import { DateRangeModal } from './notes-summary';
import { t } from './i18n';

export default class TimelinePlugin extends Plugin {
	settings!: TimelinePluginSettings;

	async onload(): Promise<void> {
		console.debug('加载 1st-Timeline 插件');
		await this.loadSettings();

		this.addSettingTab(new TimelineSettingTab(this.app, this));

		this.addCommand({
			id: 'generate-notes-timeline',
			name: t().commandNotesSummary,
			callback: () => {
				new DateRangeModal(this.app, this).open();
			},
		});

		this.registerMarkdownCodeBlockProcessor(
			'timeline',
			(source, el, ctx) => {
				processTimelineBlock(source, el, ctx, this);
			}
		);
	}

	onunload(): void {
		console.debug('卸载 1st-Timeline 插件');
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<TimelinePluginSettings>,
		);
	}
}
