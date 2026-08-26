import { type App, Notice, PluginSettingTab, Setting, type SettingControl, type SettingDefinitionItem, type SliderComponent, TextComponent } from 'obsidian';
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

type ToggleKey = 'showTooltip' | 'highlightToday' | 'showRangeEndpoints' | 'autoCollapse';
type SliderKey = 'tooltipDelay' | 'dotSize' | 'lineWidth' | 'itemSpacing' | 'collapseThreshold' | 'collapseShowCount';

/**
 * 一行设置项的描述：name/desc 用于渲染与搜索；
 * control 存在时新设置界面（1.13+）使用标准控件渲染，
 * 否则用 build 作为 render 项命令式渲染（自定义控件，
 * 如预设色按钮、恢复默认按钮）；旧版 Obsidian 的 display()
 * 一律走 build。
 */
interface RowDef {
	name: string;
	desc: string;
	control?: SettingControl;
	build: (setting: Setting) => void;
}

export class TimelineSettingTab extends PluginSettingTab {
	plugin: TimelinePlugin;

	constructor(app: App, plugin: TimelinePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/* ---- 行构建器：display() 与 getSettingDefinitions() 的 render 项共用 ---- */

	private buildSortDirection(setting: Setting): void {
		const T = t();
		setting.addDropdown((dropdown) =>
			dropdown
				.addOption('asc', T.sortDirectionAscLabel)
				.addOption('desc', T.sortDirectionDescLabel)
				.setValue(this.plugin.settings.sortDirection)
				.onChange(async (value: string) => {
					this.plugin.settings.sortDirection = value as 'asc' | 'desc';
					await this.plugin.saveSettings();
				})
		);
	}

	private buildCreatedDateField(setting: Setting): void {
		const T = t();
		let textComponent: TextComponent;
		setting
			.addText((text) => {
				textComponent = text;
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
					textComponent.setValue('created');
					new Notice(T.noticeDefaultRestored);
				})
			);
	}

	private buildTimelineColor(setting: Setting): void {
		const T = t();

		// 第 1 行：颜色预览圆点 + 十六进制输入框
		const colorRow = setting.controlEl.createDiv({
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

		// 第 2 行：预设色按钮
		const presetsRow = setting.controlEl.createDiv({
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
	}

	private buildToggle(setting: Setting, key: ToggleKey): void {
		setting.addToggle((toggle) =>
			toggle
				.setValue(this.plugin.settings[key])
				.onChange(async (value: boolean) => {
					this.plugin.settings[key] = value;
					await this.plugin.saveSettings();
				})
		);
	}

	private buildSliderWithReset(
		setting: Setting,
		key: SliderKey,
		min: number,
		max: number,
		step: number,
		defaultValue: number,
		restoreNotice: string
	): void {
		const T = t();
		let sliderComponent: SliderComponent;
		setting
			.addSlider((slider) => {
				sliderComponent = slider;
				return slider
					.setLimits(min, max, step)
					.setValue(this.plugin.settings[key])
					.onChange(async (value: number) => {
						this.plugin.settings[key] = value;
						await this.plugin.saveSettings();
					});
			})
			.addButton((button) =>
				button.setButtonText(T.restoreDefault).onClick(async () => {
					this.plugin.settings[key] = defaultValue;
					await this.plugin.saveSettings();
					sliderComponent.setValue(defaultValue);
					new Notice(restoreNotice);
				})
			);
	}

	/** 所有设置行（单一数据源，display 与 definitions 共用） */
	private rowDefs(): RowDef[] {
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
				build: (s) => this.buildSortDirection(s),
			},
			{
				name: T.datePropertyForNotes,
				desc: T.datePropertyDesc,
				build: (s) => this.buildCreatedDateField(s),
			},
			{
				name: T.timelineColor,
				desc: T.timelineColorDesc,
				build: (s) => this.buildTimelineColor(s),
			},
			{
				name: T.hoverTooltip,
				desc: T.hoverTooltipDesc,
				control: { type: 'toggle', key: 'showTooltip' },
				build: (s) => this.buildToggle(s, 'showTooltip'),
			},
			{
				name: T.hoverDelay,
				desc: T.hoverDelayDesc,
				build: (s) =>
					this.buildSliderWithReset(s, 'tooltipDelay', 0, 1000, 100, 500, T.noticeHoverDelayRestored),
			},
			{
				name: T.highlightToday,
				desc: T.highlightTodayDesc,
				control: { type: 'toggle', key: 'highlightToday' },
				build: (s) => this.buildToggle(s, 'highlightToday'),
			},
			{
				name: T.showRangeEndpoints,
				desc: T.showRangeEndpointsDesc,
				control: { type: 'toggle', key: 'showRangeEndpoints' },
				build: (s) => this.buildToggle(s, 'showRangeEndpoints'),
			},
			{
				name: T.dotSize,
				desc: T.dotSizeDesc,
				build: (s) =>
					this.buildSliderWithReset(s, 'dotSize', 6, 20, 2, 12, T.noticeDotSizeRestored),
			},
			{
				name: T.lineWidth,
				desc: T.lineWidthDesc,
				build: (s) =>
					this.buildSliderWithReset(s, 'lineWidth', 1, 5, 1, 2, T.noticeLineWidthRestored),
			},
			{
				name: T.eventSpacing,
				desc: T.eventSpacingDesc,
				build: (s) =>
					this.buildSliderWithReset(s, 'itemSpacing', 10, 40, 5, 20, T.noticeEventSpacingRestored),
			},
			{
				name: T.autoCollapse,
				desc: T.autoCollapseDesc,
				control: { type: 'toggle', key: 'autoCollapse' },
				build: (s) => this.buildToggle(s, 'autoCollapse'),
			},
			{
				name: T.collapseThreshold,
				desc: T.collapseThresholdDesc,
				build: (s) =>
					this.buildSliderWithReset(s, 'collapseThreshold', 5, 50, 5, 10, T.noticeCollapseThresholdRestored),
			},
			{
				name: T.showWhenCollapsed,
				desc: T.showWhenCollapsedDesc,
				build: (s) =>
					this.buildSliderWithReset(s, 'collapseShowCount', 1, 15, 1, 5, T.noticeShowCountRestored),
			},
		];
	}

	/**
	 * 旧版 Obsidian（<1.13）的设置页：逐行构建自定义 UI。
	 * 新版设置界面改用 getSettingDefinitions() 渲染，此方法不再被调用。
	 */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const T = t();

		new Setting(containerEl)
			.setName(T.headingFirstTimeline)
			.setHeading();

		for (const row of this.rowDefs()) {
			row.build(new Setting(containerEl).setName(row.name).setDesc(row.desc));
		}
	}

	/**
	 * Obsidian 1.13+ 的设置界面由此渲染（含设置搜索）。
	 * 标准控件（dropdown/toggle）用 control 声明，由框架绑定
	 * plugin.settings；含自定义控件的行（预设色、恢复默认按钮）
	 * 用 render 项复用 display() 的同一套构建器。
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return this.rowDefs().map((row): SettingDefinitionItem => {
			if (row.control) {
				return { name: row.name, desc: row.desc, control: row.control };
			}
			return {
				name: row.name,
				desc: row.desc,
				render: (setting: Setting) => {
					row.build(setting);
				},
			};
		});
	}
}
