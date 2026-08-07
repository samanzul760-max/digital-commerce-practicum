# LearnEC Brand Spec

来源：OpenDesign `learnec-scheme-a-workbench.html` 与已迁入项目的 `assets/css/learnec-spec.css`。本项目继续直接使用原稿变量，不进行 Tailwind 翻译。

## 核心 Tokens

```css
:root {
  --bg: oklch(99% 0.002 240);
  --surface: #fff;
  --fg: oklch(18% 0.012 250);
  --muted: oklch(50% 0.012 250);
  --border: oklch(91% 0.006 250);
  --accent: #147bd1;
}
```

## 字体

- Display：`-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Noto Sans SC', system-ui, sans-serif`
- Body：`-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans SC', system-ui, sans-serif`
- Mono：`'JetBrains Mono', ui-monospace, Menlo, monospace`

## 视觉姿态

- 大面积浅灰蓝背景承载白色内容面板，结构依靠细边框和轻阴影，不使用渐变装饰。
- 主色仅用于当前导航、关键状态和主操作；普通链接与次要操作保持深色或弱化色。
- 管理端采用 64px 顶栏、固定侧栏和高密度数据内容；学生端保持更宽松的课程浏览节奏。
- 卡片圆角统一为 16px 至 24px，按钮与菜单项保持 10px 至 12px，避免胶囊化泛滥。
- 图标使用 1.6px 至 1.8px 线性风格，中文文案简短、直接、可操作。

