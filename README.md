# 115RenamePlus

115 网盘辅助脚本集，修改自 [LSD08KM/115RenamePlus](https://github.com/LSD08KM/115RenamePlus)。

## 脚本

| 脚本 | 功能 | 安装 |
|------|------|------|
| **115RenamePlus** | 根据文件名番号查询 JavBus / JavDB / JavMeta / FC2 并自动改名 | [安装](https://raw.githubusercontent.com/Oissp/115RenamePlus/master/115RenamePlus.user.js) |
| **115MagnetLink** | 捕捉页面磁力链接，一键保存到 115 云盘 | [安装](https://raw.githubusercontent.com/Oissp/115RenamePlus/master/115MagnetLink.user.js) |

## 使用

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击上方「安装」链接
3. 打开 [115 网盘](https://115.com/) 使用

### 115RenamePlus

选中文件 → 点击右下角悬浮按钮，选择查询源改名。

改名格式：`番号_分段-C 演员 标题 日期`

- **JavDB**：推荐，数据准确
- **JavBus**：无码资源
- **JavMeta**：番号覆盖不全；**不收录 FC2**（FC2 请用「FC2」项）；無碼号（CARIB / 1PONDO / 10MUSUME / PACOPACOMAMA / HEYZO / TOKYOHOT）库里存的是带站点前缀的写法，脚本会自动按那个写法查，文件名里保留站点前缀命中率更高
- **FC2**：FC2-PPV 系列

「添加标签」也是走 JavMeta：查女演员名，给选中文件打上同名标签。

JavMeta 那条路自己排队（同时最多 4 个请求）并对限流（HTTP 429）按 `retry-after` 退避重试（最多两次），批量改名不会因为请求过密整批失败。

### 115MagnetLink

在含磁力链接的页面，点击链接旁的按钮选择保存位置，或一键保存到上次位置。

## 常见问题

- 改名失败：确认文件名含有效番号、网络可访问 JavBus / JavDB / FC2 / JavMeta
- 演员含男演员：JavDB 只提取女演员，可改用 JavBus
- JavMeta 查不到：稍后重试，或改用 JavDB / JavBus
- 提示「该番号在多家发行商都有」：同一串「日期_序号」在几家無碼发行商各有一部不同的片，服务端不替用户挑。把文件名里的站点前缀（如 `CARIB` / `1PONDO`）留着再试

## 致谢

- 原作者：[LSD08KM](https://github.com/LSD08KM/115RenamePlus)
