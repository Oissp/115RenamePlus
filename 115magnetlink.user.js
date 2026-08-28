// ==UserScript==
// @name         115云盘磁力链接助手 (自定义路径版)
// @namespace    http://tampermonkey.net/
// @version      2.1.0-beta.1
// @updateURL    https://raw.githubusercontent.com/Oissp/115RenamePlus/master/115magnetlink.user.js
// @downloadURL  https://raw.githubusercontent.com/Oissp/115RenamePlus/master/115magnetlink.user.js
// @description  自动捕捉页面磁力链接并保存至115云盘，支持文件夹层级浏览、添加文件夹书签(收藏夹)
// @author       UMP45NOSE
// @license      MIT
// @match        *://*/*
// @connect      115.com
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_log
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        window.Notification
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log('115云盘磁力链接助手已加载 (v2.1.0-beta.1)');

    // 调试函数
    function debug(msg, ...args) {
        // console.log(`[115助手] ${msg}`, ...args);
    }

    // 匹配磁力链接的正则表达式
    const magnetRegex = /magnet:\?xt=urn:btih:[a-zA-Z0-9]{32,40}/gi;

    // 115图标 SVG
    const icon115 = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
            fill="white" font-family="Arial" font-weight="bold" font-size="10">115</text>
    </svg>`;

    // 按钮样式
    const buttonStyle = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        background-color: #2777F8;
        border-radius: 50%;
        cursor: pointer;
        margin-left: 5px;
        color: white;
        font-family: Arial, sans-serif;
        font-size: 11px;
        font-weight: bold;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        opacity: 0.9;
        user-select: none;
        vertical-align: middle;
        z-index: 999;
    `;

    // 快速保存面板样式（自包含，不依赖完整选择器弹窗的 CSS）
    const panelCss = `
        #magnet-115-panel{position:fixed;z-index:10001;min-width:230px;max-width:300px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.18);font-family:sans-serif;font-size:13px;overflow:hidden}
        #magnet-115-panel .m115-panel-title{padding:10px 12px;border-bottom:1px solid #eee;background:#f8f9fa;color:#2777F8;font-weight:bold;font-size:14px}
        #magnet-115-panel .m115-panel-body{padding:8px}
        #magnet-115-panel .m115-panel-fast{background:#fff7e6;border-left:3px solid #ff9800;margin-bottom:6px}
        #magnet-115-panel .m115-panel-fast:hover{background:#fff1cc}
        #magnet-115-panel .m115-panel-more{padding:8px 10px;color:#2777F8;cursor:pointer;text-align:center;border-top:1px solid #eee;margin-top:6px}
        #magnet-115-panel .m115-panel-more:hover{background:#f0f7ff}
        #magnet-115-panel .m115-item{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:4px;cursor:pointer;margin-bottom:2px}
        #magnet-115-panel .m115-item:hover{background:#f0f7ff}
        #magnet-115-panel .m115-folder-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center}
        #magnet-115-panel .m115-section-title{font-size:12px;color:#888;margin:10px 0 5px;padding-left:5px}
        #magnet-115-panel .m115-hint{color:#999;font-size:12px;padding:4px 10px}
    `;

    const createdButtons = new Set();

    // 通知函数
    function showNotification(title, text, isWarning = false) {
        setTimeout(() => {
            window.alert(`${title}\n${text}`);
        }, 100);
        try {
            GM_notification({
                title: title,
                text: text,
                timeout: isWarning ? 3000 : 5000
            });
        } catch (e) {}
    }

    /**
     * 获取115文件夹列表
     * @param {string|number} cid 文件夹ID，默认为0（根目录）
     */
    async function get115Folders(cid = 0) {
        return new Promise((resolve) => {
            debug(`获取文件夹列表, cid: ${cid}`);
            const apiUrl = `https://aps.115.com/natsort/files.php?aid=1&cid=${cid}&offset=0&limit=300&show_dir=1&natsort=1&format=json`;

            GM_xmlhttpRequest({
                method: 'GET',
                url: apiUrl,
                headers: {
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Referer': 'https://115.com/',
                    'User-Agent': window.navigator.userAgent
                },
                withCredentials: true,
                onload: function(response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.state) {
                            const folders = result.data
                                .filter(item => item.cid && item.n && typeof item.fid === 'undefined') // 只要文件夹
                                .map(item => ({ id: item.cid, name: item.n }));
                            resolve({ success: true, data: folders });
                        } else {
                            resolve({ success: false, msg: result.error || '获取失败' });
                        }
                    } catch (error) {
                        resolve({ success: false, msg: '解析失败' });
                    }
                },
                onerror: function(error) {
                    resolve({ success: false, msg: '网络请求错误' });
                }
            });
        });
    }

    /**
     * 保存到115 (核心功能)
     * @param {string} [folderName] 目标文件夹名（用于记住上次保存位置）
     */
    async function saveTo115(magnetLink, targetFolderId, buttonElement, folderName) {
        // UI 反馈：处理中
        if(buttonElement) {
            buttonElement.textContent = '...';
            buttonElement.style.backgroundColor = '#ff9800';
        }

        return new Promise((resolve) => {
            // 1. 检查离线空间 (省略详细检查，直接添加，依赖添加接口的返回)

            // 2. 添加任务
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://115.com/web/lixian/?ct=lixian&ac=add_task_url',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': 'https://115.com/',
                    'Origin': 'https://115.com',
                    'User-Agent': window.navigator.userAgent
                },
                data: `url=${encodeURIComponent(magnetLink)}&wp_path_id=${targetFolderId}`,
                withCredentials: true,
                onload: function(response) {
                    let success = false;
                    let isWarning = false;
                    let msg = '未知错误';

                    try {
                        const result = JSON.parse(response.responseText);
                        success = result.state;
                        // 10008 = 任务已存在
                        isWarning = result.errtype === 'war' || result.errcode === 10008;
                        msg = result.error_msg || (isWarning ? '任务已存在' : '添加失败');

                        if (success || isWarning) {
                            showNotification('115云盘助手', isWarning ? '任务已存在' : '添加成功', true);
                        } else {
                            // 错误代码映射
                            if (result.errcode === 911) msg = '请先登录115账号';
                            showNotification('错误', msg);
                        }

                        // 记住上次保存位置（成功或任务已存在都算定位到该文件夹）
                        if ((success || isWarning) && folderName) {
                            setLastFolder(targetFolderId, folderName);
                        }
                    } catch (e) {
                        msg = '响应解析失败';
                        showNotification('错误', msg);
                    }

                    // 恢复按钮状态
                    if (buttonElement) {
                        buttonElement.textContent = '115';
                        buttonElement.style.backgroundColor = (success || isWarning) ? '#2777F8' : '#f44336';
                        if (!success && !isWarning) {
                            setTimeout(() => { buttonElement.style.backgroundColor = '#2777F8'; }, 2000);
                        }
                    }
                    resolve(success);
                },
                onerror: function() {
                    showNotification('错误', '网络请求失败');
                    if (buttonElement) {
                        buttonElement.textContent = '115';
                        buttonElement.style.backgroundColor = '#f44336';
                        setTimeout(() => { buttonElement.style.backgroundColor = '#2777F8'; }, 2000);
                    }
                    resolve(false);
                }
            });
        });
    }

    // --- 书签管理 ---
    function getBookmarks() {
        return GM_getValue('115_bookmarks', []);
    }

    function addBookmark(id, name) {
        const bookmarks = getBookmarks();
        // 避免重复
        if (!bookmarks.some(b => b.id == id)) {
            bookmarks.push({ id, name });
            GM_setValue('115_bookmarks', bookmarks);
            return true;
        }
        return false;
    }

    function removeBookmark(id) {
        const bookmarks = getBookmarks().filter(b => b.id != id);
        GM_setValue('115_bookmarks', bookmarks);
    }

    // --- 上次保存位置 ---
    function getLastFolder() {
        return GM_getValue('115_last_save_folder', null);
    }

    function setLastFolder(id, name) {
        GM_setValue('115_last_save_folder', { id, name });
    }

    // --- 快速保存面板 ---
    function showQuickSavePanel(magnetLink, buttonElement) {
        const lastFolder = getLastFolder();
        const bookmarks = getBookmarks();
        // 无书签且无上次位置时，直接进完整选择器，保持原有体验
        if (!lastFolder && bookmarks.length === 0) {
            showFolderSelector(magnetLink, buttonElement);
            return;
        }

        // 移除旧面板（含事件监听清理）
        const oldPanel = document.getElementById('magnet-115-panel');
        if (oldPanel) {
            if (oldPanel._cleanup) oldPanel._cleanup();
            oldPanel.remove();
        }

        // 注入样式
        if (!document.getElementById('magnet-115-panel-style')) {
            const style = document.createElement('style');
            style.id = 'magnet-115-panel-style';
            style.textContent = panelCss;
            document.head.appendChild(style);
        }

        const panel = document.createElement('div');
        panel.id = 'magnet-115-panel';
        panel.style.visibility = 'hidden';
        panel.innerHTML = `
            <div class="m115-panel-title">保存至 115云盘</div>
            <div class="m115-panel-body">
                <div id="m115-panel-fast"></div>
                <div class="m115-section-title">书签 (点击直接保存)</div>
                <div id="m115-panel-bookmarks"></div>
                <div class="m115-panel-more" id="m115-panel-more">选择其他位置…</div>
            </div>
        `;
        document.body.appendChild(panel);

        // 快速保存（上次位置）
        const elFast = panel.querySelector('#m115-panel-fast');
        if (lastFolder && lastFolder.id != null) {
            const div = document.createElement('div');
            div.className = 'm115-item m115-panel-fast';
            div.innerHTML = `<span class="m115-folder-name">⚡ 保存到「${lastFolder.name}」</span>`;
            div.onclick = () => { close(); saveTo115(magnetLink, lastFolder.id, buttonElement, lastFolder.name); };
            elFast.appendChild(div);
        } else {
            elFast.style.display = 'none';
        }

        // 书签列表
        const elBookmarks = panel.querySelector('#m115-panel-bookmarks');
        if (bookmarks.length === 0) {
            elBookmarks.innerHTML = '<div class="m115-hint">暂无书签，可在选择器中收藏目录</div>';
        } else {
            bookmarks.forEach(b => {
                const div = document.createElement('div');
                div.className = 'm115-item';
                div.innerHTML = `<span class="m115-folder-name">★ ${b.name}</span>`;
                div.onclick = () => { close(); saveTo115(magnetLink, b.id, buttonElement, b.name); };
                elBookmarks.appendChild(div);
            });
        }

        // 完整选择器入口
        panel.querySelector('#m115-panel-more').onclick = () => {
            close();
            showFolderSelector(magnetLink, buttonElement);
        };

        // 关闭与事件清理
        function cleanup() {
            document.removeEventListener('click', onDocClick, true);
            window.removeEventListener('scroll', onScroll, true);
            document.removeEventListener('keydown', onKey);
        }
        function close() {
            cleanup();
            panel.remove();
        }
        function onDocClick(e) {
            if (!panel.contains(e.target) && e.target !== buttonElement) close();
        }
        function onScroll() { close(); }
        function onKey(e) { if (e.key === 'Escape') close(); }

        document.addEventListener('click', onDocClick, true);
        window.addEventListener('scroll', onScroll, true);
        document.addEventListener('keydown', onKey);
        panel._cleanup = cleanup;

        // 定位：优先按钮右侧，空间不足时放左侧并贴合视口
        const btnRect = buttonElement.getBoundingClientRect();
        panel.style.visibility = 'visible';
        const pRect = panel.getBoundingClientRect();
        let left = btnRect.right + 8;
        if (left + pRect.width > window.innerWidth - 8) left = Math.max(8, btnRect.left - pRect.width - 8);
        let top = btnRect.top;
        if (top + pRect.height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - pRect.height - 8);
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
    }

    // --- UI 相关 ---

    // 显示文件夹选择器
    async function showFolderSelector(magnetLink, buttonElement) {
        // 移除旧弹窗
        const oldModal = document.getElementById('magnet-115-modal');
        if (oldModal) oldModal.remove();

        // 状态管理
        let currentCid = 0;
        let currentPathName = '根目录';
        let pathStack = [{id: 0, name: '根目录'}];

        // CSS
        const css = `
            #magnet-115-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center; font-family: sans-serif; }
            .m115-content { background: #fff; width: 400px; max-height: 80vh; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
            .m115-header { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; }
            .m115-title { font-weight: bold; color: #2777F8; margin: 0; font-size: 16px; }
            .m115-close { cursor: pointer; font-size: 20px; color: #999; }
            .m115-body { flex: 1; overflow-y: auto; padding: 10px; }
            .m115-section-title { font-size: 12px; color: #888; margin: 10px 0 5px; padding-left: 5px; }
            .m115-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 4px; cursor: pointer; margin-bottom: 2px; }
            .m115-item:hover { background: #f0f7ff; }
            .m115-folder-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; }
            .m115-folder-icon { margin-right: 8px; color: #ffca28; font-size: 16px; }
            .m115-btn-small { padding: 2px 8px; border-radius: 3px; font-size: 12px; border: 1px solid #ddd; background: #fff; margin-left: 5px; cursor: pointer; }
            .m115-btn-small:hover { background: #f0f0f0; color: #2777F8; border-color: #2777F8; }
            .m115-current-bar { padding: 8px 15px; background: #eef2f9; border-bottom: 1px solid #e1e4e8; display: flex; align-items: center; font-size: 13px; color: #333; }
            .m115-nav-btn { cursor: pointer; color: #2777F8; margin-right: 5px; font-weight: bold; }
            .m115-current-path { flex: 1; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .m115-actions { padding: 10px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 10px; }
            .m115-btn { padding: 6px 15px; border-radius: 4px; border: none; cursor: pointer; font-size: 14px; }
            .m115-btn-primary { background: #2777F8; color: white; }
            .m115-btn-cancel { background: #eee; color: #333; }
            .m115-bookmark-tag { background: #e8f5e9; color: #2e7d32; font-size: 10px; padding: 1px 4px; border-radius: 2px; margin-left: 5px; }
            .m115-del-btn { color: #f44336; font-weight: bold; padding: 0 5px; }
            .m115-del-btn:hover { background: #ffebee; }
        `;

        // 创建 DOM
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        const modal = document.createElement('div');
        modal.id = 'magnet-115-modal';
        modal.innerHTML = `
            <div class="m115-content">
                <div class="m115-header">
                    <h3 class="m115-title">保存至 115云盘</h3>
                    <span class="m115-close">×</span>
                </div>

                <div class="m115-current-bar">
                    <span class="m115-nav-btn" id="m115-back" title="返回上一级">⬆</span>
                    <span class="m115-current-path" id="m115-path-display">/ 根目录</span>
                    <button class="m115-btn-small" id="m115-add-bookmark">★ 收藏此目录</button>
                </div>

                <div class="m115-body">
                    <div id="m115-bookmarks-container">
                        <div class="m115-section-title">书签 (点击直接保存)</div>
                        <div id="m115-bookmarks-list"></div>
                    </div>

                    <div class="m115-section-title">文件夹 (点击进入)</div>
                    <div id="m115-folder-list">正在加载...</div>
                </div>

                <div class="m115-actions">
                    <button class="m115-btn m115-btn-cancel" id="m115-btn-cancel">取消</button>
                    <button class="m115-btn m115-btn-primary" id="m115-btn-save-current">保存到当前目录</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 绑定元素
        const elList = modal.querySelector('#m115-folder-list');
        const elBookmarks = modal.querySelector('#m115-bookmarks-list');
        const elPathDisplay = modal.querySelector('#m115-path-display');
        const elBackBtn = modal.querySelector('#m115-back');

        // 关闭逻辑
        const closeModal = () => modal.remove();
        modal.querySelector('.m115-close').onclick = closeModal;
        modal.querySelector('#m115-btn-cancel').onclick = closeModal;
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };

        // 渲染书签
        function renderBookmarks() {
            const bookmarks = getBookmarks();
            elBookmarks.innerHTML = '';
            if (bookmarks.length === 0) {
                elBookmarks.innerHTML = '<div style="color:#999; font-size:12px; padding-left:10px;">暂无书签，进入文件夹后点击上方"收藏"添加</div>';
                return;
            }
            bookmarks.forEach(b => {
                const div = document.createElement('div');
                div.className = 'm115-item';
                div.innerHTML = `
                    <span class="m115-folder-name">★ ${b.name}</span>
                    <span class="m115-btn-small m115-del-btn" title="删除书签">×</span>
                `;
                // 点击书签 -> 直接保存
                div.querySelector('.m115-folder-name').onclick = () => {
                    closeModal();
                    saveTo115(magnetLink, b.id, buttonElement, b.name);
                };
                // 删除书签
                div.querySelector('.m115-del-btn').onclick = (e) => {
                    e.stopPropagation();
                    if(confirm(`删除书签 "${b.name}"?`)) {
                        removeBookmark(b.id);
                        renderBookmarks();
                    }
                };
                elBookmarks.appendChild(div);
            });
        }

        // 加载文件夹内容
        async function loadFolder(cid, name) {
            elList.innerHTML = '<div style="padding:10px; color:#666;">加载中...</div>';

            // 更新路径显示
            currentCid = cid;
            currentPathName = name;
            elPathDisplay.textContent = pathStack.map(p => p.name).join(' / ') || '/';
            if (pathStack.length > 1) {
                // 显示最后两个路径防止过长
                elPathDisplay.textContent = '... / ' + pathStack.slice(-1)[0].name;
            }

            const res = await get115Folders(cid);

            elList.innerHTML = '';
            if (res.success) {
                if (res.data.length === 0) {
                    elList.innerHTML = '<div style="padding:10px; color:#999;">此文件夹为空</div>';
                } else {
                    res.data.forEach(folder => {
                        const div = document.createElement('div');
                        div.className = 'm115-item';
                        div.innerHTML = `
                            <span class="m115-folder-name"><span class="m115-folder-icon">📁</span> ${folder.name}</span>
                        `;
                        // 点击进入下一级
                        div.onclick = () => {
                            pathStack.push({id: folder.id, name: folder.name});
                            loadFolder(folder.id, folder.name);
                        };
                        elList.appendChild(div);
                    });
                }
            } else {
                elList.innerHTML = `<div style="color:red; padding:10px;">${res.msg}</div>`;
            }
        }

        // 初始化
        renderBookmarks();
        loadFolder(0, '根目录');

        // 事件绑定

        // 返回上一级
        elBackBtn.onclick = () => {
            if (pathStack.length > 1) {
                pathStack.pop();
                const parent = pathStack[pathStack.length - 1];
                loadFolder(parent.id, parent.name);
            } else {
                // 已在根目录
            }
        };

        // 添加当前为书签
        modal.querySelector('#m115-add-bookmark').onclick = () => {
            // 弹出输入框让用户确认名称
            const name = prompt("请输入书签名称:", currentPathName);
            if (name) {
                if(addBookmark(currentCid, name)) {
                    renderBookmarks();
                } else {
                    alert('书签已存在');
                }
            }
        };

        // 保存到当前所在目录
        modal.querySelector('#m115-btn-save-current').onclick = () => {
            closeModal();
            saveTo115(magnetLink, currentCid, buttonElement, currentPathName);
        };
    }

    // --- 主逻辑 ---

    // 创建按钮
    function createMagnetButton(magnetLink, element) {
        if (createdButtons.has(magnetLink)) return;

        const wrapper = document.createElement('span');
        wrapper.style.cssText = 'display: inline-flex; align-items: center; white-space: nowrap; margin: 0 2px;';

        const btn = document.createElement('span');
        btn.innerHTML = '115';
        btn.style.cssText = buttonStyle;
        btn.title = '点击快速保存/选择位置';

        // 插入 DOM
        if (element.nodeType === Node.TEXT_NODE) {
            const text = element.textContent;
            const index = text.indexOf(magnetLink);
            if (index !== -1) {
                const range = document.createRange();
                range.setStart(element, index + magnetLink.length);
                range.setEnd(element, index + magnetLink.length);
                range.insertNode(wrapper);
                wrapper.appendChild(btn);
            }
        } else {
            element.parentNode.insertBefore(wrapper, element.nextSibling);
            wrapper.appendChild(btn);
        }

        // 交互
        btn.onmouseenter = () => { btn.style.transform = 'scale(1.1)'; btn.style.opacity = '1'; };
        btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; btn.style.opacity = '0.9'; };

        btn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            // 打开快速保存面板（无书签/上次位置时自动回退到完整选择器）
            showQuickSavePanel(magnetLink, btn);
        };

        createdButtons.add(magnetLink);
    }

    // 扫描页面
    function findAndProcessMagnetLinks() {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        const nodes = [];
        while(walker.nextNode()) nodes.push(walker.currentNode);

        nodes.forEach(node => {
            const matches = node.textContent.match(magnetRegex);
            if (matches && !['SCRIPT','STYLE'].includes(node.parentNode.tagName)) {
                matches.forEach(link => {
                    if (!createdButtons.has(link)) {
                        createMagnetButton(link, node);
                    }
                });
            }
        });

        // 检查特定属性
        const elements = document.querySelectorAll('a[href], input[value]');
        elements.forEach(el => {
            const val = el.href || el.value;
            const matches = val && val.match(magnetRegex);
            if (matches) {
                matches.forEach(link => {
                     if (!createdButtons.has(link)) createMagnetButton(link, el);
                });
            }
        });
    }

    // 启动
    function init() {
        findAndProcessMagnetLinks();
        // 监控动态加载
        new MutationObserver((mutations) => {
            // 简单的防抖
            if (window._m115_timer) clearTimeout(window._m115_timer);
            window._m115_timer = setTimeout(findAndProcessMagnetLinks, 800);
        }).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
