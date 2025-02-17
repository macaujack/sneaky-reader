import i18n from "i18next";
import { initReactI18next } from "react-i18next";

type Translation = Record<string, string>;

const resources: Record<string, { translation: Translation }> = {
  en: {
    translation: {
      language: "language",
      settingsTitle: "Settings",
      adjustReadingWindow: "Adjust reading window",
      textSize: "Text size",
      textColorAndTransparency: "Text color and transparency",
      font: "Font",
      appearance: "Appearance",
      control: "Control",
      library: "Library",
      verySafeOption: "Very safe",
      verySafeExplain:
        "Double click, but don't release at the second click to show. Release to hide.",
      safeOption: "Safe",
      safeExplain: "Hold to show. Release to hide.",
      simpleOption: "Simple",
      simpleExplain: "Click to show. Click again to hide.",
      showHideMode: "Show/Hide mode",
      showHide: "Show/Hide",
      nextPage: "Next page",
      prevPage: "Previous page",
      pressAKeyToSet: "Press a key to set",
      pressEscToCancel: "Press ESC to cancel",
      new: "New",
      title: "Title",
      content: "Content",
      titleAndContentRequired: "Title and content cannot be empty",
      bookWithSameTitleExists: "Book with same title already exists",
      importedAllBooks: "{{countSuccess}} book(s) imported",
      importedSomeBooks:
        "{{countSuccess}} book(s) imported, {{countFail}} book(s) not imported",
      importedNoneBook: "{{countFail}} book(s) not imported",
      newBookCreated: "New book created",
      bookNotCreated: "Book not created",
      titleNotChanged: "Title not changed",
      titleChanged: "Title changed",
      import: "Import",
      importTxtBooks: "Import TXT books",
      plainTextFiles: "Plain text files",
      read: "Read",
      rename: "Rename",
      remove: "Remove",
      cannotRemoveLastBook: "Cannot remove last book",
    },
  },
  zh: {
    translation: {
      language: "语言",
      settingsTitle: "设置",
      adjustReadingWindow: "调整阅读窗口",
      textSize: "文本大小与透明度",
      textColor: "文本颜色",
      font: "字体",
      appearance: "外观",
      control: "控制",
      library: "图书馆",
      verySafeOption: "非常安全",
      verySafeExplain: "双击，但是第二次不要松开按键以显示。松开按键以隐藏。",
      safeOption: "安全",
      safeExplain: "长按显示。松开按键以隐藏。",
      simpleOption: "简单",
      simpleExplain: "点击显示。再次点击以隐藏。",
      showHideMode: "显示/隐藏模式",
      showHide: "显示/隐藏",
      nextPage: "下一页",
      prevPage: "上一页",
      pressAKeyToSet: "按下一个键以设置",
      pressEscToCancel: "按 ESC 取消",
      new: "新建",
      title: "标题",
      content: "内容",
      titleAndContentRequired: "标题和内容不能为空",
      bookWithSameTitleExists: "已存在同名图书",
      importedAllBooks: "成功导入 {{countSuccess}} 本图书",
      importedSomeBooks:
        "成功导入 {{countSuccess}} 本图书，失败导入 {{countFail}} 本图书",
      importedNoneBook: "失败导入 {{countFail}} 本图书",
      newBookCreated: "已新建图书",
      bookNotCreated: "新建图书失败",
      titleNotChanged: "标题未改变",
      titleChanged: "标题已改变",
      import: "导入",
      importTxtBooks: "导入 TXT 图书",
      plainTextFiles: "纯文本文件",
      read: "阅读",
      rename: "重命名",
      remove: "删除",
      cannotRemoveLastBook: "无法删除最后一本图书",
    },
  },
  "zh-Hant": {
    translation: {
      language: "語言",
      adjustReadingWindow: "調整閱讀窗口",
    },
  },
};

const languageMappings: Record<string, string> = {
  "zh-HK": "zh-Hant-HK",
  "zh-MO": "zh-Hant-MO",
  "zh-TW": "zh-Hant-TW",
};

const userLng = navigator.language;

i18n.use(initReactI18next).init({
  resources,
  lng: languageMappings[userLng] ?? userLng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});
