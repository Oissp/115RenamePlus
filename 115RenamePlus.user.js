// ==UserScript==
// @name                115RenamePlus
// @namespace           https://github.com/Oissp/115RenamePlus/
// @version             0.12.1-beta.18
// @updateURL           https://raw.githubusercontent.com/Oissp/115RenamePlus/master/115RenamePlus.user.js
// @downloadURL         https://raw.githubusercontent.com/Oissp/115RenamePlus/master/115RenamePlus.user.js
// @description         115RenamePlus(根据现有的文件名<番号>查询并修改文件名)
// @author              db117, FAN0926, LSD08KM
// @match               https://115.com/*
// @match               https://web.115.com/*
// @domain              javbus.com
// @domain              fanbus.blog
// @domain              busdmm.club
// @domain              seedmm.blog
// @domain              adult.contents.fc2.com
// @domain              javdb.com
// @require             https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js
// @grant               GM_notification
// @grant               GM_xmlhttpRequest
// @grant               GM_getValue
// @grant               GM_setValue
// @grant               unsafeWindow
// @connect             webapi.115.com
// @connect             javdb.com
// @connect             www.javbus.com
// @connect             javbus.com
// @connect             fanbus.blog
// @connect             busdmm.club
// @connect             seedmm.blog
// @connect             adult.contents.fc2.com
// ==/UserScript==

    /*
     * @param suffix            后缀，就是扩展名
     */
(function () {
    'use strict';

    // 按钮图标（共用）
    const ICON_BUS  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
    const ICON_DB   = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h3"/></svg>';
    const ICON_FC2  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';
    const ICON_CLEAN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/></svg>';
    // 悬浮按钮主图标
    const RENAME_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
    // 悬浮按钮样式
    const FLOAT_STYLE = `
        [data-rp-float]{position:fixed;right:20px;bottom:80px;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-user-select:none;user-select:none}
        html body [data-rp-float-toggle]{display:flex!important;align-items:center!important;gap:8px!important;padding:10px 18px!important;border:none!important;border-radius:999px!important;cursor:grab;background:linear-gradient(135deg,#2563eb,#7c3aed)!important;color:#fff!important;font-size:14px!important;font-weight:600!important;line-height:1!important;box-shadow:0 4px 16px rgba(37,99,235,.35)!important;transition:transform .15s,box-shadow .15s,background .15s}
        html body [data-rp-float-toggle].rp-dragging{cursor:grabbing!important}
        html body [data-rp-float-toggle]:hover{transform:translateY(-2px)!important;box-shadow:0 6px 22px rgba(37,99,235,.5)!important}
        html body [data-rp-float-toggle].rp-active{background:linear-gradient(135deg,#f97316,#ef4444)!important;box-shadow:0 4px 16px rgba(249,115,22,.4)!important}
        html body [data-rp-float-toggle].rp-active:hover{box-shadow:0 6px 22px rgba(249,115,22,.5)!important}
        html body [data-rp-float-count]{min-width:20px!important;height:20px!important;padding:0 5px!important;border-radius:10px!important;background:rgba(255,255,255,.25)!important;display:inline-flex;align-items:center!important;justify-content:center!important;font-size:12px!important;font-weight:600!important}
        [data-rp-float-menu]{position:absolute;right:0;bottom:calc(100% + 12px);min-width:230px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.15);padding:6px;display:none}
        [data-rp-float-menu].rp-open{display:block}
        html body [data-rp-float-item]{display:flex!important;align-items:center!important;gap:10px!important;width:100%!important;padding:9px 12px!important;border:none!important;background:transparent!important;border-radius:8px!important;cursor:pointer!important;text-align:left!important;transition:background .12s}
        html body [data-rp-float-item]:hover{background:#f3f4f6!important}
        html body [data-rp-float-item] .rp-item-title{font-size:14px;font-weight:600;color:#111827}
        html body [data-rp-float-item] .rp-item-desc{font-size:12px;color:#6b7280;margin-top:2px}
    `;

    // 悬浮按钮位置存储键
    const FLOAT_POS_KEY = '115renameplus_float_pos';
    // 悬浮按钮实例清理函数（避免 SPA 重建时 document 监听器累积）
    let floatDragCleanup = null;
    // 列表刷新去抖定时器（批量改名时只刷新一次）
    let refreshTimer = null;
    
    /**
     * 添加按钮的定时任务
     */
    let interval = setInterval(buttonInterval, 1000);

    // 安全 HTML 解析：使用 DOMParser 避免浏览器自动加载图片等资源
    const parser = new DOMParser();
    function parseHTML(html) {
        const doc = parser.parseFromString(html, 'text/html');
        return $(doc.body);
    }

    // javbus
    let javbusBase = "https://www.javbus.com/";
    let javbusSearch = javbusBase + "search/";
    let javbusUncensoredSearch = javbusBase + "uncensored/search/";

    let Fc2Search = "https://adult.contents.fc2.com/article/";

    let javdbBase = "https://javdb.com";
    let javdbSearch = javdbBase + "/search?q=";

    /**
     * 检测是否为新版UI
     */
    function isNewUI() {
        // URL路径检测（更可靠）
        if (/\/storage\/netdisk/.test(location.href)) return true;
        // 兜底：DOM特征检测
        return document.querySelector('.file-list-item') !== null &&
               document.querySelector('iframe[rel="wangpan"]') === null;
    }

    /**
     * 从 React Fiber 中提取文件数据（新版UI专用，比 localStorage 更可靠）
     */
    function getReactFiberKey(el) {
        return Object.keys(el).find(k => k.startsWith('__reactFiber'));
    }

    function getFileDataFromElement(el) {
        if (!el) return null;
        const fiberKey = getReactFiberKey(el);
        if (fiberKey) {
            const fiber = el[fiberKey];
            // 优先从 child 获取（未选中状态）
            let fileData = fiber?.child?.memoizedProps?.file;
            // 选中后 fiber 结构变化，数据移到 parent (return) 上
            if (!fileData) {
                fileData = fiber?.return?.memoizedProps?.file;
            }
            // 兜底：向上遍历最多 5 层 parent
            if (!fileData) {
                let current = fiber?.return;
                for (let i = 0; i < 5 && current; i++) {
                    if (current.memoizedProps?.file) {
                        fileData = current.memoizedProps.file;
                        break;
                    }
                    current = current.return;
                }
            }
            return fileData || null;
        }
        return null;
    }

    /**
     * 从 localStorage 获取文件列表数据
     */
    function getFileListFromStorage() {
        try {
            const fileListPersist = localStorage.getItem('115life_file_list_persist');
            if (!fileListPersist) return null;
            const parsed = JSON.parse(fileListPersist);
            return parsed.state?.files || null;
        } catch (e) {
            console.log('获取文件列表失败:', e);
            return null;
        }
    }
    
    /**
     * 通过 API 获取当前目录的文件列表（新版UI专用，支持分页）
     */
    async function fetchFileListByAPI(cid) {
        const PAGE_SIZE = 115;
        let allFiles = [];
        let offset = 0;

        while (true) {
            const apiUrl = 'https://webapi.115.com/files?aid=1&cid=' + cid + '&offset=' + offset + '&limit=' + PAGE_SIZE + '&type=0&show_dir=1&fc_mix=1&natsort=1&format=json';

            const data = await new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: apiUrl,
                    headers: {
                        'Origin': 'https://115.com',
                        'Referer': 'https://115.com/'
                    },
                    withCredentials: true,
                    onload: function(response) {
                        try {
                            const parsed = JSON.parse(response.responseText);
                            if (parsed.state) resolve(parsed);
                            else resolve(null);
                        } catch (e) { resolve(null); }
                    },
                    onerror: () => resolve(null)
                });
            });

            if (!data || !data.data) break;

            allFiles = allFiles.concat(data.data);
            // 最后一页或已拿完
            if (data.data.length < PAGE_SIZE) break;
            offset += PAGE_SIZE;
        }

        return allFiles.length > 0 ? allFiles : null;
    }
    
    /**
     * 获取当前目录 cid
     */
    function getCurrentCid() {
        const url = new URL(window.location.href);
        return url.searchParams.get('cid') || '0';
    }

    /**
     * 添加按钮定时任务（统一由悬浮按钮入口触发）
     */
    function buttonInterval() {
        updateFloatingButton();
    }

    /**
     * 检测是否处于文件管理页面
     */
    function isOnFilePage() {
        if (/\/storage\/netdisk/.test(location.href)) return true;
        return document.querySelector('.file-list-item') !== null
            || document.querySelector('iframe[rel="wangpan"]') !== null;
    }

    /**
     * 获取当前已选中的文件数量（兼容新旧UI）
     */
    function getSelectedCount() {
        // 旧版UI：从 iframe 中统计
        if (!isNewUI()) {
            try {
                return $("iframe[rel='wangpan']").contents().find("li.selected").length;
            } catch (e) {
                return 0;
            }
        }
        // 新版UI：统计选中项（去重）
        const items = new Set();
        document.querySelectorAll(
            '.file-list-item input[type="checkbox"]:checked,' +
            '.file-list-item [aria-checked="true"],' +
            '.file-list-item.checked,' +
            '.file-list-item.selected'
        ).forEach(el => {
            const item = el.closest?.('.file-list-item');
            if (item) items.add(item);
        });
        return items.size;
    }

    /**
     * 创建悬浮按钮（独立入口，不与115已有菜单融合）
     */
    function createFloatingButton() {
        // 清理旧实例的监听器与旧节点，避免重复创建时累积
        if (typeof floatDragCleanup === 'function') floatDragCleanup();
        const oldWrap = document.querySelector('[data-rp-float]');
        if (oldWrap) oldWrap.remove();

        // 注入样式
        if (!document.getElementById('rp-float-style')) {
            const style = document.createElement('style');
            style.id = 'rp-float-style';
            style.textContent = FLOAT_STYLE;
            document.head.appendChild(style);
        }

        const wrap = document.createElement('div');
        wrap.setAttribute('data-rp-float', 'true');
        wrap.style.display = 'none';

        // 下拉菜单
        const menu = document.createElement('div');
        menu.setAttribute('data-rp-float-menu', 'true');

        const mkItem = (title, desc, icon, onClick) => {
            const item = document.createElement('button');
            item.setAttribute('data-rp-float-item', 'true');
            item.innerHTML = `${icon}<span><span class="rp-item-title">${title}</span><br><span class="rp-item-desc">${desc}</span></span>`;
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                menu.classList.remove('rp-open');
                onClick();
            });
            return item;
        };
        const makeDivider = () => {
            const div = document.createElement('div');
            div.style.cssText = 'height:1px;background:#e5e7eb;margin:4px 0;';
            return div;
        };

        menu.appendChild(mkItem('清理前缀', '移除文件名开头的引流站域名前缀', ICON_CLEAN, cleanPrefixAction));
        menu.appendChild(makeDivider());
        menu.appendChild(mkItem('JavBus', '通过 JavBus 查询并改名', ICON_BUS, () => floatMenuAction(renameJavbus, 'javbus')));
        menu.appendChild(mkItem('JavDB', '通过 JavDB 查询并改名', ICON_DB, () => floatMenuAction(renameJavdb, 'javdb')));
        menu.appendChild(mkItem('FC2', '通过 FC2 查询并改名', ICON_FC2, () => floatMenuAction(renameFc2, 'fc2')));

        // 主按钮
        const toggle = document.createElement('button');
        toggle.setAttribute('data-rp-float-toggle', 'true');
        toggle.innerHTML = RENAME_ICON + '<span>改名</span><span data-rp-float-count>0</span>';

        // 拖动定位状态
        let isDragging = false;
        let dragMoved = false;
        let startX = 0, startY = 0;
        let startLeft = 0, startTop = 0;
        let dragMaxLeft = 0, dragMaxTop = 0;

        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            // 拖动结束后的 click 不展开菜单
            if (dragMoved) {
                dragMoved = false;
                return;
            }
            // 展开前根据按钮位置调整菜单方向，避免菜单超出屏幕
            if (!menu.classList.contains('rp-open')) {
                positionFloatMenu();
            }
            menu.classList.toggle('rp-open');
        });

        wrap.appendChild(menu);
        wrap.appendChild(toggle);
        document.body.appendChild(wrap);

        // 点击空白处或按 Esc 关闭菜单
        function onClickOutside(e) {
            if (!wrap.contains(e.target)) menu.classList.remove('rp-open');
        }
        function onKeyDown(e) {
            if (e.key === 'Escape') menu.classList.remove('rp-open');
        }

        // 按住主按钮拖动定位
        toggle.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return; // 仅左键
            e.preventDefault();
            isDragging = true;
            dragMoved = false;
            startX = e.clientX;
            startY = e.clientY;
            const rect = wrap.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            // 缓存边界尺寸，避免拖动时反复读取触发 reflow
            dragMaxLeft = Math.max(0, window.innerWidth - (wrap.offsetWidth || 140));
            dragMaxTop = Math.max(0, window.innerHeight - (wrap.offsetHeight || 48));
            toggle.classList.add('rp-dragging');
            // 拖动时收起菜单
            menu.classList.remove('rp-open');
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            // 左键已松开（可能在窗口外释放导致 mouseup 丢失），结束拖动
            if (!(e.buttons & 1)) {
                isDragging = false;
                toggle.classList.remove('rp-dragging');
                if (dragMoved) {
                    dragMoved = false;
                    saveFloatPosition(Math.round(parseFloat(wrap.style.left)), Math.round(parseFloat(wrap.style.top)));
                }
                return;
            }
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (!dragMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
                dragMoved = true;
            }
            if (dragMoved) {
                const pos = clampFloatPos(wrap, startLeft + dx, startTop + dy, dragMaxLeft, dragMaxTop);
                wrap.style.left = pos.left + 'px';
                wrap.style.top = pos.top + 'px';
                wrap.style.right = 'auto';
                wrap.style.bottom = 'auto';
            }
        }

        function onMouseUp() {
            if (!isDragging) return;
            isDragging = false;
            toggle.classList.remove('rp-dragging');
            if (dragMoved) {
                saveFloatPosition(Math.round(parseFloat(wrap.style.left)), Math.round(parseFloat(wrap.style.top)));
            }
        }

        document.addEventListener('click', onClickOutside);
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // 记录清理函数，重复创建时先移除旧监听器
        floatDragCleanup = function() {
            document.removeEventListener('click', onClickOutside);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }

    /**
     * 读取保存的悬浮按钮位置（GM 存储为主，兼容旧版 localStorage）
     */
    function getFloatPosition() {
        try {
            const pos = GM_getValue(FLOAT_POS_KEY, null);
            if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') return pos;
        } catch (e) {}
        try {
            const raw = localStorage.getItem(FLOAT_POS_KEY);
            if (raw) {
                const pos = JSON.parse(raw);
                if (typeof pos.left === 'number' && typeof pos.top === 'number') return pos;
            }
        } catch (e) {}
        return null;
    }

    /**
     * 保存悬浮按钮位置（GM 存储跨 115.com 与 web.115.com 共享）
     */
    function saveFloatPosition(left, top) {
        try {
            GM_setValue(FLOAT_POS_KEY, { left, top });
            return;
        } catch (e) {}
        try {
            localStorage.setItem(FLOAT_POS_KEY, JSON.stringify({ left, top }));
        } catch (e) {}
    }

    /**
     * 计算边界内的悬浮按钮位置（下界 0，上界按按钮实际尺寸钳制）
     */
    function clampFloatPos(wrap, left, top, maxLeft, maxTop) {
        if (typeof maxLeft !== 'number') maxLeft = Math.max(0, window.innerWidth - (wrap.offsetWidth || 140));
        if (typeof maxTop !== 'number') maxTop = Math.max(0, window.innerHeight - (wrap.offsetHeight || 48));
        return {
            left: Math.max(0, Math.min(left, maxLeft)),
            top: Math.max(0, Math.min(top, maxTop))
        };
    }

    /**
     * 应用悬浮按钮位置（带边界限制）
     */
    function applyFloatPosition(wrap, left, top) {
        const pos = clampFloatPos(wrap, left, top);
        wrap.style.left = pos.left + 'px';
        wrap.style.top = pos.top + 'px';
        wrap.style.right = 'auto';
        wrap.style.bottom = 'auto';
    }

    /**
     * 根据按钮当前位置调整菜单弹出方向，避免菜单超出屏幕
     */
    function positionFloatMenu() {
        const wrap = document.querySelector('[data-rp-float]');
        const menu = wrap?.querySelector('[data-rp-float-menu]');
        if (!wrap || !menu) return;
        const rect = wrap.getBoundingClientRect();
        const menuW = menu.offsetWidth || 230;
        // 垂直：下方空间更足或上方不足时向下展开，否则保持默认向上
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow >= spaceAbove) {
            menu.style.top = 'calc(100% + 12px)';
            menu.style.bottom = 'auto';
        } else {
            menu.style.top = 'auto';
            menu.style.bottom = 'calc(100% + 12px)';
        }
        // 水平：左侧空间不足时改为左对齐，避免菜单向左溢出屏幕
        if (rect.left < menuW + 12) {
            menu.style.left = '0';
            menu.style.right = 'auto';
        } else {
            menu.style.left = 'auto';
            menu.style.right = '0';
        }
    }

    /**
     * 更新悬浮按钮（显示/隐藏、选中数量）
     */
    function updateFloatingButton() {
        let wrap = document.querySelector('[data-rp-float]');
        if (!wrap) {
            if (!isOnFilePage()) return;
            createFloatingButton();
            wrap = document.querySelector('[data-rp-float]');
            if (!wrap) return;
        }

        // 不在文件页时隐藏
        if (!isOnFilePage()) {
            wrap.style.display = 'none';
            return;
        }
        wrap.style.display = 'block';

        // 按钮首次显示后恢复保存的位置（此时尺寸真实，钳制才准确）
        if (wrap.getAttribute('data-rp-float-restored') !== 'true') {
            wrap.setAttribute('data-rp-float-restored', 'true');
            const savedPos = getFloatPosition();
            if (savedPos) {
                applyFloatPosition(wrap, savedPos.left, savedPos.top);
            }
        }

        // 更新选中数量徽标
        const count = getSelectedCount();
        const badge = wrap.querySelector('[data-rp-float-count]');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
        // 主按钮选中状态高亮
        const toggle = wrap.querySelector('[data-rp-float-toggle]');
        if (toggle) toggle.classList.toggle('rp-active', count > 0);
    }

    /**
     * 悬浮按钮菜单触发改名（自动适配新旧UI）
     */
    function floatMenuAction(call, site) {
        if (isNewUI()) {
            renameFromTopBar(call, site, 'video', true);
        } else {
            rename(call, site, 'video', true);
        }
    }

    /**
     * 清理选中文件名的引流站前缀（自动适配新旧UI，不查询外部数据库）
     */
    function cleanPrefixAction() {
        if (isNewUI()) {
            cleanPrefixFromSelected();
        } else {
            cleanPrefixOldUI();
        }
    }

    /**
     * 新版UI：清理选中文件名的引流站域名前缀，若文件名发生变化则直接改名
     */
    function cleanPrefixFromSelected() {
        const selectors = [
            '.file-list-item input[type="checkbox"]:checked',
            '.file-list-item [aria-checked="true"]',
            '.file-list-item.checked',
            '.file-list-item.selected'
        ];
        const selectedEls = new Set();
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                const item = el.closest?.('.file-list-item');
                if (item) selectedEls.add(item);
            });
        });

        if (selectedEls.size === 0) {
            GM_notification(getDetails('', '请先选择文件'));
            return;
        }

        let cleanedCount = 0;
        for (const item of selectedEls) {
            const fileData = getFileDataFromElement(item);
            if (!fileData) continue;

            const fid = fileData.fid || fileData.cid;
            if (!fid) continue;

            // 拆分扩展名，只对主名清理前缀
            let file_name = fileData.n;
            const isFolder = fileData.ico === 0;
            let suffix = '';
            if (!isFolder && file_name) {
                const lastDot = file_name.lastIndexOf('.');
                if (lastDot !== -1) {
                    suffix = file_name.substring(lastDot);
                    file_name = file_name.substring(0, lastDot);
                }
            }

            const cleaned = cleanDomainPrefix(file_name);
            if (!cleaned || cleaned === file_name) continue; // 无前缀可清或清理后为空

            send_115(fid, cleaned + suffix, fileData.n);
            cleanedCount++;
        }

        if (cleanedCount === 0) {
            GM_notification(getDetails('', '所选文件没有引流站前缀'));
        }
    }

    /**
     * 旧版UI：清理选中文件名的引流站域名前缀，若文件名发生变化则直接改名
     */
    function cleanPrefixOldUI() {
        let list = $("iframe[rel='wangpan']").contents().find("li.selected");
        if (list.length === 0) {
            GM_notification(getDetails('', '请先选择文件'));
            return;
        }

        let cleanedCount = 0;
        list.each(function(index, v) {
            let $item = $(v);
            let file_name = $item.attr("title");
            if (!file_name) return;
            let file_type = $item.attr("file_type");

            let fid;
            let suffix = '';
            if (file_type === "0") {
                // 文件夹
                fid = $item.attr("cate_id");
            } else {
                // 文件
                fid = $item.attr("file_id");
                let lastIndexOf = file_name.lastIndexOf('.');
                if (lastIndexOf !== -1) {
                    suffix = file_name.substring(lastIndexOf);
                    file_name = file_name.substring(0, lastIndexOf);
                }
            }
            if (!fid) return;

            const cleaned = cleanDomainPrefix(file_name);
            if (!cleaned || cleaned === file_name) return; // 无前缀可清或清理后为空

            send_115(fid, cleaned + suffix, $item.attr("title"));
            cleanedCount++;
        });

        if (cleanedCount === 0) {
            GM_notification(getDetails('', '所选文件没有引流站前缀'));
        }
    }

    /**
     * 从顶部操作栏触发改名
     */
    async function renameFromTopBar(call, site, rntype, ifAddDate) {
        // 多种方式获取选中文件项（覆盖不同状态的115页面）
        const selectors = [
            '.file-list-item input[type="checkbox"]:checked',
            '.file-list-item [aria-checked="true"]',
            '.file-list-item.checked',
            '.file-list-item.selected'
        ];
        const selectedEls = new Set();
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                const item = el.closest?.('.file-list-item');
                if (item) selectedEls.add(item);
            });
        });

        let processedCount = 0;

        for (const item of selectedEls) {
            // 优先使用 React Fiber 提取文件数据
            const fileData = getFileDataFromElement(item);
            const fileName = fileData?.n
                || item.querySelector('.file-name-responsive')?.getAttribute('title')
                || item.querySelector('.file-name-responsive')?.innerText;
            if (!fileName) continue;

            if (fileData?.fid) {
                // 有 React Fiber 数据，直接用
                await renameFromData(fileData, call, site, rntype, ifAddDate);
            } else {
                // 回退：通过文件名 API 查找
                await renameFromHoverMenuByFileName(fileName, call, site, rntype, ifAddDate);
            }
            processedCount++;
        }

        if (processedCount === 0) {
            console.log('[115RenamePlus] 没有选中的文件');
            GM_notification(getDetails('', '请先选择文件'));
        }
    }

    /**
     * 直接从 React Fiber 数据触发改名（无需 API 调用，最快路径）
     */
    function renameFromData(fileData, call, site, rntype, ifAddDate) {
        const fid = fileData.fid || fileData.cid;
        let file_name = fileData.n;
        const isFolder = fileData.ico === 0;

        let suffix;
        if (!isFolder && file_name) {
            const lastDot = file_name.lastIndexOf('.');
            if (lastDot !== -1) {
                suffix = file_name.substring(lastDot);
                file_name = file_name.substring(0, lastDot);
            }
        }

        if (!fid || !file_name) return;

        let VideoCode;
        if (site === 'fc2') {
            VideoCode = getVideoCode(file_name, 'fc2');
        } else {
            if (/FC2(?:[-_ ]?PPV)?/i.test(file_name)) {
                VideoCode = getVideoCode(file_name, 'fc2');
            } else {
                VideoCode = getVideoCode(file_name);
            }
        }

        if (VideoCode && VideoCode.fh) {
            const ifChineseCaptions = VideoCode.fc2C ? true : checkifChineseCaptions(VideoCode.fh, file_name);
            call(fid, rntype, VideoCode.fh, suffix, VideoCode.if4k, ifChineseCaptions, VideoCode.part, ifAddDate);
        } else {
            console.log('[115RenamePlus] 未识别到番号:', file_name);
            GM_notification(getDetails(file_name, '未识别到番号'));
        }
    }
    
    /**
     * 从hover菜单触发改名（通过文件名匹配，使用 API 获取正确的 fid）
     */
    async function renameFromHoverMenuByFileName(fileName, call, site, rntype, ifAddDate) {
        console.log('[115RenamePlus] 改名: ' + fileName);

        // 获取当前目录 cid
        const currentCid = getCurrentCid();

        // 通过 API 获取文件列表
        const fileList = await fetchFileListByAPI(currentCid);
        if (!fileList || fileList.length === 0) {
            GM_notification(getDetails(fileName, '无法获取文件数据'));
            return;
        }

        // 用文件名匹配找到对应的文件
        const fileData = fileList.find(f => f.n === fileName);
        if (!fileData) {
            console.log('[115RenamePlus] 未找到匹配文件:', fileName);
            GM_notification(getDetails(fileName, '未找到文件'));
            return;
        }

        // 文件ID - 注意：文件用 fid 或 cid，文件夹用 cid
        const fid = fileData.fid || fileData.cid;

        // 文件名
        let file_name = fileData.n;
        // 是否是文件夹（ico=0 表示文件夹）
        const isFolder = fileData.ico === 0;

        // 后缀名
        let suffix;
        if (!isFolder) {
            const lastDot = file_name.lastIndexOf('.');
            if (lastDot !== -1) {
                suffix = file_name.substring(lastDot);
                file_name = file_name.substring(0, lastDot);
            }
        }

        if (fid && file_name) {
            let VideoCode;
            if (site === 'fc2') {
                VideoCode = getVideoCode(file_name, 'fc2');
            } else {
                if (/FC2(?:[-_ ]?PPV)?/i.test(file_name)) {
                    VideoCode = getVideoCode(file_name, 'fc2');
                } else {
                    VideoCode = getVideoCode(file_name);
                }
            }
            
            if (VideoCode && VideoCode.fh) {
                const ifChineseCaptions = VideoCode.fc2C ? true : checkifChineseCaptions(VideoCode.fh, file_name);
                call(fid, rntype, VideoCode.fh, suffix, VideoCode.if4k, ifChineseCaptions, VideoCode.part, ifAddDate);
            } else {
                console.log('[115RenamePlus] 未识别到番号:', file_name);
                GM_notification(getDetails(file_name, '未识别到番号'));
            }
        }
    }

    /**
    /**
     * 执行改名方法
     * @param call       回调函数
     * @param site      网站
     * @param rntype      改名类型 video picture
     * @param ifAddDate   是否添加时间
     */
    function rename(call, site, rntype, ifAddDate ) {
        if (isNewUI()) {
            renameNewUI(call, site, rntype, ifAddDate);
        } else {
            renameOldUI(call, site, rntype, ifAddDate);
        }
    }

    /**
     * 新版UI改名方法
     */
    function renameNewUI(call, site, rntype, ifAddDate) {
        const selectedItems = document.querySelectorAll('.file-list-item');
        let hasProcessed = false;

        selectedItems.forEach(function(item) {
            const checkbox = item.querySelector('input[type=checkbox]');
            if (!checkbox || !checkbox.checked) return;

            // 优先使用 React Fiber 提取文件数据
            const fileData = getFileDataFromElement(item);
            if (fileData && fileData.fid) {
                renameFromData(fileData, call, site, rntype, ifAddDate);
                hasProcessed = true;
                return;
            }

            // 回退：从 localStorage 获取
            const dataList = getFileListFromStorage();
            if (dataList) {
                const dataIndex = item.getAttribute('data-index');
                if (dataIndex !== null) {
                    const lf = dataList[parseInt(dataIndex)];
                    if (lf) {
                        renameFromData(lf, call, site, rntype, ifAddDate);
                        hasProcessed = true;
                        return;
                    }
                }
            }

            // 最终回退：通过文件名 + API
            const nameEl = item.querySelector('.file-name-responsive');
            const fileName = nameEl?.getAttribute('title') || nameEl?.innerText;
            if (fileName) {
                renameFromHoverMenuByFileName(fileName, call, site, rntype, ifAddDate);
                hasProcessed = true;
            }
        });

        if (!hasProcessed) {
            console.log('无法获取文件数据');
            GM_notification(getDetails('', '无法获取文件数据'));
        }
    }

    /**
     * 旧版UI改名方法（保留兼容）
     */
    function renameOldUI(call, site, rntype, ifAddDate) {
        // 获取所有已选择的文件
        let list = $("iframe[rel='wangpan']")
            .contents()
            .find("li.selected")
            .each(function (index, v) {
                let $item = $(v);
                // 原文件名称
                let file_name = $item.attr("title");
                // 文件类型
                let file_type = $item.attr("file_type");

                // 文件id
                let fid;
                // 后缀名
                let suffix;
                if (file_type === "0") {
                    // 文件夹
                    fid = $item.attr("cate_id");
                } else {
                    // 文件
                    fid = $item.attr("file_id");
                    // 处理后缀
                    let lastIndexOf = file_name.lastIndexOf('.');
                    if (lastIndexOf !== -1) {
                        suffix = file_name.substring(lastIndexOf, file_name.length);
                        file_name = file_name.substring(0, lastIndexOf);
                    }
                }
                if (fid && file_name) {
                    let VideoCode;
					// 正则匹配番号
                    if (site == "mgstage"){
                        VideoCode = getVideoCode(file_name,"mgstage");
                    }else if (site == "fc2"){
                        VideoCode = getVideoCode(file_name,"fc2");
                    }else{
                        // 兜底：即使不是 fc2 按钮，也尝试识别 FC2 番号（文件名前面可能有域名前缀，如 HHD800.COM@FC2-PPV-xxxxxx）
                        if (/FC2(?:[-_ ]?PPV)?/i.test(file_name)) {
                            VideoCode = getVideoCode(file_name,"fc2");
                        } else {
                            VideoCode = getVideoCode(file_name);
                        }
                    }
                    if (VideoCode.fh) {
						if ( rntype=="video" ){
							// 校验是否是中文字幕
							// 优先使用 FC2-C 标记，如果没有则用常规检查
							let ifChineseCaptions = VideoCode.fc2C ? true : checkifChineseCaptions(VideoCode.fh, file_name);
							// 执行查询
							call(fid, rntype, VideoCode.fh, suffix, VideoCode.if4k, ifChineseCaptions, VideoCode.part, ifAddDate);
						} else if ( rntype=="picture" ){
							// 是图片时，向 part 传图片名冗余，不要中字判断，只在页面获取编号
							// 图片名冗余
							let picCaptions = getPicCaptions(VideoCode.fh, file_name);
							let ifChineseCaptions;
							// 执行查询
							call(fid, rntype, VideoCode.fh, suffix, VideoCode.if4k, ifChineseCaptions, picCaptions, ifAddDate);
						}

                    }
                }
            });
    }
    /**
     * 通过javbus进行查询
	 * 请求javbus,并请求115进行改名
	 * @param fid               文件id
	 * @param rntype      		改名类型 video picture
	 * @param fh                番号
	 * @param suffix            后缀
	 * @param ifChineseCaptions   是否有中文字幕
	 * @param part              视频分段，图片冗余文件名 
	 * @param ifAddDate              是否添加时间 
	 * @param searchUrl               请求地址
     */
    function renameJavbus(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate) {
        requestJavbus(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, javbusSearch);
    }
    function requestJavbus(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, searchUrl) {
        let title;
        let fh_o;   //网页上的番号
        let date;
        let moviePage;
        let actors = [];
        // JavDB 查询时：FC2 如果带 -C（中文字幕标记），需要去掉再查
        let fh_query = fh;
        if (/^FC2-PPV-\d{5,8}-C$/i.test(fh_query)) {
            fh_query = fh_query.replace(/-C$/i, "");
        }
        let url_s = searchUrl + fh_query;
        let getJavbusSearch = new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url_s,
                anonymous: false,
                onload: xhr => {
                    let response = parseHTML(xhr.responseText);
                    
                    // 获取所有搜索结果，找到与原始番号完全匹配的结果
                    let movieBoxes = response.find("a.movie-box");
                    let matchedBox = null;
                    
                    movieBoxes.each(function() {
                        let box = $(this);
                        let boxFh = box.find("div.photo-info date:first").html();
                        if (boxFh) {
                            // 完全匹配（忽略大小写）
                            if (boxFh.toUpperCase() === fh.toUpperCase()) {
                                matchedBox = box;
                                return false; // 找到匹配的，退出循环
                            }
                            // 也检查带连字符和不带连字符的情况
                            let normalizedBoxFh = boxFh.toUpperCase().replace(/-/g, '');
                            let normalizedFh = fh.toUpperCase().replace(/-/g, '');
                            if (normalizedBoxFh === normalizedFh) {
                                matchedBox = box;
                                return false;
                            }
                        }
                    });
                    
                    if (matchedBox) {
                        fh_o = matchedBox.find("div.photo-info date:first").html();
                        moviePage = matchedBox.attr("href");
                    }
                    resolve(moviePage);
                }
            });
        });
        function getJavbusDetail(){
            return new Promise((resolve, reject) => {
				if ( rntype=="picture" ){
					resolve();
				} else if ( rntype=="video" ){
					if(moviePage){
						GM_xmlhttpRequest({
							method: "GET",
							url: moviePage,
							anonymous: false,
							onload: xhr => {
								let response = parseHTML(xhr.responseText);
								// 标题
								title = response
								    .find("h3")
								    .html();
								title = title.slice(fh.length+1);
								// 时间
								date = response
								        .find("p:nth-of-type(2)")
								        .html();
								date = date.match(/\d{4}\-\d{2}\-\d{2}/);	
								// 演员们
								let actorTags = response.find("div.star-name").each(function(){
									actors.push($(this).find("a").attr("title"));
								});
								/*
								for ( let actor of actorTags) {
									actors.push(actor.find("a").attr("title"));
								}
								*/
								resolve();
							}
						});
					}else{
						resolve();
					}
				}
            });
        }
        function setName(){
            return new Promise((resolve, reject) => {
                if(moviePage){
                    // 清洗演员：去重、去掉分类标签、把逗号拼接的杂项拆开过滤
                    let actor = actors
                        .join(",")
                        .split(",")
                        .map(s => (s || "").trim())
                        .filter(Boolean)
                        .filter(s => !(s === "有碼" || s === "無碼" || s === "歐美" || s === "動畫" || s === "寫真" || s === "字幕" || s === "中字"))
                        .filter((s, i, arr) => arr.indexOf(s) === i)
                        .join(",");
                    // 构建新名称
                    let newName = buildNewName(fh_o, rntype, suffix, if4k, ifChineseCaptions, part, title, date, actor, ifAddDate);                    
                    if (newName) {
                        // 修改名称
                        send_115(fid, newName, fh_o);
                    }
                    resolve(newName);
                }else if (searchUrl !== javbusUncensoredSearch) {
                    // 进行无码重查询
                    requestJavbus(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, javbusUncensoredSearch);
                }else {
                    resolve("没有查到结果");
                }
            });
        }
        getJavbusSearch.then(getJavbusDetail)
            .then(setName,setName);
    }

    /**
     * 通过javdb进行查询
     * 请求javdb,并请求115进行改名
     * @param fid               文件id
     * @param rntype            改名类型 video picture
     * @param fh                番号
     * @param suffix            后缀
     * @param ifChineseCaptions   是否有中文字幕
     * @param part              视频分段，图片冗余文件名 
     * @param ifAddDate              是否添加时间 
     */
    function renameJavdb(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate) {
        // 让 javdb 也支持 FC2：把 FC2PPV/数字 统一规范成 JavDB 认可的 FC2-PPV-xxxxxx
        // 同时保留 -C（中文字幕）用于最终文件名（requestJavdb 内部查询会自动去掉 -C）
        if (/^\d{5,8}$/i.test(fh)) {
            // 来自旧 fc2 分支：只提取了数字
            fh = "FC2-PPV-" + fh;
        } else if (/^FC2PPV[-_ ]?\d{5,8}/i.test(fh)) {
            fh = fh.replace(/^FC2PPV[-_ ]?(\d{5,8})(?:[-_ ]?(C))?$/i, function(_, n, c){
                return "FC2-PPV-" + n + (c ? "-" + c.toUpperCase() : "");
            });
        } else if (/^FC2[-_ ]?PPV[-_ ]?\d{5,8}/i.test(fh)) {
            fh = fh.replace(/^FC2[-_ ]?PPV[-_ ]?(\d{5,8})(?:[-_ ]?(C))?$/i, function(_, n, c){
                return "FC2-PPV-" + n + (c ? "-" + c.toUpperCase() : "");
            });
        }
        requestJavdb(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, javdbSearch);
    }
    function requestJavdb(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, searchUrl) {
        let title;
        let fh_o;
        let date;
        let moviePage;
        let actors = [];
        let fh_query = fh;
        if (/^FC2-PPV-\d{5,8}-C$/i.test(fh_query)) {
            fh_query = fh_query.replace(/-C$/i, "");
        }
        let url_s = searchUrl + fh_query;
        let getJavdbSearch = new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url_s,
                onload: xhr => {
                    let response = parseHTML(xhr.responseText);

                    let movieItems = response.find(".movie-list .item");
                    if (!movieItems.length) {
                        movieItems = response.find(".grid-item, .movie-list a, [class*='movie'] .item");
                    }
                    console.log('[115RenamePlus] JavDB搜索:', url_s, '结果数:', movieItems.length);
                    let matchedItem = null;

                    function normCode(s) {
                        if (!s) return "";
                        let x = String(s).toUpperCase().replace(/[\s\-_]/g, "");
                        if (x.startsWith("FC2")) x = x.replace(/PPV/g, "");
                        return x;
                    }

                    movieItems.each(function() {
                        let item = $(this);
                        let itemFh = item.find(".video-title strong").text().trim();
                        if (!itemFh) return;

                        let a = itemFh.toUpperCase();
                        let b = fh_query.toUpperCase();

                        if (a === b) { matchedItem = item; return false; }
                        if (normCode(a) === normCode(b)) { matchedItem = item; return false; }
                        if (b.indexOf("FC2") === 0) {
                            let aNum = a.match(/FC2[^0-9]*(\d{5,8})/i);
                            let bNum = b.match(/FC2[^0-9]*(\d{5,8})/i);
                            if (aNum && bNum && aNum[1] === bNum[1]) { matchedItem = item; return false; }
                        }
                    });

                    if (matchedItem) {
                        fh_o = matchedItem.find(".video-title strong").text().trim();
                        let href = matchedItem.find("a").attr("href");
                        moviePage = href ? javdbBase + href : null;
                    }
                    resolve(moviePage);
                },
                onerror: (e) => {
                    console.log('[115RenamePlus] JavDB请求失败:', e);
                    resolve(null);
                }
            });
        });
        function getJavdbDetail(){
            return new Promise((resolve, reject) => {
                if (rntype == "picture") {
                    resolve();
                } else if (rntype == "video") {
                    if (moviePage) {
                        GM_xmlhttpRequest({
                            method: "GET",
                            url: moviePage,
                            onload: xhr => {
                                let response = parseHTML(xhr.responseText);
                                title = response.find(".current-title").text().trim();
                                if (title && fh_o && title.startsWith(fh_o)) {
                                    title = title.slice(fh_o.length).trim();
                                }

                                let labels = {};
                                response.find(".panel-block").each(function() {
                                    let strong = $(this).find("strong");
                                    if (strong.length) {
                                        let key = strong.text().replace(":", "").trim();
                                        labels[key] = $(this);
                                    }
                                });

                                if (labels["日期"]) {
                                    let dateText = labels["日期"].find(".value").text().trim();
                                    date = dateText.match(/\d{4}-\d{2}-\d{2}/);
                                }

                                let actorBlock = labels["演員"] || labels["演员"] || labels["出演"] || labels["出演者"] || labels["Cast"];
                                if (actorBlock) {
                                    actorBlock.find(".value a").each(function(){
                                        let $a = $(this);
                                        let href = $a.attr("href") || "";
                                        let a = $a.text().trim();
                                        if (!a) return;
                                        if (href.indexOf("/actors/") === -1) return;
                                        let nextStrong = $a.next("strong.symbol");
                                        if (nextStrong.length && nextStrong.hasClass("female")) {
                                            if (actors.indexOf(a) === -1) actors.push(a);
                                        }
                                    });
                                }

                                if (!actors.length) {
                                    response.find("a[href*=\"/actors/\"]").each(function(){
                                        let $a = $(this);
                                        let a = $a.text().trim();
                                        if (!a) return;
                                        if (a.indexOf(",") !== -1) return;
                                        let nextStrong = $a.next("strong.symbol");
                                        if (!(nextStrong.length && nextStrong.hasClass("female"))) return;
                                        if (actors.indexOf(a) === -1) actors.push(a);
                                    });
                                }

                                if (title && actors.length) {
                                    for (let a of actors) {
                                        if (a && title.endsWith(" " + a)) {
                                            title = title.slice(0, title.length - (a.length + 1)).trim();
                                        }
                                    }
                                }
                                resolve();
                            }
                        });
                    } else {
                        resolve();
                    }
                }
            });
        }
        function setName(){
            return new Promise((resolve, reject) => {
                if (moviePage) {
                    let actor = actors.toString();
                    let newName = buildNewName(fh_o, rntype, suffix, if4k, ifChineseCaptions, part, title, date, actor, ifAddDate);
                    if (newName) {
                        send_115(fid, newName, fh_o);
                    }
                    resolve(newName);
                } else {
                    console.log('[115RenamePlus] JavDB未查到结果:', fh);
                    GM_notification(getDetails(fh, "JavDB未查到结果"));
                    resolve("没有查到结果");
                }
            });
        }
        getJavdbSearch.then(getJavdbDetail)
            .then(setName, setName);
    }

    /**
     * 通过avmoo进行查询
     * 请求avmoo,并请求115进行改名
     * @param fid               文件id
     * @param rntype      		改名类型 video picture
     * @param fh                番号
     * @param suffix            后缀
     * @param ifChineseCaptions   是否有中文字幕
     * @param part              视频分段，图片冗余文件名 
     * @param ifAddDate              是否添加时间 
     * @param searchUrl               请求地址
     */
    function renameFc2(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate) {
        requestFC2(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, Fc2Search);
    }
    function requestFC2(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, searchUrl) {
        // 从 fh 中提取纯数字编号（如 FC2-PPV-745325-C / FC2-745325-C -> 745325）
        let fc2Num = fh.match(/FC2[-_ ]?(?:PPV[-_ ]?)?(\d{5,8})/i);
        if (!fc2Num) {
            // 兜底：如果 fh 本身就是数字
            fc2Num = [null, fh.replace(/[^0-9]/g, "")];
        }
        let fc2Id = fc2Num[1];
        
        GM_xmlhttpRequest({
            method: "GET",
            url: searchUrl + fc2Id + "/",
            anonymous: false,
            onload: xhr => {
                let response = parseHTML(xhr.responseText);
                let title = response
                    .find("div.items_article_MainitemThumb img")
                    .attr("title");
                // 如果 title 是 HTML 或为空，尝试从其他位置获取
                if (!title || title.indexOf("<") !== -1 || title.indexOf("svg") !== -1) {
                    title = response.find("div.items_article_MainitemThumb img").attr("alt") || "";
                }
                if (!title) {
                    title = response.find("div.items_article_title a").text().trim() || "";
                }
                // 清理 title 中的 HTML 标签和实体
                if (title) {
                    let tmp = document.createElement("div");
                    tmp.innerHTML = title;
                    title = tmp.textContent || tmp.innerText || "";
                    title = title.trim();
                }
                // 卖家
                let user = response
                            .find("div.items_article_headerInfo > ul > li a:last ")
                            .text().trim();
                // 上架时间 上架时间：2020/06/17
                let dateText = response
                            .find("div.items_article_Releasedate p")
                            .html();
                let date = dateText ? dateText.replace(/\s+/g,"").replace(/:/g, "").replace(/\//g, "-") : "";
				if ( rntype=="picture" ){
					if ( fh && title ) {
						title="";
						user="";
						date="";
					}
				}				
                // 构建标准番号格式（与 JavDB 保持一致：FC2-xxxxxx，去掉 PPV）
                let standardFh = "FC2-" + fc2Id;
                // 如果原 fh 里有 -C 标记，加回去
                if (/-C$/i.test(fh)) {
                    standardFh += "-C";
                }
                
                if (title) {
                    // 构建新名称
                    let newName = buildNewName(standardFh, rntype, suffix, if4k, ifChineseCaptions, part, title, date, user, ifAddDate);
                    if (newName) {
                        // 修改名称
                        send_115(fid, newName, standardFh);
                    }
                } else if (searchUrl !== javbusUncensoredSearch) {
                    GM_notification(getDetails(standardFh, "商品页可能已消失"));
                    // 进行无码重查询
                    // requestJavbus(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, javbusUncensoredSearch);
                }
            }
        })
    }

    /**
     * 图片名冗余
     * @param fh    番号
     * @param title 标题
     */
    function getPicCaptions(fh, title) {
        let regExp = new RegExp(fh + "[_-]?[A-Z]{1,5}");
        let match = title.toUpperCase().match(regExp);
        if (match) {
            let houzhui = title.slice( fh.length , title.length )
            return houzhui;
        }
    }
	
    /**
     * 校验是否为中文字幕
     * @param fh    番号
     * @param title 标题
     */
    function checkifChineseCaptions(fh, title) {
        // 清理引流站前缀，避免域名中的字母被误判为字幕
        title = cleanDomainPrefix(title);
        if (title.indexOf("中文字幕") !== -1) {
            return true;
        }
        if (title.indexOf("中字") !== -1) {
            return true;
        }
        // 检查标题中是否包含明确的字幕标识，如"C"字符（但不是作为番号一部分）
        // 排除番号本身包含C的情况，只看标题中其他位置的C
        let regExp = new RegExp("[_-]?C(?!D)");
        let match = title.toUpperCase().match(regExp);
        if (match) {
            // 确保匹配到的C不在番号部分
            let upperTitle = title.toUpperCase();
            let fhUpper = fh.toUpperCase();
            let cMatch = match[0];
            
            // 查找匹配到的C在标题中的位置
            let cIndex = upperTitle.indexOf(cMatch);
            // 查找番号在标题中的位置
            let fhIndex = upperTitle.indexOf(fhUpper);
            let fhEndIndex = fhIndex + fhUpper.length;
            
            // 如果C的位置在番号之后，且不在番号内部，则认为是字幕标识
            if (cIndex >= 0 && fhIndex >= 0) {
                if (cIndex < fhIndex || cIndex >= fhEndIndex) {
                    return true;
                }
            }
        }
        return false;
    }
	
    /**
     * 构建新名称：番号 中文字幕 日期 标题  文件名不超过255
     * @param fh                番号
	 * @param rntype      		改名类型 video picture
     * @param suffix            后缀，扩展名
     * @param ifChineseCaptions   是否有中文字幕
	 * @param part				视频分段，图片冗余文件名 
     * @param title             番号标题
     * @param date              日期
     * @param actor             演员
     * @param ifAddDate           是否加日期
     * @returns {string}        新名称
     */
    function buildNewName(fh, rntype, suffix, if4k, ifChineseCaptions, part, title, date, actor, ifAddDate) {
		if ( rntype=="video" ){
			if (title) {
				// javbus 的 <h3> 可能是：番号 + 标题 + 演员名；而我们会另外拼接 actor，避免重复
				if (actor && title) {
					let actorList = String(actor).split(",").map(s => (s || "").trim()).filter(Boolean);
					for (let a of actorList) {
						if (title.endsWith(" " + a)) {
							title = title.slice(0, title.length - (a.length + 1)).trim();
						}
					}
				}
                let newName = String(fh);
				// 是 4k
				if (if4k) {
					newName = newName + if4k;
				}
				// 有中文字幕
				if (ifChineseCaptions) {
					newName = newName + "-C";
				}
				// 有分段：统一格式为 番号_字母/数字
				if (part){
					newName = newName + "_" + part;
				}
				// 有演员
				if (actor) {
					newName = newName + " " + actor;
				}
				// 拼接标题 判断长度
				newName = newName + " " + title;
				if ( newName.length > 200 ){
					newName = newName.substring(0, 200);
					newName += "...";
				}
				// 有时间
				if (ifAddDate && date) {
					newName = newName + " " + date;
				}
				if (suffix) {
					// 文件保存后缀名
					newName = newName + suffix;
				}
				return newName;
			}
        } else if ( rntype=="picture" ){
			if (fh){
				let newName = String(fh);
				if (part){
				    newName = newName + "_" + part;
				}
				if (suffix) {
				    // 文件保存后缀名
				    newName = newName + suffix;
				}
				return newName;
			}
		}
    }
	
    /**
     * 115名称不接受(\/:*?\"<>|)
     * @param name
     */
    function stringStandard(name) {
        return name.replace(/\\/g, "")
            .replace(/\//g, " ")
            .replace(/:/g, " ")
            .replace(/\?/g, " ")
            .replace(/"/g, " ")
            .replace(/</g, " ")
            .replace(/>/g, " ")
            .replace(/\|/g, "")
            .replace(/\*/g, " ");
    }
	
    /**
     * 请求115接口改名 
     * @param id 文件id
     * @param name 要修改的名称
     * @param fh 番号
     */
    function send_115(id, name, fh) {
        let file_name = stringStandard(name);
        GM_xmlhttpRequest({
            method: "POST",
            url: "https://webapi.115.com/files/edit",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": "https://115.com",
                "Referer": "https://115.com/"
            },
            data: "fid=" + id + "&file_name=" + encodeURIComponent(file_name),
            withCredentials: true,
            onload: function (xhr) {
                try {
                    let result = JSON.parse(xhr.responseText);
                    if (!result.state) {
                        GM_notification(getDetails(fh, "修改失败"));
                        console.log("请求 115 接口异常：" + (result.error || "未知错误"));
                    } else {
                        GM_notification(getDetails(fh, "修改成功"));
                        console.log("修改文件名称,fh:" + fh, "name:" + file_name);
                        refreshAfterRename(id, file_name);
                    }
                } catch (e) {
                    GM_notification(getDetails(fh, "修改失败"));
                    console.log("解析响应失败:", e);
                }
            },
            onerror: function (e) {
                GM_notification(getDetails(fh, "修改失败"));
                console.log("请求失败:", e);
            }
        });
    }

    /**
     * 改名成功后刷新：更新文件名并取消选中状态
     */
    function refreshAfterRename(fid, newName) {
        const items = document.querySelectorAll('.file-list-item');
        let found = false;

        for (const item of items) {
            const fileData = getItemFileData(item);
            if (!fileData) continue;
            if (String(fileData.fid) !== String(fid) && String(fileData.cid) !== String(fid)) continue;
            found = true;

            // 更新文件名显示
            updateItemName(item, newName);
            // 同步 React Fiber 数据，防止重渲染回退
            updateFiberFileName(item, newName);
            // 同步持久化 store，防止刷新后回退
            updatePersistedFileName(fid, newName);
            // 取消选中状态
            deselectFileItem(item);
            break;
        }

        if (!found) {
            // 未定位到对应项：同步持久化 store 并刷新列表
            updatePersistedFileName(fid, newName);
            scheduleListRefresh();
            return;
        }

        // 防回退：React 重渲染后再次校验显示与选中状态
        setTimeout(function() {
            const item = findItemByFid(fid);
            if (!item) return;
            updateItemName(item, newName);
            if (isItemSelected(item)) deselectFileItem(item);
        }, 300);
    }

    /**
     * 通过 fid/cid 在 DOM 中定位文件项
     */
    function findItemByFid(fid) {
        const items = document.querySelectorAll('.file-list-item');
        for (const item of items) {
            const fileData = getItemFileData(item);
            if (fileData && (String(fileData.fid) === String(fid) || String(fileData.cid) === String(fid))) {
                return item;
            }
        }
        return null;
    }

    /**
     * 获取文件项数据：优先 React Fiber，回退到 data-index + 持久化 store
     */
    function getItemFileData(item) {
        const fileData = getFileDataFromElement(item);
        if (fileData) return fileData;
        const dataIndex = item.getAttribute('data-index');
        if (dataIndex !== null) {
            const dataList = getFileListFromStorage();
            if (dataList) return dataList[parseInt(dataIndex)] || null;
        }
        return null;
    }

    /**
     * 更新文件项显示的名称
     */
    function updateItemName(item, newName) {
        const nameEl = item.querySelector('.file-name-responsive');
        if (nameEl) {
            nameEl.textContent = newName;
            nameEl.setAttribute('title', newName);
        }
    }

    /**
     * 同步更新 React Fiber 中的文件数据，防止重渲染回退
     */
    function updateFiberFileName(item, newName) {
        const fiberKey = getReactFiberKey(item);
        if (!fiberKey) return;
        const fiber = item[fiberKey];
        const candidates = [];
        if (fiber?.child?.memoizedProps?.file) candidates.push(fiber.child.memoizedProps.file);
        if (fiber?.return?.memoizedProps?.file) candidates.push(fiber.return.memoizedProps.file);
        let current = fiber?.return;
        for (let i = 0; i < 5 && current; i++) {
            if (current.memoizedProps?.file) candidates.push(current.memoizedProps.file);
            current = current.return;
        }
        const seen = new Set();
        candidates.forEach(function(f) {
            if (!seen.has(f)) {
                seen.add(f);
                f.n = newName;
            }
        });
    }

    /**
     * 同步更新 localStorage 持久化 store 中的文件名
     */
    function updatePersistedFileName(fid, newName) {
        try {
            const fileListPersist = localStorage.getItem('115life_file_list_persist');
            if (!fileListPersist) return;
            const parsed = JSON.parse(fileListPersist);
            const files = parsed.state?.files;
            if (!Array.isArray(files)) return;
            const target = files.find(function(f) {
                return f && (String(f.fid) === String(fid) || String(f.cid) === String(fid));
            });
            if (target) {
                target.n = newName;
                localStorage.setItem('115life_file_list_persist', JSON.stringify(parsed));
            }
        } catch (e) {
            console.log('更新持久化文件列表失败:', e);
        }
    }

    /**
     * 判断文件项是否处于选中状态
     */
    function isItemSelected(item) {
        return item.querySelector('input[type="checkbox"]:checked') !== null
            || item.querySelector('[aria-checked="true"]') !== null
            || item.classList.contains('checked')
            || item.classList.contains('selected');
    }

    /**
     * 刷新文件列表（去抖，避免批量改名时多次刷新）
     */
    function scheduleListRefresh() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function() {
            if (typeof unsafeWindow.refreshNetdiskFileList === 'function') {
                unsafeWindow.refreshNetdiskFileList();
            } else {
                location.reload();
            }
        }, 500);
    }

    /**
     * 取消文件项的选中状态
     */
    function deselectFileItem(item) {
        // 方式1：取消 checkbox
        const checkbox = item.querySelector('input[type="checkbox"]:checked');
        if (checkbox) {
            checkbox.click();
            return;
        }
        // 方式2：取消 aria-checked
        const ariaEl = item.querySelector('[aria-checked="true"]');
        if (ariaEl) {
            ariaEl.click();
            return;
        }
        // 方式3：移除选中 class
        const groupDiv = item.querySelector('.group');
        if (groupDiv && groupDiv.classList.contains('bg-blue-100')) {
            groupDiv.classList.remove('bg-blue-100');
        }
    }

    /**
     * 清理引流站域名前缀（如 489155.com@ / hhd800.com@ / www.98T.la@ / 1start00558@）
     * @param title 原始文件名
     * @returns 清理后的文件名
     */
    function cleanDomainPrefix(title) {
        if (!title) return title;

        // 第1层：完整URL + @ 格式（覆盖 https://www.98T.la@ 等）
        title = title.replace(/(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:\.[a-z]{2,})?@/gi, '');
        // 第2层：域名@ 格式（覆盖 489155.com@ / hhd800.com@ 等）
        title = title.replace(/^\s*[a-z0-9.-]+\.[a-z]{2,6}@/i, '');
        // 第3层：任意数字+字母@ 格式（覆盖 1start00558@ / javbus@ 等）
        title = title.replace(/^\s*[a-z0-9]+@/i, '');

        // 特殊硬编码：无 @ 的前缀
        title = title
            .replace(/^BIG2048\.COM\s*/i, '')
            .replace(/^SIS001\s*/i, '');

        return title;
    }

    /**
     * 获取详细信息
     * @param text 内容
     * @param title 标题
     * @returns {{text: *, title: *, timeout: number}}
     */
    function getDetails(text, title) {
        return {
            text: text,
            title: title,
            timeout: 1000
        };
    }

    /**
     * 获取番号
     * @param title         源标题
	 * @param type			番号类型 mgstage fc2
     * @returns {string}    提取的番号
     */
    function getVideoCode(title, type="nomal") {
        title = title.toUpperCase();

        // 清理引流站前缀（通用正则 + 特殊硬编码）
        title = cleanDomainPrefix(title);
        
        // 其他清理：分辨率、字幕组、来源标记等
        title = title
            .replace("1080P", "")
            .replace("720P", "")
            .replace("[JAV] [UNCENSORED]","")
            .replace("[THZU.CC]","")
            .replace("[22SHT.ME]","")
            .replace("[7SHT.ME]","");

        // 判断是否多集/分段：支持多种格式
        let part;
        
        // 特殊处理 -C（中文字幕标记），不要把它当成 part
        let fc2CFlag = false;
        // FC2 格式：FC2-PPV-xxxxxx-C / FC2-xxxxxx-C
        if (/FC2[-_ ]?(?:PPV[-_ ]?)?\d{5,8}[-_ ]C$/i.test(title)) {
            fc2CFlag = true;
            title = title.replace(/[-_ ]C$/i, "");
        }
        // 通用格式：XXXXX-XX-C（非 FC2 的番号）
        else if (/^[A-Z]{2,10}[-_ ]?\d{2,6}[-_ ]C$/i.test(title)) {
            fc2CFlag = true;
            title = title.replace(/[-_ ]C$/i, "");
        }
        
        // 传统格式：CD1, HD2, FHD3, HHB4 等（只在文件名中找，不要从整段 title 末尾取，避免误把日期 03-19 当分段）
        if (!part) {
            part = title.match(/CD\d{1,2}/);
        }if (!part) {
            part = title.match(/HD\d{1,2}/);
        }if (!part) {
            part = title.match(/FHD\d{1,2}/);
        }if (!part) {
            part = title.match(/HHB\d{1,2}/);
        }
        if (part){
            part = part.toString().match(/\d+/).toString();
        }

		let if4k;
		if (!if4k) {
			if4k = title.match(/(-4K){1}/);
			if(if4k){ if4k = "-4k";}
		} if (!if4k) {
		    if4k = title.match(/(VP9 版){1}/);
			if(if4k){ if4k = "-4kVP9 版";}
		} if (!if4k) {
			if4k = title.match(/(H264 版){1}/);
			if(if4k){ if4k = "-4kH264 版";}
		}

		
		let t = '';
		if (type=="mgstage"){
			t = title.match(/\d{3,4}[A-Z]{3,4}[\-_]?\d{3,4}/)
			if (!t) {  // シロウトTV @SIRO-3585
				t = title.match(/[A-Z]{2,5}[\-_]{1}\d{3,5}/);
			}	
		}else if (type=="fc2"){
			// 支持：
			// - FC2PPV-3281892 / FC2-PPV-3281892 / FC2 PPV 3281892
			// - 无 PPV 格式：FC2-745325 / FC2-745325-C
			// - 可带分段：FC2PPV-4679178-3 / FC2-PPV-4679178_4
			// - 可带字幕标记：...-C（中文字幕语义，不作为分段）
			// - FC 简写格式：FC4871181（引流站常见，自动补全为 FC2-PPV）

			// 先尝试匹配 FC + 5-8 位数字的简写格式（如 fc4871181）
			if (!t) {
				let mFcShort = title.match(/(?:^|[^A-Z0-9])FC[\-_ ]?(\d{5,8})(?:[\-_ ]?([0-9]{1,2}|[A-Z]))?(?:[\-_ ]?(C))?(?=$|[^A-Z0-9])/i);
				if (mFcShort) {
					let num = mFcShort[1];
					let partCandidate = mFcShort[2];
					let cFlag = mFcShort[3];
					t = "FC2-PPV-" + num;
					if (partCandidate && !part) {
						part = partCandidate;
					}
					if (cFlag) t += "-" + cFlag;
				}
			}

			// PPV 是可选的，匹配模式：FC2 后可选 PPV，然后是数字，可选分段，可选-C
			if (!t) {
				let m = title.match(/(?:^|[^A-Z0-9])(FC2)(?:[\-_ ]{0,2}(PPV))?[\-_ ]{0,2}(\d{5,8})(?:[\-_ ]{0,2}([0-9]{1,2}|[A-Z]))?(?:[\-_ ]{0,2}(C))?(?=$|[^A-Z0-9])/);
				if (m) {
					let fc2 = m[1];
					let num = m[3];
					let partCandidate = m[4];
					let cFlag = m[5];
					t = "FC2-PPV-" + num;
					// 如果存在分段且当前还没识别到 part，则记录下来（C 不是分段）
					if (partCandidate && !part) {
						part = partCandidate;
					}
					if (cFlag) t += "-" + cFlag;
					// FC2 已命中就别再掉进后面的通用规则里乱匹配
				}
			}

		}else {
			t = title.match(/T28[\-_]\d{3,4}/);
			// 一本道
			if (!t) {
				t = title.match(/1PONDO[\-_ ]\d{6}[\-_]\d{2,4}/);
				if (t) {
					t = t.toString().replace("1PONDO_", "")
						.replace("1PONDO-", "");
				}
			}if (!t) {
				//10MUSUME
				t = title.match(/10MUSUME[\-_]\d{6}[\-_]\d{2,4}/);
				if (t) {
					t = t.toString().replace("10MUSUME", "")
						.replace("10MUSUME-", "");
				}
			}
			if (!t) {
				t = title.match(/HEYZO[\-_]{0,1}\d{4}/);
			}
			if (!t) {
				// 加勒比
				t = title.match(/CARIB[\-_ ]\d{6}[\-_]\d{3}/);
				if (t) {
					t = t.toString().replace("CARIB-", "")
						.replace("CARIB_", "");
				}
			}if (!t) {
				// 加勒比
				t = title.match(/CARIBBEAN[\-_ ]\d{6}[\-_]\d{3}/);
				if (t) {
					t = t.toString().replace("CARIBBEAN-", "")
						.replace("CARIBBEAN", "");
				}
			}
			if (!t) {
				// 东京热
				t = title.match(/N[-_]\d{4}/);
			}
			if (!t) {
				// Jukujo-Club | 熟女俱乐部
				t = title.match(/JUKUJO[\-_]\d{4}/);
			}
			
			// 通用
			if (!t) {
				// 允许末尾 1 个字母分段（如 STAR-590B）
				// 放宽字母数量限制到 2-10 个（支持 DANDYA-013 等长字母番号）
				// 放宽数字部分到 2-6 位（支持 LAFBD-41 等短数字番号）
				t = title.match(/[A-Z]{2,10}[\-_]{0,1}\d{2,6}[A-Z]?/);
			}
			if (!t) {
				t = title.match(/\d{6}[\-_]\d{2,4}/);
			}
			if (!t) {
				t = title.match(/[A-Z]+\d{3,5}/);
			}
			if (!t) {
				t = title.match(/[A-Za-z]+[\-_]{0,1}\d+/);
			}
			if (!t) {
				t = title.match(/\d+[\-_]{0,1}\d+/);
			}			
		}

        if (!t) {
            return false;
        }
        if (t) {
            let tStr = t.toString();
            
            // 先把番号里的 _ 统一成 -，避免后面处理分段时漏判
            tStr = tStr.replace(/_/g, "-");

            // 从"番号本身"里识别并剥离尾部分段（避免误把日期 2015-03-19 的 -19 当分段）
            // 1) 数字分段：FC2-PPV-4679178-3 / FC2-PPV-4679178_4
            // 2) 字母分段：STAR-590A
            // 注意：-C 是中文字幕标记，不是分段，要排除
            
            // 先检查是否是 FC2-xxxxxx-C 格式，如果是，先把 -C 临时去掉，避免误判为分段
            let tempC = "";
            if (/FC2[-_ ]?(?:PPV[-_ ]?)?\d{5,8}[-_ ]C$/i.test(tStr)) {
                tempC = "C";
                tStr = tStr.replace(/[-_ ]C$/i, "");
            }
            
            // 如果前面 fc2 分支已经直接识别出 part，就不要再从番号里误剥离
            // 如果前面 fc2 分支已经直接识别出 part，就不要再从番号里误剥离
            // 改进：区分真正的分段（CD1/HD2 等）和番号中的数字（LAFBD-41 中的 41）
            if (!part) {
                let mNum = tStr.match(/^(.*?)-(\d{1,2})$/);
                if (mNum) {
                    let prefix = mNum[1];
                    let suffix = mNum[2];
                    // 只有当前缀是传统分段标识时才分割
                    if (prefix.match(/^(CD|HD|FHD|HHB|DISC|PART)$/i)) {
                        tStr = prefix;
                        part = suffix;
                    } else {
                        // 数字是番号一部分，保留完整番号
                    }
                }
            }
            if (!part) {
                let mLetter = tStr.match(/^(.+?)([A-Z])$/);
                if (mLetter && /[0-9][A-Z]$/.test(tStr)) {
                    tStr = mLetter[1];
                    part = mLetter[2];
                }
            }
            
            // 把临时移除的 -C 标记记录到 fc2CFlag，让后续逻辑处理
            if (tempC && !fc2CFlag) {
                fc2CFlag = true;
            }

            return{
                fh: tStr,
                part: part,
				if4k: if4k,
                // FC2-C 字幕标记：如果之前移除了 -C，这里告诉调用者这是中文字幕版本
                fc2C: fc2CFlag || undefined,
            };
        }
    }

})();
