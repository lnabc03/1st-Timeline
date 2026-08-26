import { type App, Notice, PluginSettingTab, Setting, type SettingDefinitionItem, type SliderComponent, TextComponent } from 'obsidian';
import type TimelinePlugin from './main';
import { COLOR_PRESETS } from './constants';
import { t } from './i18n';

export interface TimelinePluginSettings {
	sortDirection: 'asc' | 'desc';
	timelineColor: string;
	dotSize: number;
	lineWidth: number;
	itemSpacing: number;
	showTooltip: boolean;
	tooltipDelay: number;
	highlightToday: boolean;
	showRangeEndpoints: boolean;
	createdDateField: string;
	autoCollapse: boolean;
	collapseThreshold: number;
	collapseShowCount: number;
}

export const DEFAULT_SETTINGS: TimelinePluginSettings = {
	sortDirection: 'asc',
	timelineColor: '#9370DB',
	dotSize: 12,
	lineWidth: 2,
	itemSpacing: 20,
	showTooltip: true,
	tooltipDelay: 500,
	highlightToday: true,
	showRangeEndpoints: true,
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
		const T = t();

		new Setting(containerEl)
			.setName(T.headingFirstTimeline)
			.setHeading();

		new Setting(containerEl)
			.setName(T.sortDirection)
			.setDesc(T.sortDirectionDesc)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('asc', T.sortDirectionAscLabel)
					.addOption('desc', T.sortDirectionDescLabel)
					.setValue(this.plugin.settings.sortDirection)
					.onChange(async (value: string) => {
						this.plugin.settings.sortDirection = value as 'asc' | 'desc';
						await this.plugin.saveSettings();
					})
			);

		let createdDateFieldComponent: TextComponent;

		new Setting(containerEl)
			.setName(T.datePropertyForNotes)
			.setDesc(T.datePropertyDesc)
			.addText((text) => {
				createdDateFieldComponent = text;
				return text
					.setValue(this.plugin.settings.createdDateField)
					.onChange(async (value: string) => {
						this.plugin.settings.createdDateField = value;
						await this.plugin.saveSettings();
					});
			})
			.addButton((button) =>
				button.setButtonText(T.restoreDefault).onClick(async () => {
					this.plugin.settings.createdDateField = 'created';
					await this.plugin.saveSettings();
					createdDateFieldComponent.setValue('created');
					new Notice(T.noticeDefaultRestored);
				})
			);

		// Color settings with preset buttons
		const colorSetting = new Setting(containerEl)
			.setName(T.timelineColor)
			.setDesc(T.timelineColorDesc);

		// Row 1: color preview circle + bare text input
		const colorRow = colorSetting.controlEl.createDiv({
			cls: 'timeline-color-setting-container',
		});

		const colorPreview = colorRow.createDiv({
			cls: 'timeline-color-preview',
		});
		colorPreview.style.backgroundColor = this.plugin.settings.timelineColor;

		const colorInputEl = colorRow.createEl('input', {
			cls: 'timeline-color-input',
			attr: {
				type: 'text',
				value: this.plugin.settings.timelineColor,
			},
		});
		colorInputEl.addEventListener('input', () => {
			void (async () => {
				this.plugin.settings.timelineColor = colorInputEl.value;
				await this.plugin.saveSettings();
				colorPreview.style.backgroundColor = colorInputEl.value;
			})();
		});

		// Row 2: preset color buttons
		const presetsRow = colorSetting.controlEl.createDiv({
			cls: 'timeline-color-presets-row',
		});

		for (const preset of COLOR_PRESETS) {
			const presetButton = presetsRow.createDiv({
				cls: 'timeline-preset-color',
				attr: {
					'data-color': preset.value,
					title: preset.name,
					style: `background-color: ${preset.value};`,
				},
			});

			this.plugin.registerDomEvent(presetButton, 'click', async () => {
				this.plugin.settings.timelineColor = preset.value;
				await this.plugin.saveSettings();
				colorInputEl.value = preset.value;
				colorPreview.style.backgroundColor = preset.value;
				new Notice(T.noticeSetToTheme(preset.name));
			});
		}

			// Hover tooltip
			new Setting(containerEl)
				.setName(T.hoverTooltip)
				.setDesc(T.hoverTooltipDesc)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.showTooltip)
						.onChange(async (value: boolean) => {
							this.plugin.settings.showTooltip = value;
							await this.plugin.saveSettings();
						})
				);

			// Hover delay
			let tooltipDelaySlider: SliderComponent;

			new Setting(containerEl)
				.setName(T.hoverDelay)
				.setDesc(T.hoverDelayDesc)
				.addSlider((slider) => {
					tooltipDelaySlider = slider;
					return slider
						.setLimits(0, 1000, 100)
						.setValue(this.plugin.settings.tooltipDelay)
						.onChange(async (value: number) => {
							this.plugin.settings.tooltipDelay = value;
							await this.plugin.saveSettings();
						});
				})
				.addButton((button) =>
					button.setButtonText(T.restoreDefault).onClick(async () => {
						this.plugin.settings.tooltipDelay = 500;
						await this.plugin.saveSettings();
						tooltipDelaySlider.setValue(500);
						new Notice(T.noticeHoverDelayRestored);
					})
				);

			// Highlight today
			new Setting(containerEl)
				.setName(T.highlightToday)
				.setDesc(T.highlightTodayDesc)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.highlightToday)
						.onChange(async (value: boolean) => {
							this.plugin.settings.highlightToday = value;
							await this.plugin.saveSettings();
						})
				);

			// Range start/end markers
			new Setting(containerEl)
				.setName(T.showRangeEndpoints)
				.setDesc(T.showRangeEndpointsDesc)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.showRangeEndpoints)
						.onChange(async (value: boolean) => {
							this.plugin.settings.showRangeEndpoints = value;
							await this.plugin.saveSettings();
						})
				);

			// Dot size
			let dotSizeSlider: SliderComponent;

			new Setting(containerEl)
				.setName(T.dotSize)
				.setDesc(T.dotSizeDesc)
				.addSlider((slider) => {
					dotSizeSlider = slider;
					return slider
						.setLimits(6, 20, 2)
						.setValue(this.plugin.settings.dotSize)
						.onChange(async (value: number) => {
							this.plugin.settings.dotSize = value;
							await this.plugin.saveSettings();
						});
				})
				.addButton((button) =>
					button.setButtonText(T.restoreDefault).onClick(async () => {
						this.plugin.settings.dotSize = 12;
						await this.plugin.saveSettings();
						dotSizeSlider.setValue(12);
						new Notice(T.noticeDotSizeRestored);
					})
				);

			// Line width
			let lineWidthSlider: SliderComponent;

			new Setting(containerEl)
				.setName(T.lineWidth)
				.setDesc(T.lineWidthDesc)
				.addSlider((slider) => {
					lineWidthSlider = slider;
					return slider
						.setLimits(1, 5, 1)
						.setValue(this.plugin.settings.lineWidth)
						.onChange(async (value: number) => {
							this.plugin.settings.lineWidth = value;
							await this.plugin.saveSettings();
						});
				})
				.addButton((button) =>
					button.setButtonText(T.restoreDefault).onClick(async () => {
						this.plugin.settings.lineWidth = 2;
						await this.plugin.saveSettings();
						lineWidthSlider.setValue(2);
						new Notice(T.noticeLineWidthRestored);
					})
				);

			// Event spacing
			let itemSpacingSlider: SliderComponent;

			new Setting(containerEl)
				.setName(T.eventSpacing)
				.setDesc(T.eventSpacingDesc)
				.addSlider((slider) => {
					itemSpacingSlider = slider;
					return slider
						.setLimits(10, 40, 5)
						.setValue(this.plugin.settings.itemSpacing)
						.onChange(async (value: number) => {
							this.plugin.settings.itemSpacing = value;
							await this.plugin.saveSettings();
						});
				})
				.addButton((button) =>
					button.setButtonText(T.restoreDefault).onClick(async () => {
						this.plugin.settings.itemSpacing = 20;
						await this.plugin.saveSettings();
						itemSpacingSlider.setValue(20);
						new Notice(T.noticeEventSpacingRestored);
					})
				);

			// Auto collapse
			new Setting(containerEl)
				.setName(T.autoCollapse)
				.setDesc(T.autoCollapseDesc)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.autoCollapse)
						.onChange(async (value: boolean) => {
							this.plugin.settings.autoCollapse = value;
							await this.plugin.saveSettings();
						})
				);

			// Collapse threshold
			let collapseThresholdSlider: SliderComponent;

			new Setting(containerEl)
				.setName(T.collapseThreshold)
				.setDesc(T.collapseThresholdDesc)
				.addSlider((slider) => {
					collapseThresholdSlider = slider;
					return slider
						.setLimits(5, 50, 5)
						.setValue(this.plugin.settings.collapseThreshold)
						.onChange(async (value: number) => {
							this.plugin.settings.collapseThreshold = value;
							await this.plugin.saveSettings();
						});
				})
				.addButton((button) =>
					button.setButtonText(T.restoreDefault).onClick(async () => {
						this.plugin.settings.collapseThreshold = 10;
						await this.plugin.saveSettings();
						collapseThresholdSlider.setValue(10);
						new Notice(T.noticeCollapseThresholdRestored);
					})
				);

			// Show count when collapsed
			let collapseShowCountSlider: SliderComponent;

			new Setting(containerEl)
				.setName(T.showWhenCollapsed)
				.setDesc(T.showWhenCollapsedDesc)
				.addSlider((slider) => {
					collapseShowCountSlider = slider;
					return slider
						.setLimits(1, 15, 1)
						.setValue(this.plugin.settings.collapseShowCount)
						.onChange(async (value: number) => {
							this.plugin.settings.collapseShowCount = value;
							await this.plugin.saveSettings();
						});
				})
				.addButton((button) =>
					button.setButtonText(T.restoreDefault).onClick(async () => {
						this.plugin.settings.collapseShowCount = 5;
						await this.plugin.saveSettings();
						collapseShowCountSlider.setValue(5);
						new Notice(T.noticeShowCountRestored);
					})
				);
	}

	/**
	 * Declarative settings for Obsidian 1.13.0+ settings search.
	 * display() above still renders the custom UI (color presets,
	 * restore-default buttons); these definitions mirror the simple
	 * controls so they appear in settings search. Values bind directly
	 * to plugin.settings via the default get/setControlValue.
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		const T = t();
		return [
			{
				name: T.sortDirection,
				desc: T.sortDirectionDesc,
				control: {
					type: 'dropdown',
					key: 'sortDirection',
					options: {
						asc: T.sortDirectionAscLabel,
						desc: T.sortDirectionDescLabel,
					},
				},
			},
			{
				name: T.datePropertyForNotes,
				desc: T.datePropertyDesc,
				control: { type: 'text', key: 'createdDateField' },
			},
			{
				name: T.timelineColor,
				desc: T.timelineColorDesc,
				control: { type: 'color', key: 'timelineColor' },
			},
			{
				name: T.dotSize,
				desc: T.dotSizeDesc,
				control: {
					type: 'slider',
					key: 'dotSize',
					min: 6,
					max: 20,
					step: 2,
				},
			},
			{
				name: T.lineWidth,
				desc: T.lineWidthDesc,
				control: {
					type: 'slider',
					key: 'lineWidth',
					min: 1,
					max: 5,
					step: 1,
				},
			},
			{
				name: T.eventSpacing,
				desc: T.eventSpacingDesc,
				control: {
					type: 'slider',
					key: 'itemSpacing',
					min: 10,
					max: 40,
					step: 5,
				},
			},
			{
				name: T.hoverTooltip,
				desc: T.hoverTooltipDesc,
				control: { type: 'toggle', key: 'showTooltip' },
			},
			{
				name: T.hoverDelay,
				desc: T.hoverDelayDesc,
				control: {
					type: 'slider',
					key: 'tooltipDelay',
					min: 0,
					max: 1000,
					step: 100,
				},
			},
			{
				name: T.highlightToday,
				desc: T.highlightTodayDesc,
				control: { type: 'toggle', key: 'highlightToday' },
			},
			{
				name: T.showRangeEndpoints,
				desc: T.showRangeEndpointsDesc,
				control: { type: 'toggle', key: 'showRangeEndpoints' },
			},
			{
				name: T.autoCollapse,
				desc: T.autoCollapseDesc,
				control: { type: 'toggle', key: 'autoCollapse' },
			},
			{
				name: T.collapseThreshold,
				desc: T.collapseThresholdDesc,
				control: {
					type: 'slider',
					key: 'collapseThreshold',
					min: 5,
					max: 50,
					step: 5,
				},
			},
			{
				name: T.showWhenCollapsed,
				desc: T.showWhenCollapsedDesc,
				control: {
					type: 'slider',
					key: 'collapseShowCount',
					min: 1,
					max: 15,
					step: 1,
				},
			},
		];
	}
}
