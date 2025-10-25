const { Plugin, MarkdownRenderer, PluginSettingTab, Setting, Notice, Modal, TextComponent } = require('obsidian');

class TimelinePlugin extends Plugin {
  // 默认设置
  settings = {
    sortDirection: 'asc',
    timelineColor: '#5588cc',
    dotSize: 12,
    lineWidth: 2,
    itemSpacing: 20,
    showTooltip: true,
    tooltipDelay: 500,
    highlightToday: true,
    createdDateField: 'created'
  }
  // 默认颜色预设
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

      const singleLineRegex = /^([\w\s\-_.:\u4e00-\u9fa5]+)(  |：|:)(.*)$/;

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine === '') {
          if (currentEvent) {
            currentContent.push(line);
          }
          continue;
        }

        let dateMatch = false;
        let dateTimeStr = '';
        let contentStr = '';

        const singleLineMatch = trimmedLine.match(singleLineRegex);

        if (singleLineMatch) {
          const potentialDate = singleLineMatch[1].trim();
          if (this.parseDateTime(potentialDate)) {
            dateTimeStr = potentialDate;
            contentStr = singleLineMatch[3].trim();
            dateMatch = true;
          }
        }

        if (!dateMatch && this.parseDateTime(trimmedLine)) {
          dateTimeStr = trimmedLine;
          contentStr = '';
          dateMatch = true;
        }

        if (dateMatch) {
          if (currentEvent) {
            currentEvent.content = currentContent.join('\n').trim();
            // 只有当上一个事件有内容时才添加
            if (currentEvent.content) {
              events.push(currentEvent);
            }
          }

          const parsedDateTime = this.parseDateTime(dateTimeStr);
          currentEvent = {
            date: parsedDateTime.date,
            displayDate: parsedDateTime.display,
            originalDate: dateTimeStr,
            content: ''
          };
          currentContent = contentStr ? [contentStr] : [];

        } else if (currentEvent) {
          currentContent.push(line);
        }
      }

      if (currentEvent) {
        currentEvent.content = currentContent.join('\n').trim();
        // 确保最后一个事件（无论是单行还是多行）也能被添加
        if (currentEvent.content) {
          events.push(currentEvent);
        }
      }

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

      if (events.length === 0 && source.trim() !== '') {
        const errorEl = timelineContainer.createEl('div', { cls: 'timeline-error' });
        errorEl.createEl('strong', { text: '1st-Timeline 解析错误' });
        errorEl.createEl('p', { text: '未能解析出任何有效事件。请检查您的语法是否符合以下格式之一：' });
        const listEl = errorEl.createEl('ul');
        listEl.createEl('li', { text: '日期：事件内容 (使用中文或英文冒号)' });
        listEl.createEl('li', { text: '日期  事件内容 (使用两个空格)' });
        listEl.createEl('li', { text: '日期 (后跟换行和多行内容)' });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (const event of events) {
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
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        const timeDiff = eventDate.getTime() - today.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        if (daysDiff === 0 && this.settings.highlightToday) {
          contentEl.addClass('timeline-today');
        }
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

  parseDateTime(dateTimeStr) {
    let date = null;
    let displayStr = dateTimeStr.trim();

    // 优先级 1: 匹配 YYYY-MM-DD_HH:MM 格式
    const preciseMatch = displayStr.match(/^(\d{4}-\d{1,2}-\d{1,2})_(\d{1,2}:\d{1,2})/);
    if (preciseMatch) {
      const [, dateStr, timeStr] = preciseMatch;
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hour, minute] = timeStr.split(':').map(Number);
      date = new Date(year, month - 1, day, hour, minute);
      displayStr = `${dateStr}_${timeStr}`;
      return { date, display: displayStr };
    }

    // 优先级 2: 匹配 YYYY年MM月DD日[时间词]
    const chineseMatch = displayStr.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日(.*)$/);
    if (chineseMatch) {
      const [_, year, month, day, timePeriod] = chineseMatch;
      date = new Date(Number(year), Number(month) - 1, Number(day));
      const timePart = timePeriod.trim();
      if (timePart) {
        if (timePart.includes('早上')) date.setHours(7);
        else if (timePart.includes('上午')) date.setHours(10);
        else if (timePart.includes('中午')) date.setHours(12);
        else if (timePart.includes('下午')) date.setHours(15);
        else if (timePart.includes('晚上')) date.setHours(20);
      }
      return { date, display: displayStr };
    }

    // 优先级 3: 匹配 YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(displayStr)) {
      const [year, month, day] = displayStr.split('-').map(Number);
      date = new Date(year, month - 1, day);
      return { date, display: displayStr };
    }

    // 优先级 4: 匹配 YYYY年MM月DD日
    if (/^(\d{4})年(\d{1,2})月(\d{1,2})日$/.test(displayStr)) {
      const [_, year, month, day] = displayStr.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
      date = new Date(Number(year), Number(month) - 1, Number(day));
      return { date, display: displayStr };
    }

    return null;
  }

  async generateNotesTimeline(startDate, endDate) {
    try {
      const files = this.app.vault.getMarkdownFiles();
      const notesByDate = {};
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      for (const file of files) {
        try {
          const metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;
          if (metadata && metadata[this.settings.createdDateField]) {
            let createdDate;
            const dateValue = metadata[this.settings.createdDateField];
            if (typeof dateValue === 'string' && dateValue.includes('_')) {
              const [dateStr] = dateValue.split('_');
              createdDate = new Date(dateStr);
            } else if (typeof dateValue === 'string') {
              createdDate = new Date(dateValue);
            } else if (dateValue instanceof Date) {
              createdDate = dateValue;
            }

            if (createdDate && !isNaN(createdDate) &&
              createdDate >= start && createdDate <= end) {
              const dateKey = createdDate.toISOString().split('T')[0];
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

      let timelineContent = '';
      const sortedDates = Object.keys(notesByDate).sort();
      if (this.settings.sortDirection === 'desc') {
        sortedDates.reverse();
      }

      for (const dateKey of sortedDates) {
        const notes = notesByDate[dateKey];
        if (notes && notes.length > 0) {
          timelineContent += `${dateKey}  \n`;
          for (const note of notes) {
            const fileName = note.basename;
            timelineContent += `- [[${fileName}]]\n`;
          }
          timelineContent += '\n';
        }
      }

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
    const inputContainer = contentEl.createDiv();
    const dateRangeInput = new TextComponent(inputContainer);
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
    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.marginTop = '1rem';
    buttonContainer.createEl('button', { text: '取消' })
      .addEventListener('click', () => {
        this.close();
      });
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
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        new Notice('日期格式无效，请使用 YYYY-MM-DD 格式');
        return;
      }
      const timelineContent = await this.plugin.generateNotesTimeline(startDate, endDate);
      let editor = null;
      const activeLeaf = this.app.workspace.activeLeaf;
      if (activeLeaf && activeLeaf.view && activeLeaf.view.editor) {
        editor = activeLeaf.view.editor;
      }
      if (editor) {
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

class TimelineSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: '1st-Timeline 设置' });
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
    const colorSetting = new Setting(containerEl)
      .setName('时间轴颜色')
      .setDesc('设置时间轴和时间点的颜色');
    const colorSettingControl = colorSetting.controlEl.createEl('div', {
      cls: 'timeline-color-setting-container',
      attr: {
        style: 'display: flex; align-items: center; gap: 8px;'
      }
    });
    const colorPreview = colorSettingControl.createEl('div', {
      cls: 'timeline-color-preview',
      attr: {
        style: 'width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--background-modifier-border);'
      }
    });
    colorPreview.style.backgroundColor = this.plugin.settings.timelineColor;
    let colorInput = new Setting(colorSettingControl)
      .setClass('timeline-color-input')
      .addText(text => text
        .setValue(this.plugin.settings.timelineColor)
        .onChange(async (value) => {
          this.plugin.settings.timelineColor = value;
          await this.plugin.saveSettings();
          colorPreview.style.backgroundColor = value;
        }));
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
    const style = document.createElement('style');
    style.textContent = `
  .timeline-color-setting-container .setting-item { border: none; padding: 0; }
  .timeline-color-setting-container .setting-item-control { margin-right: 0; }
  .timeline-color-input input { width: 75px; }
`;
    document.head.appendChild(style);
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
    if (this.plugin.settings.tooltipDelay === undefined) {
      this.plugin.settings.tooltipDelay = 1000;
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