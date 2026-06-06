import { type App, Notice, PluginSettingTab, Setting, TextComponent } from 'obsidian';
import type TimelinePlugin from './main';
import { COLOR_PRESETS } from './constants';

export interface TimelinePluginSettings {
	sortDirection: 'asc' | 'desc';
	timelineColor: string;
	dotSize: number;
	lineWidth: number;
	itemSpacing: number;
	showTooltip: boolean;
	tooltipDelay: number;
	highlightToday: boolean;
	createdDateField: string;
	autoCollapse: boolean;
	collapseThreshold: number;
	collapseShowCount: number;
}

export const DEFAULT_SETTINGS: TimelinePluginSettings = {
	sortDirection: 'asc',
	timelineColor: '#5588cc',
	dotSize: 12,
	lineWidth: 2,
	itemSpacing: 20,
	showTooltip: true,
	tooltipDelay: 500,
	highlightToday: true,
	createdDateField: 'created',
	autoCollapse: true,
	collapseThreshold: 10,
	collapseShowCount: 5,
};

export class TimelineSettingTab extends PluginSettingTab {
	plugin: TimelinePlugin;

	constructor(app: App, plugin: TimelinePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('First timeline')
			.setHeading();

		new Setting(containerEl)
			.setName('Sort direction')
			.setDesc('Sort order for timeline events')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('asc', 'Ascending (earliest first)')
					.addOption('desc', 'Descending (latest first)')
					.setValue(this.plugin.settings.sortDirection)
					.onChange(async (value: string) => {
						this.plugin.settings.sortDirection = value as 'asc' | 'desc';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Date property for notes summary')
			.setDesc('Frontmatter property containing a date (yyyy-mm-dd)')
			.addText((text) =>
				text
					.setValue(this.plugin.settings.createdDateField)
					.onChange(async (value: string) => {
						this.plugin.settings.createdDateField = value;
						await this.plugin.saveSettings();
					})
			)
			.addButton((button) =>
				button.setButtonText('Restore default').onClick(async () => {
					this.plugin.settings.createdDateField = 'created';
					await this.plugin.saveSettings();
					this.display();
					new Notice('Default property name restored');
				})
			);

		// Color settings with preset buttons
		const colorSetting = new Setting(containerEl)
			.setName('Timeline color')
			.setDesc('Color of the timeline line and dots');

		const colorSettingControl = colorSetting.controlEl.createEl('div', {
			cls: 'timeline-color-setting-container',
			attr: {
				style: 'display: flex; align-items: center; gap: 8px;',
			},
		});

		const colorPreview = colorSettingControl.createEl('div', {
			cls: 'timeline-color-preview',
			attr: {
				style:
					'width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--background-modifier-border);',
			},
		});
		colorPreview.style.backgroundColor = this.plugin.settings.timelineColor;

		const colorInput = new Setting(colorSettingControl)
			.setClass('timeline-color-input')
			.addText((text) =>
				text
					.setValue(this.plugin.settings.timelineColor)
					.onChange(async (value: string) => {
						this.plugin.settings.timelineColor = value;
						await this.plugin.saveSettings();
						colorPreview.style.backgroundColor = value;
					})
			);

		for (const preset of COLOR_PRESETS) {
			const presetButton = colorSettingControl.createEl('div', {
				cls: 'timeline-preset-color',
				attr: {
					'data-color': preset.value,
					title: preset.name,
					style: `background-color: ${preset.value}; width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--background-modifier-border); cursor: pointer; transition: transform 0.2s ease;`,
				},
			});

			this.plugin.registerDomEvent(presetButton, 'click', async () => {
				this.plugin.settings.timelineColor = preset.value;
				await this.plugin.saveSettings();
				(colorInput.components[0] as TextComponent)?.setValue(preset.value);
				colorPreview.style.backgroundColor = preset.value;
				new Notice(`Set to ${preset.name} theme`);
			});
		}

		// Hover tooltip
		new Setting(containerEl)
			.setName('Hover tooltip')
			.setDesc('Show days until or since on hover')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showTooltip)
					.onChange(async (value: boolean) => {
						this.plugin.settings.showTooltip = value;
						await this.plugin.saveSettings();
					})
			);

		// Hover delay
		new Setting(containerEl)
			.setName('Hover delay')
			.setDesc('Delay before the tooltip appears (milliseconds)')
			.addSlider((slider) =>
				slider
					.setLimits(0, 1000, 100)
					.setValue(this.plugin.settings.tooltipDelay)
					.setDynamicTooltip()
					.onChange(async (value: number) => {
						this.plugin.settings.tooltipDelay = value;
						await this.plugin.saveSettings();
					})
			)
			.addButton((button) =>
				button.setButtonText('Restore default').onClick(async () => {
					this.plugin.settings.tooltipDelay = 500;
					await this.plugin.saveSettings();
					this.display();
					new Notice('Default hover delay restored');
				})
			);

		// Highlight today
		new Setting(containerEl)
			.setName('Highlight today')
			.setDesc('Highlight events on the current day')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.highlightToday)
					.onChange(async (value: boolean) => {
						this.plugin.settings.highlightToday = value;
						await this.plugin.saveSettings();
					})
			);

		// Dot size
		new Setting(containerEl)
			.setName('Dot size')
			.setDesc('Size of timeline dots')
			.addSlider((slider) =>
				slider
					.setLimits(6, 20, 2)
					.setValue(this.plugin.settings.dotSize)
					.setDynamicTooltip()
					.onChange(async (value: number) => {
						this.plugin.settings.dotSize = value;
						await this.plugin.saveSettings();
					})
			)
			.addButton((button) =>
				button.setButtonText('Restore default').onClick(async () => {
					this.plugin.settings.dotSize = 12;
					await this.plugin.saveSettings();
					this.display();
					new Notice('Default dot size restored');
				})
			);

		// Line width
		new Setting(containerEl)
			.setName('Line width')
			.setDesc('Width of the timeline line')
			.addSlider((slider) =>
				slider
					.setLimits(1, 5, 1)
					.setValue(this.plugin.settings.lineWidth)
					.setDynamicTooltip()
					.onChange(async (value: number) => {
						this.plugin.settings.lineWidth = value;
						await this.plugin.saveSettings();
					})
			)
			.addButton((button) =>
				button.setButtonText('Restore default').onClick(async () => {
					this.plugin.settings.lineWidth = 2;
					await this.plugin.saveSettings();
					this.display();
					new Notice('Default line width restored');
				})
			);

		// Event spacing
		new Setting(containerEl)
			.setName('Event spacing')
			.setDesc('Spacing between timeline events')
			.addSlider((slider) =>
				slider
					.setLimits(10, 40, 5)
					.setValue(this.plugin.settings.itemSpacing)
					.setDynamicTooltip()
					.onChange(async (value: number) => {
						this.plugin.settings.itemSpacing = value;
						await this.plugin.saveSettings();
					})
			)
			.addButton((button) =>
				button.setButtonText('Restore default').onClick(async () => {
					this.plugin.settings.itemSpacing = 20;
					await this.plugin.saveSettings();
					this.display();
					new Notice('Default event spacing restored');
				})
			);

		// Auto collapse
		new Setting(containerEl)
			.setName('Auto collapse')
			.setDesc(
				'Auto-collapse timeline when events exceed threshold, showing only events closest to today'
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoCollapse)
					.onChange(async (value: boolean) => {
						this.plugin.settings.autoCollapse = value;
						await this.plugin.saveSettings();
					})
			);

		// Collapse threshold
		new Setting(containerEl)
			.setName('Collapse threshold')
			.setDesc('Number of events that triggers auto-collapse')
			.addSlider((slider) =>
				slider
					.setLimits(5, 50, 5)
					.setValue(this.plugin.settings.collapseThreshold)
					.setDynamicTooltip()
					.onChange(async (value: number) => {
						this.plugin.settings.collapseThreshold = value;
						await this.plugin.saveSettings();
					})
			)
			.addButton((button) =>
				button.setButtonText('Restore default').onClick(async () => {
					this.plugin.settings.collapseThreshold = 10;
					await this.plugin.saveSettings();
					this.display();
					new Notice('Default collapse threshold restored');
				})
			);

		// Show count when collapsed
		new Setting(containerEl)
			.setName('Show when collapsed')
			.setDesc('Number of events to show when collapsed')
			.addSlider((slider) =>
				slider
					.setLimits(1, 15, 1)
					.setValue(this.plugin.settings.collapseShowCount)
					.setDynamicTooltip()
					.onChange(async (value: number) => {
						this.plugin.settings.collapseShowCount = value;
						await this.plugin.saveSettings();
					})
			)
			.addButton((button) =>
				button.setButtonText('Restore default').onClick(async () => {
					this.plugin.settings.collapseShowCount = 5;
					await this.plugin.saveSettings();
					this.display();
					new Notice('Default show count restored');
				})
			);
	}
}
