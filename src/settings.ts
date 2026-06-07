import { type App, Notice, PluginSettingTab, Setting, type SliderComponent, TextComponent } from 'obsidian';
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
		const colorRow = colorSetting.controlEl.createEl('div', {
			cls: 'timeline-color-setting-container',
		});

		const colorPreview = colorRow.createEl('div', {
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
		const presetsRow = colorSetting.controlEl.createEl('div', {
			cls: 'timeline-color-presets-row',
		});

		for (const preset of COLOR_PRESETS) {
			const presetButton = presetsRow.createEl('div', {
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
						.setDynamicTooltip()
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
						.setDynamicTooltip()
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
						.setDynamicTooltip()
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
						.setDynamicTooltip()
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
						.setDynamicTooltip()
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
						.setDynamicTooltip()
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
}
