const { Plugin, MarkdownRenderer, PluginSettingTab, Setting, Notice, Modal, TextComponent } = require('obsidian');

class TimelinePlugin extends Plugin {
  // 默认设置
  settings = {
    sortDirection: 'asc',
    timelineColor: '#5588cc',
    dotSize: 12,
    lineWidth: 2,
    itemSpacing: 20,
    showTooltip: true,         // 新增：是否显示悬停提示
    tooltipDelay: 500,        // 新增：悬停延迟时间（毫秒）
    highlightToday: true,       // 新增：是否高亮当天事件
    createdDateField: 'created' // 新增：用于笔记汇总的属性名称
  }
  // 添加默认颜色预设
  colorPresets = [
    { name: '蓝色', value: '#5588cc' },
    { name: '绿色', value: '#50C878' },
    { name: '紫色', value: '#9370DB' },
    { name: '红色', value: '#FF6B6B' },
    { name: '橙色', value: '#FF8C42' },
  ]
  async onload() {
    console.log('加载 1st-Timeline 插件');
    await this.loadSettings();
    this.addSettingTab(new TimelineSettingTab(this.app, this));

    // 注册笔记汇总命令
    this.addCommand({
      id: 'generate-notes-timeline',
      name: '笔记汇总',
      callback: () => {
        new DateRangeModal(this.app, this).open();
      }
    });

    this.registerMarkdownCodeBlockProcessor('timeline', (source, el, ctx) => {
      const events = [];
      const lines = source.split('\n');

      let currentEvent = null;
      let currentContent = [];

      const singleLineRegex = /^(.+?)(  |：|:)(.*)$/;

      for (const line of lines) {
        const trimmedLine = line.trim();

        // 跳过完全是空字符串的行
        if (trimmedLine === '') {
          // 如果正在处理一个事件，则空行被视作内容的一部分
          if (currentEvent) {
            currentContent.push(line);
          }
          continue;
        }

        let dateMatch = false;
        let dateTimeStr = '';
        let contentStr = '';

        // 尝试匹配单行事件格式 (日期 + 分隔符 + 内容)
        const singleLineMatch = trimmedLine.match(singleLineRegex);

        if (singleLineMatch) {
          const potentialDate = singleLineMatch[1].trim();
          if (this.parseDateTime(potentialDate)) {
            dateTimeStr = potentialDate;
            contentStr = singleLineMatch[3].trim();
            dateMatch = true;
          }
        }

        // 如果单行匹配失败，尝试将整行作为日期（用于多行事件格式）
        if (!dateMatch && this.parseDateTime(trimmedLine)) {
          dateTimeStr = trimmedLine;
          contentStr = '';
          dateMatch = true;
        }

        // 如果是一个新的日期事件行
        if (dateMatch) {
          // 保存上一个事件
          if (currentEvent) {
            currentEvent.content = currentContent.join('\n').trim();
            if (currentEvent.content || contentStr) { // 仅当有内容时添加
              events.push(currentEvent);
            }
          }

          // 创建新事件
          const parsedDateTime = this.parseDateTime(dateTimeStr);
          currentEvent = {
            date: parsedDateTime.date,
            displayDate: parsedDateTime.display,
            originalDate: dateTimeStr,
            content: '' // 暂时为空，后续填充
          };
          currentContent = contentStr ? [contentStr] : [];

        } else if (currentEvent) {
          // 如果不是日期行，则将其作为当前事件的内容
          currentContent.push(line);
        }
      }

      // 添加最后一个事件
      if (currentEvent) {
        currentEvent.content = currentContent.join('\n').trim();
        if (currentEvent.content) {
          events.push(currentEvent);
        }
      }

      // 排序事件
      events.sort((a, b) => {
        const direction = this.settings.sortDirection === 'asc' ? 1 : -1;
        return direction * (a.date.getTime() - b.date.getTime());
      });

      const timelineContainer = el.createEl('div', {
        cls: 'timeline-container',
        attr: {
          style: `--timeline-color: ${this.settings.timelineColor}; --dot-size: ${this.settings.dotSize}px; --line-width: ${this.settings.lineWidth}px; --item-spacing: ${this.settings.itemSpacing}px;`
        }
      });

      // 如果源文本不为空但没有解析出任何事件，则显示错误提示
      if (events.length === 0 && source.trim() !== '') {
        const errorEl = timelineContainer.createEl('div', { cls: 'timeline-error' });
        errorEl.createEl('strong', { text: '1st-Timeline 解析错误' });
        errorEl.createEl('p', { text: '未能解析出任何有效事件。请检查您的语法是否符合以下格式之一：' });
        const listEl = errorEl.createEl('ul');
        listEl.createEl('li', { text: '日期：事件内容 (使用中文或英文冒号)' });
        listEl.createEl('li', { text: '日期  事件内容 (使用两个空格)' });
        listEl.createEl('li', { text: '日期 (后跟换行和多行内容)' });
        return; // 停止渲染
      }

      // 获取今天的日期（重置为0点以便比较日期）(此部分不变)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (const event of events) {
        // ... 渲染部分的代码保持不变 ...
        const timelineItem = timelineContainer.createEl('div', { cls: 'timeline-item' });
        let displayDate = event.displayDate;
        let dateDisplay = '';
        let timeDisplay = '';
        const chineseMatch = displayDate.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日(.*)$/);
        if (chineseMatch) {
          const [_, year, month, day, timePeriod] = chineseMatch;
          const formattedMonth = month.padStart(2, '0');
          const formattedDay = day.padStart(2, '0');
          dateDisplay = `${year}-${formattedMonth}-${formattedDay}`;
          timeDisplay = timePeriod ? timePeriod.trim() : '';
        } else if (displayDate.includes('_')) {
          const [date, time] = displayDate.split('_');
          dateDisplay = date;
          timeDisplay = time;
        } else {
          dateDisplay = displayDate;
        }
        displayDate = timeDisplay ? `${dateDisplay}\n${timeDisplay}` : dateDisplay;
        timelineItem.createEl('div', {
          cls: 'timeline-date',
          text: displayDate
        });
        timelineItem.createEl('div', { cls: 'timeline-dot' });
        const contentEl = timelineItem.createEl('div', { cls: 'timeline-content' });
        // 检查是否为当天事件并添加高亮
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        const timeDiff = eventDate.getTime() - today.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        if (daysDiff === 0 && this.settings.highlightToday) {
          contentEl.addClass('timeline-today');
        }
        // 添加悬停提示功能
        if (this.settings.showTooltip) {
          const tooltipEl = contentEl.createEl('div', { cls: 'timeline-tooltip' });

          if (daysDiff === 0) {
            tooltipEl.setText('今天');
          } else if (daysDiff > 0) {
            tooltipEl.setText(`距今还有 ${daysDiff} 天`);
          } else {
            tooltipEl.setText(`已过去 ${Math.abs(daysDiff)} 天`);
          }
          let hoverTimer = null;

          contentEl.addEventListener('mouseenter', () => {
            hoverTimer = setTimeout(() => {
              tooltipEl.addClass('visible');
            }, this.settings.tooltipDelay);
          });

          contentEl.addEventListener('mouseleave', () => {
            if (hoverTimer) {
              clearTimeout(hoverTimer);
              hoverTimer = null;
            }
            tooltipEl.removeClass('visible');
          });
        }
        MarkdownRenderer.renderMarkdown(
          event.content,
          contentEl,
          ctx.sourcePath,
          this
        );
      }
    });
  }

  onunload() {
    console.log('卸载 1st-Timeline 插件');
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async loadSettings() {
    this.settings = Object.assign({}, this.settings, await this.loadData());
  }

  // 解析日期和时间
  parseDateTime(dateTimeStr) {
    let date = null;
    let displayStr = dateTimeStr;

    // 处理格式1: YYYY-MM-DD_HH:MM
    if (dateTimeStr.includes('_') && dateTimeStr.includes('-')) {
      const [dateStr, timeStr] = dateTimeStr.split('_');
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr) && /^\d{1,2}:\d{1,2}$/.test(timeStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hour, minute] = timeStr.split(':').map(Number);
        date = new Date(year, month - 1, day, hour, minute);
        displayStr = `${dateStr} ${timeStr}`;
        return { date, display: displayStr };
      }
    }

    // 处理格式2: YYYY年MM月DD日[时间词]
    const chineseMatch = dateTimeStr.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日(.*)$/);
    if (chineseMatch) {
      const [_, year, month, day, timePeriod] = chineseMatch;
      date = new Date(Number(year), Number(month) - 1, Number(day));

      // 根据中文时间词调整小时
      if (timePeriod) {
        if (timePeriod.includes('早上')) {
          date.setHours(7);
        } else if (timePeriod.includes('上午')) {
          date.setHours(10);
        } else if (timePeriod.includes('中午')) {
          date.setHours(12);
        } else if (timePeriod.includes('下午')) {
          date.setHours(15);
        } else if (timePeriod.includes('晚上')) {
          date.setHours(20);
        }
      }

      return { date, display: dateTimeStr };
    }

    // 处理基本格式: YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateTimeStr)) {
      const [year, month, day] = dateTimeStr.split('-').map(Number);
      date = new Date(year, month - 1, day);
      return { date, display: dateTimeStr };
    }

    // 处理基本中文格式: YYYY年MM月DD日
    const basicChineseMatch = dateTimeStr.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
    if (basicChineseMatch) {
      const [_, year, month, day] = basicChineseMatch;
      date = new Date(Number(year), Number(month) - 1, Number(day));
      return { date, display: dateTimeStr };
    }

    return null;
  }

  // 新增：生成笔记汇总时间轴
  async generateNotesTimeline(startDate, endDate) {
    try {
      // 获取所有笔记文件
      const files = this.app.vault.getMarkdownFiles();

      // 用于存储按日期分组的笔记
      const notesByDate = {};

      // 解析日期范围
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // 遍历所有笔记
      for (const file of files) {
        try {
          // 读取笔记的frontmatter
          const metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;

          if (metadata && metadata[this.settings.createdDateField]) {
            // 解析创建日期
            let createdDate;
            const dateValue = metadata[this.settings.createdDateField];

            // 处理不同格式的日期
            if (typeof dateValue === 'string' && dateValue.includes('_')) {
              // 处理 YYYY-MM-DD_HH:MM 格式
              const [dateStr] = dateValue.split('_');
              createdDate = new Date(dateStr);
            } else if (typeof dateValue === 'string') {
              // 尝试解析其他字符串格式
              createdDate = new Date(dateValue);
            } else if (dateValue instanceof Date) {
              // 直接使用日期对象
              createdDate = dateValue;
            }

            // 检查日期是否有效并在指定范围内
            if (createdDate && !isNaN(createdDate) &&
              createdDate >= start && createdDate <= end) {

              // 将日期格式化为 YYYY-MM-DD
              const dateKey = createdDate.toISOString().split('T')[0];

              // 将笔记添加到对应日期
              if (!notesByDate[dateKey]) {
                notesByDate[dateKey] = [];
              }
              notesByDate[dateKey].push(file);
            }
          }
        } catch (err) {
          console.error(`处理笔记 ${file.path} 时出错:`, err);
        }
      }

      // 生成时间轴代码块内容
      let timelineContent = '';

      // 按日期排序
      const sortedDates = Object.keys(notesByDate).sort();
      if (this.settings.sortDirection === 'desc') {
        sortedDates.reverse();
      }

      // 构建时间轴内容
      for (const dateKey of sortedDates) {
        const notes = notesByDate[dateKey];
        if (notes && notes.length > 0) {
          timelineContent += `${dateKey}  \n`;
          for (const note of notes) {
            // 使用文件名作为链接文本
            const fileName = note.basename;
            timelineContent += `- [[${fileName}]]\n`;
          }
          timelineContent += '\n';
        }
      }

      // 如果没有找到任何笔记
      if (!timelineContent) {
        return `所选日期范围内没有找到任何笔记。`;
      }

      return timelineContent;
    } catch (err) {
      console.error('生成笔记汇总时出错:', err);
      return `生成笔记汇总时出错: ${err.message}`;
    }
  }
}

// 日期范围输入对话框
class DateRangeModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: '笔记汇总' });
    const paragraph = contentEl.createEl('p');
    paragraph.appendText('请输入日期范围（YYYY-MM-DD,YYYY-MM-DD）');
    paragraph.appendChild(document.createElement('br'));
    paragraph.appendText(`1st-Timeline将基于时间属性"${this.plugin.settings.createdDateField}"汇总笔记`);

    // 创建日期范围输入框
    const inputContainer = contentEl.createDiv();
    const dateRangeInput = new TextComponent(inputContainer);

    // 设置默认值为当前月份的第一天到最后一天
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    dateRangeInput.setValue(`${formatDate(firstDay)},${formatDate(lastDay)}`);
    dateRangeInput.inputEl.style.width = '100%';

    // 创建按钮容器
    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.marginTop = '1rem';

    // 取消按钮
    buttonContainer.createEl('button', { text: '取消' })
      .addEventListener('click', () => {
        this.close();
      });

    // 确认按钮
    const confirmButton = buttonContainer.createEl('button', {
      text: '确认',
      cls: 'mod-cta'
    });
    confirmButton.style.marginLeft = '0.5rem';

    confirmButton.addEventListener('click', async () => {
      const dateRange = dateRangeInput.getValue().split(',');

      if (dateRange.length !== 2) {
        new Notice('请输入有效的日期范围，格式：YYYY-MM-DD,YYYY-MM-DD');
        return;
      }

      const [startDate, endDate] = dateRange;

      // 验证日期格式
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        new Notice('日期格式无效，请使用 YYYY-MM-DD 格式');
        return;
      }

      // 生成时间轴内容
      const timelineContent = await this.plugin.generateNotesTimeline(startDate, endDate);

      // 获取活动编辑器 - 使用替代方法
      let editor = null;
      const activeLeaf = this.app.workspace.activeLeaf;
      if (activeLeaf && activeLeaf.view && activeLeaf.view.editor) {
        editor = activeLeaf.view.editor;
      }

      if (editor) {
        // 在光标位置插入时间轴代码块
        const cursor = editor.getCursor();
        editor.replaceRange(
          `\`\`\`timeline\n${timelineContent}\`\`\`\n`,
          cursor
        );

        new Notice('笔记汇总时间轴已生成');
      } else {
        new Notice('无法插入时间轴，请确保有打开的编辑器');
      }

      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// 设置选项卡
class TimelineSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: '1st-Timeline 设置' });

    // 排序方向设置 - 移除了恢复默认按钮
    new Setting(containerEl)
      .setName('排序方向')
      .setDesc('选择时间轴事件的排序方向')
      .addDropdown(dropdown => dropdown
        .addOption('asc', '升序 (从早到晚)')
        .addOption('desc', '降序 (从晚到早)')
        .setValue(this.plugin.settings.sortDirection)
        .onChange(async (value) => {
          this.plugin.settings.sortDirection = value;
          await this.plugin.saveSettings();
        }));

    // 笔记汇总属性名称设置
    new Setting(containerEl)
      .setName('用于笔记汇总的属性')
      .setDesc('该属性需包含"YYYY-MM-DD"格式的日期信息')
      .addText(text => text
        .setValue(this.plugin.settings.createdDateField)
        .onChange(async (value) => {
          this.plugin.settings.createdDateField = value;
          await this.plugin.saveSettings();
        }))
      .addButton(button => button
        .setButtonText('恢复默认')
        .onClick(async () => {
          this.plugin.settings.createdDateField = 'created';
          await this.plugin.saveSettings();
          this.display();
          new Notice('已恢复默认属性名称');
        }));

    // 在 TimelineSettingTab 类的 display() 方法中，替换原有的时间轴颜色设置部分

    // 时间轴颜色设置
    const colorSetting = new Setting(containerEl)
      .setName('时间轴颜色')
      .setDesc('设置时间轴和时间点的颜色');

    // 创建颜色设置容器
    const colorSettingControl = colorSetting.controlEl.createEl('div', {
      cls: 'timeline-color-setting-container',
      attr: {
        style: 'display: flex; align-items: center; gap: 8px;'
      }
    });

    // 添加颜色预览
    const colorPreview = colorSettingControl.createEl('div', {
      cls: 'timeline-color-preview',
      attr: {
        style: 'width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--background-modifier-border);'
      }
    });
    colorPreview.style.backgroundColor = this.plugin.settings.timelineColor;

    // 添加文本输入
    let colorInput = new Setting(colorSettingControl)
      .setClass('timeline-color-input')
      .addText(text => text
        .setValue(this.plugin.settings.timelineColor)
        .onChange(async (value) => {
          this.plugin.settings.timelineColor = value;
          await this.plugin.saveSettings();
          colorPreview.style.backgroundColor = value;
        }));

    // 添加预设颜色
    for (const preset of this.plugin.colorPresets) {
      const presetButton = colorSettingControl.createEl('div', {
        cls: 'timeline-preset-color',
        attr: {
          'data-color': preset.value,
          'title': preset.name,
          'style': `background-color: ${preset.value}; width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--background-modifier-border); cursor: pointer; transition: transform 0.2s ease;`
        }
      });

      presetButton.addEventListener('mouseenter', () => {
        presetButton.style.transform = 'scale(1.2)';
      });

      presetButton.addEventListener('mouseleave', () => {
        presetButton.style.transform = 'scale(1)';
      });

      presetButton.addEventListener('click', async () => {
        this.plugin.settings.timelineColor = preset.value;
        await this.plugin.saveSettings();
        colorInput.components[0].setValue(preset.value);
        colorPreview.style.backgroundColor = preset.value;
        new Notice(`已设置为${preset.name}主题`);
      });
    }

    // 添加自定义样式
    const style = document.createElement('style');
    style.textContent = `
  .timeline-color-setting-container .setting-item {
    border: none;
    padding: 0;
  }
  .timeline-color-setting-container .setting-item-control {
    margin-right: 0;
  }
  .timeline-color-input input {
    width: 75px;
  }
`;
    document.head.appendChild(style);


    // 悬停提示框开关设置
    if (this.plugin.settings.showTooltip === undefined) {
      this.plugin.settings.showTooltip = true;
    }

    new Setting(containerEl)
      .setName('悬停提示框')
      .setDesc('启用后，鼠标悬停在事件上将显示距今天数')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showTooltip)
        .onChange(async (value) => {
          this.plugin.settings.showTooltip = value;
          await this.plugin.saveSettings();
        }));

    // 悬停延迟设置
    if (this.plugin.settings.tooltipDelay === undefined) {
      this.plugin.settings.tooltipDelay = 1000; // 默认1秒
    }

    new Setting(containerEl)
      .setName('悬停延迟')
      .setDesc('设置悬停提示框出现前的延迟时间(毫秒)')
      .addSlider(slider => slider
        .setLimits(0, 1000, 100)
        .setValue(this.plugin.settings.tooltipDelay)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.tooltipDelay = value;
          await this.plugin.saveSettings();
        }))
      .addButton(button => button
        .setButtonText('恢复默认')
        .onClick(async () => {
          this.plugin.settings.tooltipDelay = 500;
          await this.plugin.saveSettings();
          this.display();
          new Notice('已恢复默认悬停延迟');
        }));

    // 当天事件高亮设置
    if (this.plugin.settings.highlightToday === undefined) {
      this.plugin.settings.highlightToday = true;
    }

    new Setting(containerEl)
      .setName('当天事件高亮')
      .setDesc('启用后，将特殊标记当天的事件')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.highlightToday)
        .onChange(async (value) => {
          this.plugin.settings.highlightToday = value;
          await this.plugin.saveSettings();
        }));

    // 时间点大小设置
    new Setting(containerEl)
      .setName('时间点大小')
      .setDesc('设置时间轴上点的大小')
      .addSlider(slider => slider
        .setLimits(6, 20, 2)
        .setValue(this.plugin.settings.dotSize)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.dotSize = value;
          await this.plugin.saveSettings();
        }))
      .addButton(button => button
        .setButtonText('恢复默认')
        .onClick(async () => {
          this.plugin.settings.dotSize = 12;
          await this.plugin.saveSettings();
          this.display();
          new Notice('已恢复默认时间点大小');
        }));

    // 线条宽度设置
    new Setting(containerEl)
      .setName('线条宽度')
      .setDesc('设置时间轴线条的宽度')
      .addSlider(slider => slider
        .setLimits(1, 5, 1)
        .setValue(this.plugin.settings.lineWidth)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.lineWidth = value;
          await this.plugin.saveSettings();
        }))
      .addButton(button => button
        .setButtonText('恢复默认')
        .onClick(async () => {
          this.plugin.settings.lineWidth = 2;
          await this.plugin.saveSettings();
          this.display();
          new Notice('已恢复默认线条宽度');
        }));

    // 事件间距设置
    new Setting(containerEl)
      .setName('事件间距')
      .setDesc('设置时间轴事件之间的间距')
      .addSlider(slider => slider
        .setLimits(10, 40, 5)
        .setValue(this.plugin.settings.itemSpacing)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.itemSpacing = value;
          await this.plugin.saveSettings();
        }))
      .addButton(button => button
        .setButtonText('恢复默认')
        .onClick(async () => {
          this.plugin.settings.itemSpacing = 20;
          await this.plugin.saveSettings();
          this.display();
          new Notice('已恢复默认事件间距');
        }));
  }
}

module.exports = TimelinePlugin;
