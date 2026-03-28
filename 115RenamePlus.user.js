// ==UserScript==
// @name                115RenamePlus
// @namespace           https://github.com/Oissp/115RenamePlus/
// @version             0.11.0
// @updateURL           https://raw.githubusercontent.com/Oissp/115RenamePlus/new-ui-adapt/115RenamePlus.user.js
// @downloadURL         https://raw.githubusercontent.com/Oissp/115RenamePlus/new-ui-adapt/115RenamePlus.user.js
// @description         115RenamePlus(根据现有的文件名<番号>查询并修改文件名) - 新版UI适配
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
// @connect             webapi.115.com
// ==/UserScript==

    /*
     * @param suffix            后缀，就是扩展名
     */
(function () {
    // 新版UI按钮样式
    let rename_btn_class = "flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm xl:text-base rounded transition-colors whitespace-nowrap flex-shrink-0 text-white hover:bg-blue-500";
    
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
    
    /**
     * 添加按钮的定时任务
     */
    let interval = setInterval(buttonInterval, 1000);
    
    // 记录是否已添加按钮
    let buttonsAdded = false;

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
        // 新版UI特征：有 file-list-item class，没有 iframe[rel='wangpan']
        return document.querySelector('.file-list-item') !== null && 
               document.querySelector('iframe[rel="wangpan"]') === null;
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
     * 新版UI按钮注入
     */
    function buttonIntervalNewUI() {
        // 查找操作栏（选中文件后出现的顶部栏）
        // 查找包含"重命名"按钮的容器
        let renameBtn = null;
        const buttons = document.querySelectorAll('button');
        buttons.forEach(b => {
            if (b.innerText?.trim() === '重命名') {
                renameBtn = b;
            }
        });
        
        if (renameBtn && !buttonsAdded) {
            // 找到操作栏容器
            let actionBar = renameBtn.parentElement;
            if (actionBar) {
                // 在重命名按钮后面插入改名按钮
                actionBar.insertAdjacentHTML('beforeend', rename_buttons);
                
                // 绑定事件
                document.getElementById('rename_video_javbus')?.addEventListener('click', function() {
                    rename(renameJavbus, "javbus", "video", true);
                });
                document.getElementById('rename_video_javdb')?.addEventListener('click', function() {
                    rename(renameJavdb, "javdb", "video", true);
                });
                document.getElementById('rename_video_FC2')?.addEventListener('click', function() {
                    rename(renameFc2, "fc2", "video", true);
                });
                
                buttonsAdded = true;
                console.log('新版UI按钮已添加');
            }
        }
        
        // 如果操作栏消失了（取消选中），重置按钮状态以便下次选中时重新添加
        if (!renameBtn && buttonsAdded) {
            buttonsAdded = false;
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
        // 从 localStorage 获取文件列表
        const fileList = getFileListFromStorage();
        if (!fileList) {
            console.log('无法获取文件列表数据');
            GM_notification(getDetails('', '无法获取文件数据'));
            return;
        }
        
        // 获取所有选中的文件项
        const selectedItems = document.querySelectorAll('.file-list-item');
        
        selectedItems.forEach(function(item) {
            const checkbox = item.querySelector('input[type=checkbox]');
            if (!checkbox || !checkbox.checked) return;
            
            // 获取 data-index
            const dataIndex = item.getAttribute('data-index');
            if (dataIndex === null) return;
            
            // 从 localStorage 文件列表中获取对应文件
            const fileData = fileList[parseInt(dataIndex)];
            if (!fileData) {
                console.log('未找到文件数据, index:', dataIndex);
                return;
            }
            
            // 文件ID (cid)
            const fid = fileData.cid;
            // 文件名 (n)
            let file_name = fileData.n;
            // 文件类型：文件夹的 m=0, 文件有大小
            const isFolder = fileData.m === 0 || fileData.e === '';
            
            // 后缀名
            let suffix;
            if (!isFolder) {
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
                    // 兜底：即使不是 fc2 按钮，也尝试识别 FC2 番号
                    if (/FC2(?:[-_ ]?PPV)?/i.test(file_name)) {
                        VideoCode = getVideoCode(file_name,"fc2");
                    } else {
                        VideoCode = getVideoCode(file_name);
                    }
                }
                
                if (VideoCode && VideoCode.fh) {
                    if (rntype == "video"){
                        // 校验是否是中文字幕
                        let ifChineseCaptions = VideoCode.fc2C ? true : checkifChineseCaptions(VideoCode.fh, file_name);
                        // 执行查询
                        call(fid, rntype, VideoCode.fh, suffix, VideoCode.if4k, ifChineseCaptions, VideoCode.part, ifAddDate);
                    } else if (rntype == "picture"){
                        let picCaptions = getPicCaptions(VideoCode.fh, file_name);
                        let ifChineseCaptions;
                        call(fid, rntype, VideoCode.fh, suffix, VideoCode.if4k, ifChineseCaptions, picCaptions, ifAddDate);
                    }
                }
            }
        });
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
                        setTimeout(function() { location.reload(); }, 1000);
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
     * 清理引流站域名前缀（如 489155.com@ / hhd800.com@ / 4k2.me@）
     * @param title 原始文件名
     * @returns 清理后的文件名
     */
    function cleanDomainPrefix(title) {
        if (!title) return title;
        
        // 1. 通用正则：清理 域名@ 格式（覆盖 95% 引流站）
        // 匹配：开头 + 字母数字域名 + 常见 TLD + @
        title = title.replace(/^\s*[0-9a-z]+\.(com|me|net|org|cc|io|biz|info|tv)@/i, "");
        
        // 2. 特殊硬编码：无 @ 的前缀
        title = title
            .replace(/^BIG2048\.COM\s*/i, "")
            .replace(/^SIS001\s*/i, "");
        
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
			// PPV 是可选的，匹配模式：FC2 后可选 PPV，然后是数字，可选分段，可选-C
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
