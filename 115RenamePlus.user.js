// ==UserScript==
// @name                115RenamePlus (新版UI测试)
// @namespace           https://github.com/Oissp/115RenamePlus/
// @version             0.12.0-beta.11
// @updateURL           https://raw.githubusercontent.com/Oissp/115RenamePlus/new-ui-adapt/115RenamePlus.user.js
// @downloadURL         https://raw.githubusercontent.com/Oissp/115RenamePlus/new-ui-adapt/115RenamePlus.user.js
// @description         115RenamePlus(根据现有的文件名<番号>查询并修改文件名) - 新版UI适配测试版
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
// @grant               unsafeWindow
// @connect             webapi.115.com
// ==/UserScript==

    /*
     * @param suffix            后缀，就是扩展名
     */
(function () {
    'use strict';
    
    // 标记脚本已加载
    window.__115RenamePlusLoaded = true;
    console.log('[115RenamePlus] 脚本已加载, 版本 0.12.0-beta.10 (新版UI测试)');
    
    // 添加全局调试函数
    window.debug115RenamePlus = async function(fileName) {
        const cid = new URL(window.location.href).searchParams.get('cid') || '0';
        const apiUrl = 'https://webapi.115.com/files?aid=1&cid=' + cid + '&offset=0&limit=50&type=0&show_dir=1&fc_mix=1&natsort=1&format=json';
        
        console.log('[Debug] 请求 API:', apiUrl);
        
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: apiUrl,
                withCredentials: true,
                onload: function(response) {
                    console.log('[Debug] API 响应:', response.responseText.substring(0, 1000));
                    try {
                        const data = JSON.parse(response.responseText);
                        console.log('[Debug] state:', data.state);
                        console.log('[Debug] 文件数量:', data.data?.length);
                        
                        if (data.data) {
                            data.data.forEach((f, i) => {
                                console.log('[Debug] 文件' + i + ':', f.n, 'cid:', f.cid, 'fid:', f.fid);
                            });
                            
                            if (fileName) {
                                const found = data.data.find(f => f.n === fileName);
                                console.log('[Debug] 查找文件:', fileName, '结果:', found);
                            }
                        }
                        resolve(data);
                    } catch(e) {
                        console.log('[Debug] 解析错误:', e);
                        resolve(null);
                    }
                },
                onerror: function(err) {
                    console.log('[Debug] 请求错误:', err);
                    resolve(null);
                }
            });
        });
    };
    console.log('[115RenamePlus] 调试函数已挂载: window.debug115RenamePlus("文件名")');
    
    // 新版UI按钮样式
    let rename_btn_class = "flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm xl:text-base rounded transition-colors whitespace-nowrap flex-shrink-0 text-gray-700 hover:bg-blue-500 hover:text-white";
    
    // 按钮 HTML（新版UI适配）
    let rename_buttons = `
            <button id="rename_video_javbus" class="${rename_btn_class}" title="视频改名javbus">
                <span>改名JavBus</span>
            </button>
            <button id="rename_video_javdb" class="${rename_btn_class}" title="视频改名javdb">
                <span>改名JavDB</span>
            </button>
            <button id="rename_video_FC2" class="${rename_btn_class}" title="视频改名FC2">
                <span>改名FC2</span>
            </button>
        `;
    
    // 记录是否已添加按钮
    let buttonsAdded = false;
    
    /**
     * 添加按钮的定时任务
     */
    let interval = setInterval(buttonInterval, 1000);
    console.log('[115RenamePlus] 定时器已启动');

    // javbus
    let javbusBase = "https://www.javbus.com/";
    let javbusSearch = javbusBase + "search/";
    let javbusUncensoredSearch = javbusBase + "uncensored/search/";

    let Fc2Search = "https://adult.contents.fc2.com/article/";

    let javdbBase = "https://javdb.com";
    let javdbSearch = javdbBase + "/search?q=";

    'use strict';

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
            return el[fiberKey]?.child?.memoizedProps?.file || null;
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
     * 通过 API 获取当前目录的文件列表（新版UI专用）
     * localStorage 数据不可靠，需要通过 API 获取正确的 fid
     */
    function fetchFileListByAPI(cid) {
        return new Promise((resolve, reject) => {
            // 使用新版115实际使用的 API 端点
            const apiUrl = 'https://webapi.115.com/files?aid=1&cid=' + cid + '&offset=0&limit=50&type=0&show_dir=1&fc_mix=1&natsort=1&format=json';
            
            console.log('[115RenamePlus] 请求 API:', apiUrl);

            GM_xmlhttpRequest({
                method: 'GET',
                url: apiUrl,
                headers: {
                    'Origin': 'https://115.com',
                    'Referer': 'https://115.com/'
                },
                withCredentials: true,
                onload: function(response) {
                    console.log('[115RenamePlus] API 响应状态:', response.status);
                    console.log('[115RenamePlus] API 响应内容:', response.responseText.substring(0, 500));
                    
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.state && data.data) {
                            console.log('[115RenamePlus] API 返回文件数:', data.data.length);
                            // 打印前几个文件的信息用于调试
                            data.data.slice(0, 3).forEach((f, i) => {
                                console.log('[115RenamePlus] 文件' + i + ':', f.n, 'fid:', f.cid || f.fid);
                            });
                            resolve(data.data);
                        } else {
                            console.log('[115RenamePlus] API 返回数据异常:');
                            console.log('  - state:', data.state);
                            console.log('  - error:', data.error);
                            console.log('  - errcode:', data.errcode);
                            resolve(null);
                        }
                    } catch (e) {
                        console.log('[115RenamePlus] 解析 API 响应失败:', e);
                        resolve(null);
                    }
                },
                onerror: function(error) {
                    console.log('[115RenamePlus] API 请求失败:', error);
                    resolve(null);
                }
            });
        });
    }
    
    /**
     * 获取当前目录 cid
     */
    function getCurrentCid() {
        const url = new URL(window.location.href);
        return url.searchParams.get('cid') || '0';
    }

    /**
     * 添加按钮定时任务(检测到可以添加时添加按钮)
     * 同时支持新版和旧版UI
     */
    function buttonInterval() {
        if (isNewUI()) {
            // 新版UI：检测操作栏
            buttonIntervalNewUI();
        } else {
            // 旧版UI：检测右键菜单
            buttonIntervalOldUI();
        }
    }

    /**
     * 新版UI按钮注入（注入到选中文件的顶部操作栏）
     */
    function buttonIntervalNewUI() {
        // 查找选中文件的顶部操作栏
        const actionBar = findSelectedFileActionBar();
        
        if (actionBar && !actionBar.getAttribute('data-rename-buttons-injected')) {
            console.log('[115RenamePlus] 找到顶部操作栏，开始注入按钮');
            injectButtonsToActionBar(actionBar);
            actionBar.setAttribute('data-rename-buttons-injected', 'true');
        }
        
        // 同时处理悬浮菜单（备选方案）
        injectButtonsToHoverMenus();
    }
    
    /**
     * 查找选中文件的顶部操作栏
     */
    function findSelectedFileActionBar() {
        // 查找包含"已选中"文本的元素，然后向上找操作栏容器
        const allDivs = document.querySelectorAll('div');
        
        for (const div of allDivs) {
            const text = (div.innerText || '');
            // 找"已选中 X 项"这样的文本
            if (/已选中\s*\d+\s*项/.test(text) && text.length < 30) {
                // 向上查找包含多个按钮的容器
                let container = div;
                for (let i = 0; i < 5; i++) {
                    container = container.parentElement;
                    if (!container) break;
                    
                    const buttons = container.querySelectorAll('button');
                    if (buttons.length > 5) {
                        return container;
                    }
                }
            }
        }
        return null;
    }
    
    /**
     * 在顶部操作栏注入按钮
     */
    function injectButtonsToActionBar(actionBar) {
        // 隐藏不需要的按钮
        hideButtonsByText(actionBar, ['标签', '备注', '分享']);
        
        // 找到"重命名"按钮
        const renameBtn = findButtonByText(actionBar, '重命名');
        
        // 按钮样式
        const btnClass = 'flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm xl:text-base rounded transition-colors whitespace-nowrap flex-shrink-0 text-gray-700 hover:bg-blue-500 hover:text-white';
        
        // 创建改名按钮
        const createButton = (text, color, icon) => {
            const btn = document.createElement('button');
            btn.className = btnClass;
            btn.innerHTML = `${icon}<span>${text}</span>`;
            btn.setAttribute('data-rename-btn', 'true');
            return btn;
        };
        
        // 图标
        const iconBus = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
        const iconDb = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6"/></svg>';
        const iconFc2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><polygon points="23 7 16 12 23 17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>';
        
        // JavBus 按钮
        const javbusBtn = createButton('JavBus', '#f97316', iconBus);
        javbusBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            renameFromTopBar(renameJavbus, 'javbus', 'video', true);
        });
        
        // JavDB 按钮
        const javdbBtn = createButton('JavDB', '#3b82f6', iconDb);
        javdbBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            renameFromTopBar(renameJavdb, 'javdb', 'video', true);
        });
        
        // FC2 按钮
        const fc2Btn = createButton('FC2', '#a855f7', iconFc2);
        fc2Btn.addEventListener('click', function(e) {
            e.stopPropagation();
            renameFromTopBar(renameFc2, 'fc2', 'video', true);
        });
        
        // 在"重命名"后面插入
        if (renameBtn) {
            renameBtn.after(fc2Btn);
            renameBtn.after(javdbBtn);
            renameBtn.after(javbusBtn);
        } else {
            actionBar.appendChild(javbusBtn);
            actionBar.appendChild(javdbBtn);
            actionBar.appendChild(fc2Btn);
        }
        
        console.log('[115RenamePlus] 按钮已注入到顶部操作栏');
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

            console.log('[115RenamePlus] 处理选中文件:', fileName);
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
     * 在悬浮菜单中注入按钮（备选方案）
     */
    function injectButtonsToHoverMenus() {
        const fileItems = document.querySelectorAll('.file-list-item[data-index]');
        
        fileItems.forEach((item) => {
            if (item.getAttribute('data-rename-buttons-injected') === 'true') {
                return;
            }
            
            const nameEl = item.querySelector('.file-name-responsive');
            const fileName = nameEl?.getAttribute('title') || nameEl?.innerText;
            if (!fileName) return;
            
            const hoverMenu = item.querySelector('[class*="hidden group-hover:flex"]');
            if (!hoverMenu) return;
            
            const btnContainer = hoverMenu.querySelector('[class*="bg-white rounded-md"]');
            if (!btnContainer) return;
            
            // 按钮样式
            const btnClass = 'flex items-center space-x-1 px-3 py-0.5 text-xs hover:bg-blue-50 text-gray-700 transition-colors cursor-pointer';
            
            // 图标
            const iconBus = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
            const iconDb = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6"/></svg>';
            const iconFc2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><polygon points="23 7 16 12 23 17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>';
            
            // 创建按钮函数
            const createBtn = (text, icon, action) => {
                const btn = document.createElement('button');
                btn.className = btnClass;
                btn.innerHTML = icon + '<span style="font-size:14px;">' + text + '</span>';
                btn.setAttribute('data-action', action);
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    renameFromHoverMenuByFileName(fileName, arguments.callee.callSite.call, arguments.callee.callSite.site, 'video', true);
                });
                return btn;
            };
            
            // JavBus 按钮
            const javbusBtn = document.createElement('button');
            javbusBtn.className = btnClass;
            javbusBtn.innerHTML = iconBus + '<span style="font-size:14px;">JavBus</span>';
            javbusBtn.title = '通过JavBus改名';
            javbusBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                renameFromHoverMenuByFileName(fileName, renameJavbus, 'javbus', 'video', true);
            });
            
            // JavDB 按钮
            const javdbBtn = document.createElement('button');
            javdbBtn.className = btnClass;
            javdbBtn.innerHTML = iconDb + '<span style="font-size:14px;">JavDB</span>';
            javdbBtn.title = '通过JavDB改名';
            javdbBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                renameFromHoverMenuByFileName(fileName, renameJavdb, 'javdb', 'video', true);
            });
            
            // FC2 按钮
            const fc2Btn = document.createElement('button');
            fc2Btn.className = btnClass;
            fc2Btn.innerHTML = iconFc2 + '<span style="font-size:14px;">FC2</span>';
            fc2Btn.title = '通过FC2改名';
            fc2Btn.addEventListener('click', function(e) {
                e.stopPropagation();
                renameFromHoverMenuByFileName(fileName, renameFc2, 'fc2', 'video', true);
            });
            
            // 添加到容器末尾
            btnContainer.appendChild(javbusBtn);
            btnContainer.appendChild(javdbBtn);
            btnContainer.appendChild(fc2Btn);
            
            item.setAttribute('data-rename-buttons-injected', 'true');
        });
        
        // MutationObserver
        if (!window.__115RenamePlusObserverSet) {
            setupMutationObserver();
            window.__115RenamePlusObserverSet = true;
        }
    }
    
    /**
     * 隐藏指定文本的按钮
     */
    function hideButtonsByText(container, texts) {
        const buttons = container.querySelectorAll('button');
        buttons.forEach(btn => {
            const text = (btn.innerText || btn.title || '').trim();
            if (texts.includes(text)) {
                // 隐藏按钮及其父容器
                const parent = btn.parentElement;
                if (parent && parent.classList.contains('relative')) {
                    parent.style.display = 'none';
                } else {
                    btn.style.display = 'none';
                }
            }
        });
    }
    
    /**
     * 查找指定文本的按钮
     */
    function findButtonByText(container, text) {
        const buttons = container.querySelectorAll('button');
        for (const btn of buttons) {
            if ((btn.innerText || btn.title || '').trim() === text) {
                return btn;
            }
        }
        return null;
    }
    
    /**
     * 在元素后面插入
     */
    function insertAfter(targetElement, newElement) {
        if (!targetElement || !newElement) return false;
        const parent = targetElement.parentNode;
        if (!parent) return false;
        if (targetElement.nextSibling) {
            parent.insertBefore(newElement, targetElement.nextSibling);
        } else {
            parent.appendChild(newElement);
        }
        return true;
    }
    
    /**
     * 设置 MutationObserver 监听新增文件项
     */
    function setupMutationObserver() {
        const fileListContainer = document.querySelector('[class*="overflow-y-auto"]');
        if (!fileListContainer) {
            console.log('[115RenamePlus] 未找到文件列表容器，稍后重试');
            return;
        }
        
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        // 检查是否是文件项或包含文件项（只处理有 data-index 的）
                        if (node.classList?.contains('file-list-item') && node.hasAttribute('data-index')) {
                            injectButtonsToFileItem(node);
                        }
                        const nestedItems = node.querySelectorAll?.('.file-list-item[data-index]');
                        if (nestedItems) {
                            nestedItems.forEach(injectButtonsToFileItem);
                        }
                    }
                });
            });
        });
        
        observer.observe(fileListContainer, { childList: true, subtree: true });
        console.log('[115RenamePlus] MutationObserver 已设置');
    }
    
    /**
     * 给单个文件项注入按钮
     */
    function injectButtonsToFileItem(item) {
        // 只处理有 data-index 的元素
        if (!item.hasAttribute('data-index')) {
            return;
        }
        
        if (item.getAttribute('data-rename-buttons-injected') === 'true') {
            return;
        }
        
        // 获取文件名
        const nameEl = item.querySelector('.file-name-responsive');
        const fileName = nameEl?.getAttribute('title') || nameEl?.innerText;
        if (!fileName) return;
        
        const hoverMenu = item.querySelector('[class*="hidden group-hover:flex"]');
        if (!hoverMenu) return;
        
        const btnContainer = hoverMenu.querySelector('[class*="bg-white rounded-md"]');
        if (!btnContainer) return;
        
        // 隐藏不需要的按钮
        hideButtonsByText(btnContainer, ['标签', '备注', '分享']);
        
        // 找到"重命名"按钮
        const renameBtn = findButtonByText(btnContainer, '重命名');
        
        const btnClass = 'flex items-center space-x-1 px-3 py-0.5 text-xs hover:bg-blue-50 text-gray-700 transition-colors cursor-pointer';
        
        // JavBus 按钮 - 橙色图标
        const javbusBtn = document.createElement('button');
        javbusBtn.className = btnClass;
        javbusBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span style="font-size:14px;">JavBus</span>';
        javbusBtn.title = '通过JavBus改名';
        javbusBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            renameFromHoverMenuByFileName(fileName, renameJavbus, 'javbus', 'video', true);
        });
        
        // JavDB 按钮 - 蓝色图标
        const javdbBtn = document.createElement('button');
        javdbBtn.className = btnClass;
        javdbBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h3"/></svg><span style="font-size:14px;">JavDB</span>';
        javdbBtn.title = '通过JavDB改名';
        javdbBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            renameFromHoverMenuByFileName(fileName, renameJavdb, 'javdb', 'video', true);
        });
        
        // FC2 按钮 - 紫色图标
        const fc2Btn = document.createElement('button');
        fc2Btn.className = btnClass;
        fc2Btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg><span style="font-size:14px;">FC2</span>';
        fc2Btn.title = '通过FC2改名';
        fc2Btn.addEventListener('click', function(e) {
            e.stopPropagation();
            renameFromHoverMenuByFileName(fileName, renameFc2, 'fc2', 'video', true);
        });
        
        // 在"重命名"按钮后面插入
        insertAfter(renameBtn, javbusBtn);
        insertAfter(javbusBtn, javdbBtn);
        insertAfter(javdbBtn, fc2Btn);
        
        item.setAttribute('data-rename-buttons-injected', 'true');
    }
    
    /**
     * 从hover菜单触发改名（通过文件名匹配，使用 API 获取正确的 fid）
     */
    async function renameFromHoverMenuByFileName(fileName, call, site, rntype, ifAddDate) {
        console.log('[115RenamePlus] ========== 开始改名流程 ==========');
        console.log('[115RenamePlus] 目标文件名:', fileName);
        
        // 获取当前目录 cid
        const currentCid = getCurrentCid();
        console.log('[115RenamePlus] 当前目录 cid:', currentCid);
        
        // 通过 API 获取文件列表
        const fileList = await fetchFileListByAPI(currentCid);
        if (!fileList || fileList.length === 0) {
            console.log('[115RenamePlus] ❌ API 返回文件列表为空');
            GM_notification(getDetails(fileName, '无法获取文件数据'));
            return;
        }
        
        console.log('[115RenamePlus] API 返回文件数量:', fileList.length);
        
        // 打印所有文件的 cid 和 名称
        console.log('[115RenamePlus] 文件列表:');
        fileList.forEach((f, i) => {
            console.log('  [' + i + '] n=' + f.n + ', cid=' + f.cid + ', fid=' + f.fid + ', ico=' + f.ico);
        });
        
        // 用文件名匹配找到对应的文件
        const fileData = fileList.find(f => f.n === fileName);
        if (!fileData) {
            console.log('[115RenamePlus] ❌ 未找到匹配的文件:', fileName);
            GM_notification(getDetails(fileName, '未找到文件'));
            return;
        }
        
        console.log('[115RenamePlus] ✅ 找到目标文件!');
        console.log('[115RenamePlus] 文件完整数据:', JSON.stringify(fileData, null, 2));
        
        // 文件ID - 注意：文件用 fid 或 cid，文件夹用 cid
        const fid = fileData.fid || fileData.cid;
        console.log('[115RenamePlus] 使用 fid:', fid);
        
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
        
        console.log('[115RenamePlus] 处理文件:', file_name, 'fid:', fid, 'suffix:', suffix, 'isFolder:', isFolder);
        
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
     * 旧版UI按钮注入（保留兼容）
     */
    function buttonIntervalOldUI() {
        let open_dir = $("div#js_float_content li[val='open_dir']");
        if (open_dir.length !== 0 && $("li#rename_list").length === 0) {
            let rename_list = `
                    <li id="rename_list">
                        <a id="rename_video_javbus" class="mark" href="javascript:;"><i class="icon-operate ifo-video-play"></i><span>视频改名javbus</span></a>
                        <a id="rename_video_javdb" class="mark" href="javascript:;"><i class="icon-operate ifo-video-play"></i><span>视频改名javdb</span></a>
                        <a id="rename_video_FC2" class="mark" href="javascript:;"><i class="icon-operate ifo-video-play"></i><span>视频改名FC2</span></a>
                    </li>
                `;
            open_dir.before(rename_list);
			$("a#rename_video_javbus").click(
			    function () {
			        rename(renameJavbus, "javbus", "video", true);
			    });	
			$("a#rename_video_javdb").click(
			    function () {
			        rename(renameJavdb, "javdb", "video", true);
			    });	
			$("a#rename_video_FC2").click(
			    function () {
			        rename(renameFc2, "fc2", "video", true);
			    });	

            // 结束定时任务
            clearInterval(interval);
        }
    }

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
                    if (false) {
                        VideoCode = getVideoCode(file_name);
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
     * 通过avmoo搜索+javbus详情页进行查询
	 * @param fid               文件id
	 * @param rntype      		改名类型 video picture
	 * @param fh                番号
	 * @param suffix            后缀
	 * @param ifChineseCaptions   是否有中文字幕
	 * @param part              视频分段，图片冗余文件名 
	 * @param ifAddDate              是否添加时间 
	 * @param searchUrl               请求地址
     */
    function renameJavbusDetail(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate) {
        requestJavbusDetail(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, javbusSearch);
    }
    function requestJavbusDetail(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, searchUrl) {
        let title;
        let date;
        let moviePage = javbusBase + fh;
        let actors = [];
		// 获取javbus详情页内信息
		let getJavbusDetail = new Promise((resolve, reject) => {
		    console.log("处理详情页：" + moviePage);
		    if(moviePage){
		GM_xmlhttpRequest({
		            method: "GET",
		            url: moviePage,
		            withCredentials: true,
		            onload: xhr => {
		                let response = $(xhr.responseText);
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
		                resolve();
		            }
		        });
		    }else{
		        resolve();
		    }
		});
        function setName(){
            return new Promise((resolve, reject) => {
                if(moviePage){
                    let actor = actors.toString();
                    // 构建新名称
                    let newName = buildNewName(fh, rntype, suffix, if4k, ifChineseCaptions, part, title, date, actor, ifAddDate);
                    if (newName) {
                        // 修改名称
                        send_115(fid, newName, fh);
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
        getJavbusDetail.then(setName,setName)
            .then(function(result){
                console.log("改名结束，" + result);
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
            console.log("处理搜索页：" + url_s + " (fh=" + fh + ", fh_query=" + fh_query + ")");
            GM_xmlhttpRequest({
                method: "GET",
                url: url_s,
                    withCredentials: true,
                onload: xhr => {
                    let response = $(xhr.responseText);
                    
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
                        console.log("找到完全匹配的番号: " + fh_o);
                    } else {
                        console.log("没有找到完全匹配的番号: " + fh + "，搜索结果中无匹配项");
                    }
                    
                    console.log("获取到 " +  fh_o );
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
						console.log("处理详情页：" + moviePage);
						GM_xmlhttpRequest({
							method: "GET",
							url: moviePage,
                    withCredentials: true,
							onload: xhr => {
								let response = $(xhr.responseText);
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
            .then(setName,setName)
            .then(function(result){
                console.log("改名结束，" + result);
            });
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
        let getJavdbSearch = new Promise((resolve, reject) => {
            console.log("处理搜索页：" + url_s);
            GM_xmlhttpRequest({
                method: "GET",
                url: url_s,
                    withCredentials: true,
                onload: xhr => {
                    let response = $(xhr.responseText);
                    
                    // 获取所有搜索结果，找到与原始番号完全匹配的结果
                    let movieItems = response.find(".movie-list .item");
                    let matchedItem = null;
                    
                    // 统一番号归一化：用于在搜索结果里做稳健匹配（特别是 FC2-PPV vs FC2）
                    function normCode(s) {
                        if (!s) return "";
                        let x = String(s).toUpperCase();
                        // 去掉分隔符
                        x = x.replace(/[\s\-_]/g, "");
                        // FC2：JavDB 有时显示成 FC2-数字（不含 PPV），所以统一移除 PPV
                        if (x.startsWith("FC2")) {
                            x = x.replace(/PPV/g, "");
                        }
                        return x;
                    }

                    movieItems.each(function() {
                        let item = $(this);
                        let itemFh = item.find(".video-title strong").text().trim();
                        if (!itemFh) return;

                        let a = itemFh.toUpperCase();
                        let b = fh_query.toUpperCase();

                        if (a === b) {
                            matchedItem = item;
                            return false;
                        }

                        // 归一化比较：去分隔符 + 兼容 FC2-PPV vs FC2
                        if (normCode(a) === normCode(b)) {
                            matchedItem = item;
                            return false;
                        }

                        // FC2 兜底：只比对数字部分（JavDB 可能展示成 FC2-xxxxxxx / FC2PPVxxxxxxx / FC2-PPV-xxxxxxx）
                        if (b.indexOf("FC2") === 0) {
                            let aNum = a.match(/FC2[^0-9]*(\d{5,8})/i);
                            let bNum = b.match(/FC2[^0-9]*(\d{5,8})/i);
                            if (aNum && bNum && aNum[1] === bNum[1]) {
                                matchedItem = item;
                                return false;
                            }
                        }
                    });
                    
                    if (matchedItem) {
                        fh_o = matchedItem.find(".video-title strong").text().trim();
                        let href = matchedItem.find("a").attr("href");
                        moviePage = href ? javdbBase + href : null;
                        console.log("找到完全匹配的番号: " + fh_o);
                    } else {
                        console.log("没有找到完全匹配的番号: " + fh + "，搜索结果中无匹配项");
                    }
                    
                    console.log("获取到 " + fh_o);
                    resolve(moviePage);
                }
            });
        });
        function getJavdbDetail(){
            return new Promise((resolve, reject) => {
                if ( rntype=="picture" ){
                    resolve();
                } else if ( rntype=="video" ){
                    if(moviePage){
                        console.log("处理详情页：" + moviePage);
                        GM_xmlhttpRequest({
                            method: "GET",
                            url: moviePage,
                    withCredentials: true,
                            onload: xhr => {
                                let response = $(xhr.responseText);
                                // 标题
                                title = response
                                    .find(".current-title")
                                    .text()
                                    .trim();
                                // 移除番号前缀
                                if (title && fh_o && title.startsWith(fh_o)) {
                                    title = title.slice(fh_o.length).trim();
                                }
                                
                                // 获取所有标签
                                let labels = {};
                                response.find(".panel-block").each(function() {
                                    let strong = $(this).find("strong");
                                    if (strong.length) {
                                        let key = strong.text().replace(":", "").trim();
                                        labels[key] = $(this);
                                    }
                                });
                                
                                // 日期
                                if (labels["日期"]) {
                                    let dateText = labels["日期"].find(".value").text().trim();
                                    date = dateText.match(/\d{4}-\d{2}-\d{2}/);
                                }
                                // 演员们（JavDB 字段名可能是：演員/演员/出演/出演者/Cast）
                                let actorBlock = labels["演員"] || labels["演员"] || labels["出演"] || labels["出演者"] || labels["Cast"];
                                if (actorBlock) {
                                    actorBlock.find(".value a").each(function(){
                                        let $a = $(this);
                                        let href = $a.attr("href") || "";
                                        let a = $a.text().trim();
                                        if (!a) return;
                                        // 只接受演员链接，避免把分类/标签混进来
                                        if (href.indexOf("/actors/") === -1) return;
                                        // 只抓女演员：检查后面是否有 symbol female 标记
                                        let nextStrong = $a.next("strong.symbol");
                                        if (nextStrong.length && nextStrong.hasClass("female")) {
                                            if (actors.indexOf(a) === -1) actors.push(a);
                                        }
                                    });
                                }


                                // 兜底：有些页面结构不同，尝试仅从 /actors/ 链接抓取（避免把"有碼，無碼，歐美"等分类抓进来）
                                // 兜底也过滤性别：只抓女演员
                                if (!actors.length) {
                                    response.find("a[href*=\"/actors/\"]").each(function(){
                                        let $a = $(this);
                                        let a = $a.text().trim();
                                        if (!a) return;
                                        // 过滤明显不是演员名的文本
                                        if (a.indexOf(",") !== -1) return;
                                        if (a === "有碼" || a === "無碼" || a === "歐美" || a === "動畫" || a === "寫真" || a === "字幕" || a === "中字") return;
                                        // 检查后面是否有 symbol female 标记
                                        let nextStrong = $a.next("strong.symbol");
                                        if (!(nextStrong.length && nextStrong.hasClass("female"))) {
                                            return;
                                        }
                                        if (actors.indexOf(a) === -1) actors.push(a);
                                    });
                                }


                                // JavDB 有些情况下标题末尾会带演员名（或原文件名残留），这里用演员列表把 title 末尾的演员名剔除，保证最终格式统一
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
                    }else{
                        resolve();
                    }
                }
            });
        }
        function setName(){
            return new Promise((resolve, reject) => {
                if(moviePage){
                    let actor = actors.toString();
                    // 构建新名称
                    let newName = buildNewName(fh_o, rntype, suffix, if4k, ifChineseCaptions, part, title, date, actor, ifAddDate);                    if (newName) {
                        // 修改名称
                        send_115(fid, newName, fh_o);
                    }
                    resolve(newName);
                }else {
                    resolve("没有查到结果");
                }
            });
        }
        getJavdbSearch.then(getJavdbDetail)
            .then(setName,setName)
            .then(function(result){
                console.log("改名结束，" + result);
            });
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
        // 从 fh 中提取纯数字编号（如 FC2-PPV-745325-C -> 745325）
        let fc2Num = fh.match(/FC2[-_ ]?PPV[-_ ]?(\d{5,8})/i);
        if (!fc2Num) {
            // 兜底：如果 fh 本身就是数字
            fc2Num = [null, fh.replace(/[^0-9]/g, "")];
        }
        let fc2Id = fc2Num[1];
        
        GM_xmlhttpRequest({
            method: "GET",
            url: searchUrl + fc2Id + "/",
                    withCredentials: true,
            onload: xhr => {
				console.log("处理影片页 " + searchUrl + fc2Id + "/");
                // 匹配标题
                let response = $(xhr.responseText);
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
				console.log("获取到标题 " + title );
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
                // 构建标准番号格式
                let standardFh = "FC2-PPV-" + fc2Id;
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
                        // 刷新文件列表
                        setTimeout(function() {
                            // 优先尝试115内部刷新函数
                            if (typeof unsafeWindow.refreshNetdiskFileList === 'function') {
                                unsafeWindow.refreshNetdiskFileList();
                            } else {
                                location.reload();
                            }
                        }, 1000);
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
     * 通知参数
     * @param text 内容
     * @param title 标题
     * @returns {{text: *, title: *, timeout: number}}
     */

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
            console.log("传入 title: " + title + " type:" + type);

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
            console.log("识别 FC2-C 字幕标记，暂移除");
        }
        // 通用格式：XXXXX-XX-C（非 FC2 的番号）
        else if (/^[A-Z]{2,10}[-_ ]?\d{2,6}[-_ ]C$/i.test(title)) {
            fc2CFlag = true;  // 修复：设置字幕标记
            title = title.replace(/[-_ ]C$/i, "");
            console.log("识别通用-C 字幕标记，暂移除");
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
			console.log("分析mgstage编号");
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
					console.log("找到番号(FC简写):" + t);
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
					console.log("找到番号:" + t);
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
            console.log("没找到番号:" + title);
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
                        console.log("从番号末尾分离数字分段：" + part);
                    } else {
                        // 对于 LAFBD-41 这种，保留完整番号
                        console.log("保留完整番号，数字 " + suffix + " 是番号一部分");
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

            console.log("找到番号:" + tStr);
            return{
                fh: tStr,
                part: part,
				if4k: if4k,
                // FC2-C 字幕标记：如果之前移除了 -C，这里告诉调用者这是中文字幕版本
                fc2C: fc2CFlag || undefined,
            };
        }
    }

    /**
     * 从可能包含额外信息的番号中提取标准格式的番号
     * 例如：从 YRNKMTNDVAJ-655 中提取 DVAJ-655
     * @param fullCode 完整的番号字符串
     * @return 标准格式的番号
     */
    function extractStandardCode(fullCode) {
        if (!fullCode) return null;
        
        // 尝试匹配标准格式：字母+数字，如 ABC-123 或 ABC123
        // 匹配模式：2-6个字母，可选连字符，3-5个数字
        let standardMatch = fullCode.match(/[A-Z]{2,6}-?\d{3,5}/i);
        if (standardMatch) {
            return standardMatch[0].replace(/-/g, '-'); // 确保格式一致
        }
        
        // 如果没有找到标准格式，返回null
        return null;
    }

})();
