# 115RenamePlus

115 网盘视频文件自动改名工具，根据文件名中的番号自动查询并修改为标准格式。

修改自 [115RenamePlus](https://github.com/LSD08KM/115RenamePlus)

---

## 📦 安装

1. 安装 **[Tampermonkey](https://www.tampermonkey.net/)** 浏览器扩展
2. 点击 [安装脚本](https://raw.githubusercontent.com/Oissp/115RenamePlus/master/115RenamePlus.user.js)
3. 确保能访问：JavBus、JavDB、FC2

---

## 🎯 功能

### 改名方式

| 方式 | 说明 | 推荐场景 |
|------|------|---------|
| **JavDB** | 通过 JavDB 查询 | 推荐，数据准确 |
| **JavBus** | 通过 JavBus 查询 | 无码资源 |
| **FC2** | 通过 FC2 官网查询 | FC2-PPV 系列 |

### 智能识别

- ✅ **分段**: `CD1`、`-A`、`_B`、`-3`、`_4`
- ✅ **字幕**: `-C`、`中字`、`中文字幕`
- ✅ **4K**: `-4K`、`H264 版`、`VP9 版`
- ✅ **前缀清理**: `489155.com@`、`hhd800.com@`、`4k2.me@`

---

## 📝 改名格式

```
番号_分段-C-4k 演员 标题 发行日
```

### 示例

| 原文件名 | 改名后 |
|---------|--------|
| `ABC-123.mp4` | `ABC-123 演员 标题 2024-01-15.mp4` |
| `ABC-123-C-4K.mp4` | `ABC-123-C-4k 演员 标题 2024-01-15.mp4` |
| `ABC-123-CD2.mp4` | `ABC-123_2 演员 标题 2024-01-15.mp4` |
| `STARS-590A.mp4` | `STARS-590_A 演员 标题 2024-01-15.mp4` |
| `FC2PPV-123456.mp4` | `FC2-PPV-123456 演员 标题 2024-01-15.mp4` |

---

## 🚀 使用

1. 打开 [115 网盘](https://115.com/)
2. 选中视频文件（支持多选）
3. 右击 → 选择改名方式

**建议：**
- 普通番号 → JavDB
- FC2 番号 → FC2 改名
- 无码番号 → JavBus

---

## ❓ 常见问题

**Q: 右键菜单不显示？**

A: 
1. 确认 Tampermonkey 已安装并启用脚本
2. 刷新网页（Ctrl+F5）
3. 检查 Console 是否有报错

**Q: 改名失败？**

A:
1. 文件名必须包含有效番号
2. 确保网络畅通（需访问查询网站）
3. 建议先测试单个文件

**Q: 演员名包含男演员？**

A: JavDB 默认只提取女演员，如有男演员建议改用 JavBus。

---

## 📊 版本

| 版本 | 更新内容 |
|------|---------|
| v0.10.2 | 支持长字母番号（如 DANDYA-013） |
| v0.10.1 | 精简日志输出 |
| v0.10.0 | 删除废弃的 avmoo/mgstage 功能 |

---

## 🔗 链接

- [GitHub 仓库](https://github.com/Oissp/115RenamePlus)
- [Tampermonkey](https://www.tampermonkey.net/)
- [JavBus](https://www.javbus.com/)
- [JavDB](https://javdb.com/)
- [FC2](https://adult.contents.fc2.com/)

---

## 🙏 致谢

- 原作者：[LSD08KM](https://github.com/LSD08KM/115RenamePlus)
- 参考：[115master](https://github.com/cbingb666/115master)
