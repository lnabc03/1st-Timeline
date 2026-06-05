import { type App, Notice, PluginSettingTab, Setting, TextComponent } from 'obsidian';
import type TimelinePlugin from './main';
import { COLOR_PRESETS } from './constants';

/* eslint-disable obsidianmd/ui/sentence-case */

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

	/* eslint-disable @typescript-eslint/no-deprecated */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('1st-Timeline 设置')
			.setHeading();

		new Setting(containerEl)
			.setName('排序方向')
			.setDesc('选择时间轴事件的排序方向')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('asc', '升序 (从早到晚)')
					.addOption('desc', '降序 (从晚到早)')
					.setValue(this.plugin.settings.sortDirection)
					.onChange(async (value: string) => {
						this.plugin.settings.sortDirection = value as 'asc' | 'desc';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('用于笔记汇总的属性')
			.setDesc('该属性需包含"YYYY-MM-DD"格式的日期信息')
			.addText((text) =>
				text
					.setValue(this.plugin.settings.createdDateField)
					.onChange(async (value: string) => {
						this.plugin.settings.createdDateField = value;
						await this.plugin.saveSettings();
					})
			)
			.addButton((button) =>
				button.setButtonText('恢复默认').onClick(async () => {
					this.plugin.settings.createdDateField = 'created';
					await this.plugin.saveSettings();
					this.display();
					new Notice('已恢复默认属性名称');
				})
			);

		// 颜色设置（含预设按钮）
		const colorSetting = new Setting(containerEl)
			.setName('时间轴颜色')
			.setDesc('设置时间轴和时间点的颜色');

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
				new Notice(`已设置为${preset.name}主题`);
			});
		}

		// 悬停提示框
		new Setting(containerEl)
			.setName('悬停提示框')
			.setDesc('启用后，鼠标悬停在事件上将显示距今天数')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showTooltip)
					.onChange(async (value: boolean) => {
						this.plugin.settings.showTooltip = value;
						await this.plugin.saveSettings();
					})
			);

		// 悬停延迟
		new Setting(containerEl)
			.setName('悬停延迟')
			.setDesc('设置悬停提示框出现前的延迟时间(毫秒)')
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
				button.setButtonText('恢复默认').onClick(async () => {
					this.plugin.settings.tooltipDelay = 500;
					await this.plugin.saveSettings();
					this.display();
					new Notice('已恢复默认悬停延迟');
				})
			);

		// 当天事件高亮
		new Setting(containerEl)
			.setName('当天事件高亮')
			.setDesc('启用后，将特殊标记当天的事件')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.highlightToday)
					.onChange(async (value: boolean) => {
						this.plugin.settings.highlightToday = value;
						await this.plugin.saveSettings();
					})
			);

		// 时间点大小
		new Setting(containerEl)
			.setName('时间点大小')
			.setDesc('设置时间轴上点的大小')
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
				button.setButtonText('恢复默认').onClick(async () => {
					this.plugin.settings.dotSize = 12;
					await this.plugin.saveSettings();
					this.display();
					new Notice('已恢复默认时间点大小');
				})
			);

		// 线条宽度
		new Setting(containerEl)
			.setName('线条宽度')
			.setDesc('设置时间轴线条的宽度')
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
				button.setButtonText('恢复默认').onClick(async () => {
					this.plugin.settings.lineWidth = 2;
					await this.plugin.saveSettings();
					this.display();
					new Notice('已恢复默认线条宽度');
				})
			);

		// 事件间距
		new Setting(containerEl)
			.setName('事件间距')
			.setDesc('设置时间轴事件之间的间距')
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
				button.setButtonText('恢复默认').onClick(async () => {
					this.plugin.settings.itemSpacing = 20;
					await this.plugin.saveSettings();
					this.display();
					new Notice('已恢复默认事件间距');
				})
			);

		// 自动折叠
		new Setting(containerEl)
			.setName('自动折叠')
			.setDesc(
				'启用后，当事件数量超过阈值时自动折叠时间轴，仅显示距今天最近的事件'
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoCollapse)
					.onChange(async (value: boolean) => {
						this.plugin.settings.autoCollapse = value;
						await this.plugin.saveSettings();
					})
			);

		// 折叠阈值
		new Setting(containerEl)
			.setName('折叠阈值')
			.setDesc('事件数量达到此值时触发自动折叠')
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
				button.setButtonText('恢复默认').onClick(async () => {
					this.plugin.settings.collapseThreshold = 10;
					await this.plugin.saveSettings();
					this.display();
					new Notice('已恢复默认折叠阈值');
				})
			);

		// 折叠时显示数量
		new Setting(containerEl)
			.setName('折叠时显示数量')
			.setDesc('折叠后显示距今天最近的事件数量')
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
				button.setButtonText('恢复默认').onClick(async () => {
					this.plugin.settings.collapseShowCount = 5;
					await this.plugin.saveSettings();
					this.display();
					new Notice('已恢复默认折叠显示数量');
				})
			);
	/* eslint-enable @typescript-eslint/no-deprecated */
	}
}
