// ==UserScript==
// @name                115RenamePlus
// @namespace           https://github.com/Oissp/115RenamePlus
// @version             0.8.20
// @updateURL           https://raw.githubusercontent.com/Oissp/115RenamePlus/master/115RenamePlus.user.js
// @downloadURL         https://raw.githubusercontent.com/Oissp/115RenamePlus/master/115RenamePlus.user.js
// @description         115RenamePlus(根据现有的文件名<番号>查询并修改文件名)
// @author              db117, FAN0926, LSD08KM
// @include             https://115.com/*
// @domain              javbus.com
// @domain              fanbus.blog
// @domain              busdmm.club
// @domain              seedmm.blog
// @domain              avmoo.com
// @domain              avmoo.click
// @domain              avsox.website
// @domain              adult.contents.fc2.com
// @domain              mgstage.com
// @domain              javdb.com
// @grant               GM_notification
// @grant               GM_xmlhttpRequest
// ==/UserScript==

    /*
     * @param suffix            后缀，就是扩展名
     */
(function () {
    // 按钮
    let rename_list = `
            <li id="rename_list">
                <a id="rename_video_javbus" class="mark" href="javascript:;"><i class="icon-operate ifo-video-play"></i><span>视频改名javbus</span></a>
                <a id="rename_video_javdb" class="mark" href="javascript:;"><i class="icon-operate ifo-video-play"></i><span>视频改名javdb</span></a>
                <a id="rename_video_FC2" class="mark" href="javascript:;"><i class="icon-operate ifo-video-play"></i><span>视频改名FC2</span></a>
            </li>
        `;
    /**
     * 添加按钮的定时任务
     */
    let interval = setInterval(buttonInterval, 1000);

    // javbus
    let javbusBase = "https://www.javbus.com/";
    // 有码
    let javbusSearch = javbusBase + "search/";
    // 无码
    let javbusUncensoredSearch = javbusBase + "uncensored/search/";
	
    // avmoo
    // 有码
    let avmooSearch = "https://avmoo.click/cn/search/";
    // 无码
    let avmooUncensoredSearch = "https://avsox.website/cn/search/";

    //FC2
    let Fc2Search = "https://adult.contents.fc2.com/article/";

    //mgstage
    let mgstageSearch = "https://www.mgstage.com/product/product_detail/";

    // javdb
    let javdbBase = "https://javdb.com";
    let javdbSearch = javdbBase + "/search?q=";

    'use strict';

    /**
     * 添加按钮定时任务(检测到可以添加时添加按钮)
     */
    function buttonInterval() {
        let open_dir = $("div#js_float_content li[val='open_dir']");
        if (open_dir.length !== 0 && $("li#rename_list").length === 0) {
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

            console.log("添加按钮");
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
                        // 兜底：即使不是 fc2 按钮，也尝试识别 FC2 番号，避免被通用规则误判成 PPV-xxxxx
                        if (/^\s*FC2(?:[-_ ]?PPV)?/i.test(file_name)) {
                            VideoCode = getVideoCode(file_name,"fc2");
                        } else {
                            VideoCode = getVideoCode(file_name);
                        }
                    }
                    if (false) {
                        VideoCode = getVideoCode(file_name);
                    }
                    console.log("正则匹配番号:" + VideoCode.fh);
                    if (VideoCode.fh) {
						if ( rntype=="video" ){
							// 校验是否是中文字幕
							let ifChineseCaptions = checkifChineseCaptions(VideoCode.fh, file_name);
							// 执行查询
							console.log("开始查询");
							call(fid, rntype, VideoCode.fh, suffix, VideoCode.if4k, ifChineseCaptions, VideoCode.part, ifAddDate);
						} else if ( rntype=="picture" ){
							// 是图片时，向part传图片名冗余，不要中字判断，只在页面获取编号
							// 图片名冗余
							let picCaptions = getPicCaptions(VideoCode.fh, file_name);
							let ifChineseCaptions;
							// 执行查询
							console.log("开始查询");
							call(fid, rntype, VideoCode.fh, suffix, VideoCode.if4k, ifChineseCaptions, picCaptions, ifAddDate);
						}
                        
                    }
                }
            });
		// if(!Main.ReInstance({type:'', star:'', is_q: '', is_share:''})){window.location.reload();}
		// if(list){window.location.reload();}
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
    function renameAvmooJavbus(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate) {
        requestAvmooJavbus(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, avmooSearch);
    }
    function requestAvmooJavbus(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, searchUrl) {
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
        let getAvmooSearch = new Promise((resolve, reject) => {
            console.log("处理搜索页 " + url_s);
            GM_xmlhttpRequest({
                method: "GET",
                url: url_s,
                onload: xhr => {
                    let response = $(xhr.responseText);
                    if (!(response.find("div.alert").length)) {
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
                                let normalizedFh = fh_query.toUpperCase().replace(/-/g, '');
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
                        
                        console.log("获取到 " + fh_o );
                        resolve(moviePage);
                    }
                }
            });
        });
        function getJavbusDetail(){
            return new Promise((resolve, reject) => {
				if ( rntype=="picture" ){
					resolve();
				} else if ( rntype=="video" ){
					if(moviePage){
						moviePage = javbusBase + fh_o;
						console.log("处理详情页：" + moviePage);
						GM_xmlhttpRequest({
							method: "GET",
							url: moviePage,
							onload: xhr => {
								let response = $(xhr.responseText);
								// 标题
								title = response
								    .find("h3")
								    .html();
								title = title.slice(fh_o.length+1);
								// 时间
								date = response
								        .find("p:nth-of-type(2)")
								        .html();
								date = date.match(/\d{4}\-\d{2}\-\d{2}/);	
								// 演员们
								let actorTags = response.find("div.star-name").each(function(){
									actors.push($(this).find("a").attr("title"));
								});
								console.log('演员 '+actors);
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
                    let actor = actors.toString();
                    console.log(actor);
                    // 构建新名称
                    let newName = buildNewName(fh_o, rntype, suffix, if4k, ifChineseCaptions, part, title, date, actor, ifAddDate);                    
                    if (newName) {
                        // 修改名称
                        send_115(fid, newName, fh_o);
						console.log("新名: "+newName);
                    }
                    resolve(newName);
                }else if (searchUrl !== javbusUncensoredSearch) {
                    console.log("查询无码 " + searchUrl);
                    // 进行无码重查询
                    requestJavbus(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, javbusUncensoredSearch);
                }else {
                    resolve("没有查到结果");
                }
            });
        }		
        getAvmooSearch.then(getJavbusDetail)
            .then(setName,setName)
            .then(function(result){
                console.log("改名结束，" + result);
            });
    }
	
    /**
     * 通过javbus详情页进行查询
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
		                console.log('演员：'+actors);
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
						console.log("新名: "+newName);
                    }
                    resolve(newName);
                }else if (searchUrl !== javbusUncensoredSearch) {
                    console.log("查询无码 " + searchUrl);
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
					console.log("跳过详情页");
					resolve();
				} else if ( rntype=="video" ){
					if(moviePage){
						console.log("处理详情页：" + moviePage);
						GM_xmlhttpRequest({
							method: "GET",
							url: moviePage,
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
								console.log('演员 '+actors);
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
                    let actor = actors.toString();
                    console.log(actor);
                    // 构建新名称
                    let newName = buildNewName(fh_o, rntype, suffix, if4k, ifChineseCaptions, part, title, date, actor, ifAddDate);                    
                    if (newName) {
                        // 修改名称
                        send_115(fid, newName, fh_o);
						console.log("新名: "+newName);
                    }
                    resolve(newName);
                }else if (searchUrl !== javbusUncensoredSearch) {
                    console.log("查询无码 " + searchUrl);
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
                onload: xhr => {
                    let response = $(xhr.responseText);
                    
                    // 获取所有搜索结果，找到与原始番号完全匹配的结果
                    let movieItems = response.find(".movie-list .item");
                    let matchedItem = null;
                    
                    movieItems.each(function() {
                        let item = $(this);
                        let itemFh = item.find(".video-title strong").text().trim();
                        if (itemFh) {
                            // 完全匹配（忽略大小写）
                            // JavDB 的 FC2 可能显示成：FC2-3281892（没有 PPV）
                            let a = itemFh.toUpperCase();
                            let b = fh_query.toUpperCase();
                            let aNorm = a.replace(/-/g, "").replace(/^FC2PPV/, "FC2");
                            let bNorm = b.replace(/-/g, "").replace(/^FC2PPV/, "FC2");
                            // 把 FC2-PPV-3281892 归一成 FC23281892（去掉 PPV）
                            bNorm = bNorm.replace(/^FC2PPV/, "FC2").replace(/^FC2PPV/, "FC2");
                            bNorm = bNorm.replace(/^FC2PPV/, "FC2");
                            bNorm = bNorm.replace(/^FC2PPV/, "FC2");
                            bNorm = bNorm.replace(/^FC2PPV/, "FC2");
                            // 更通用：直接把 FC2PPV/FC2-PPV 的 PPV 删除
                            bNorm = bNorm.replace(/^FC2PPV/, "FC2");
                            bNorm = bNorm.replace(/^FC2PPV/, "FC2");
                            // 关键：把 FC2PPV 变 FC2（等价于 JavDB 的 FC2-数字）
                            bNorm = bNorm.replace(/^FC2PPV/, "FC2");
                            if (a === b || aNorm === bNorm || aNorm === bNorm.replace(/^FC2PPV/, "FC2")) {
                                matchedItem = item;
                                return false; // 找到匹配的，退出循环
                            }
                            // 也检查带连字符和不带连字符的情况（并兼容 FC2-PPV vs FC2）
                            let normalizedItemFh = itemFh.toUpperCase().replace(/-/g, '').replace(/^FC2PPV/, 'FC2');
                            let normalizedFh = fh_query.toUpperCase().replace(/-/g, '').replace(/^FC2PPV/, 'FC2');
                            // 把 FC2PPV/FC2-PPV 的 PPV 去掉（JavDB 有时显示成 FC2-3281892）
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2').replace(/^FC2PPV/, 'FC2');
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2');
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2');
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2');
                            // 更直接：把 FC2PPV 统一成 FC2，且移除 PPV
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2').replace(/^FC2PPV/, 'FC2');
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2');
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2');
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2');
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2');
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2');
                            // 最终把 FC2PPV 变 FC2（去掉 PPV 语义）
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2');
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2');
                            // 同时把 FC2PPV/FC2PPV 归一后，去掉可能残留的 PPV
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2').replace(/^FC2PPV/, 'FC2');
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2');
                            // 简单粗暴：把前缀里的 PPV 去掉
                            normalizedFh = normalizedFh.replace(/^FC2PPV/, 'FC2');
                            if (normalizedItemFh === normalizedFh) {
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
                    console.log("跳过详情页");
                    resolve();
                } else if ( rntype=="video" ){
                    if(moviePage){
                        console.log("处理详情页：" + moviePage);
                        GM_xmlhttpRequest({
                            method: "GET",
                            url: moviePage,
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
                                
                                // 演员们
                                if (labels["演員"]) {
                                    labels["演員"].find(".value a").each(function(){
                                        actors.push($(this).text().trim());
                                    });
                                }
                                console.log('演员 '+actors);
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
                    console.log(actor);
                    // 构建新名称
                    let newName = buildNewName(fh_o, rntype, suffix, if4k, ifChineseCaptions, part, title, date, actor, ifAddDate);                    
                    if (newName) {
                        // 修改名称
                        send_115(fid, newName, fh_o);
                        console.log("新名: "+newName);
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
    function renameAvmoo(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate) {
        requestAvmoo(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, avmooSearch);
    }
    function requestAvmoo(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, searchUrl) {
        let title;
        let fh_o;   //网页上的番号
        let date;
        let moviePage;
        let actors = [];
        let url_s = searchUrl + fh;
        let getAvmooSearch = new Promise((resolve, reject) => {
            console.log("处理搜索页 " + url_s);
            GM_xmlhttpRequest({
                method: "GET",
                url: url_s,
                onload: xhr => {
                    let response = $(xhr.responseText);
                    if (!(response.find("div.alert").length)) {
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
                        
                        console.log("获取到 " + fh_o );
                        resolve(moviePage);
                    }
                }
            });
        });
        function getAvmooDetail(){
            return new Promise((resolve, reject) => {
				if ( rntype=="picture" ){
					console.log("跳过详情页");
					resolve();
				} else if ( rntype=="video" ){
					if(moviePage){
						console.log("处理影片页 " + moviePage);
						GM_xmlhttpRequest({
							method: "GET",
							url: moviePage,
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
								let actorTags = response.find("a.avatar-box").each(function(){
									actors.push($(this).find("span").html());
								});
								console.log('演员 '+actors);
								resolve();
							},
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
                    console.log(actor);
                    // 构建新名称
                    let newName = buildNewName(fh_o, rntype, suffix, if4k, ifChineseCaptions, part, title, date, actor, ifAddDate);
                    if (newName) {
                        // 修改名称
                        send_115(fid, newName, fh_o);
						console.log("新名: "+newName);
                    }
                    resolve(newName);
                } else if (searchUrl !== avmooUncensoredSearch) {
                    // 进行无码重查询
                    requestAvmoo(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, avmooUncensoredSearch);
                }else {
                    resolve("没有查到结果");
                }
            });
        }
        getAvmooSearch.then(getAvmooDetail)
            .then(setName,setName)
            .then(function(result){
                console.log("改名结束，" + result);
            });
    }

    /**
     * 通过FC2进行查询
	 * 请求FC2,并请求115进行改名
	 * @param fid               文件id
	 * @param fh                番号
	 * @param suffix            后缀
	 * @param ifChineseCaptions   是否有中文字幕
	 * @param ifAddDate           是否带时间
	 * @param searchUrl         请求地址* 
     */
    function renameFc2(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate) {
        requestFC2(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, Fc2Search);
    }
    function requestFC2(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, searchUrl) {
        GM_xmlhttpRequest({
            method: "GET",
            url: searchUrl + fh +"/",
            onload: xhr => {
				console.log("处理影片页 " + searchUrl + fh +"/");
                // 匹配标题
                let response = $(xhr.responseText);
                let title = response
                    .find("div.items_article_MainitemThumb img")
                    .attr("title");
				console.log("获取到标题 " + title );
                // 卖家
                let user = response
                            .find("div.items_article_headerInfo > ul > li a:last ")
                            .html();
                // 上架时间 上架时间 : 2020/06/17
                let date = response
                            .find("div.items_article_Releasedate p")
                            .html();
                date = date.replace(/\s+/g,"").replace(/:/g, "").replace(/\//g, "-");
				if ( rntype=="picture" ){
					if ( fh && title ) {
						title="";
						user="";
						date="";
					}
				}				
                fh = "FC2-PPV-" + fh;
				
                if (title) {
                    // 构建新名称
                    let newName = buildNewName(fh, rntype, suffix, if4k, ifChineseCaptions, part, title, date, user, ifAddDate);
                    if (newName) {
                        // 修改名称
                        send_115(fid, newName, fh);
                    }
                } else if (searchUrl !== javbusUncensoredSearch) {
                    GM_notification(getDetails(fh, "商品页可能已消失"));
                    // 进行无码重查询
                    // requestJavbus(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, javbusUncensoredSearch);
                }
            }
        })
    }

    /**
     * 通过mgstage进行查询
	 * 请求mgstage,并请求115进行改名
     * @param fid               文件id
     * @param fh                番号
     * @param suffix            后缀
     * @param ifChineseCaptions   是否有中文字幕
	 * @param part            是图片时，向part传图片名冗余
     * @param ifAddDate           是否带时间
     * @param searchUrl         请求地址
     */
    function renameMgstage(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate) {
        requestmgstage(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, mgstageSearch);
    }
    function requestmgstage(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, searchUrl) {
        GM_xmlhttpRequest({
            method: "GET",
            url: searchUrl + fh +"/",
            onload: xhr => {
				console.log("处理影片页 " + searchUrl + fh +"/");
                // 匹配标题
                let response = $(xhr.responseText);
                let title = response
                    .find("div.common_detail_cover > h1")
                    .html()
                    .trim();
				console.log("获取到标题 " + title );
                // 出演
                let actor = response
                            .find("div.detail_data > table:last > tbody > tr:first > td")
                            .html();
                let actors = [];
                // 判断<a>
                if (actor.toString().match(/<.*>/)) {
                    let actorTags = response.find("div.detail_data > table:last > tbody > tr:first > td > a").each(function(){
                        actors.push($(this).html().trim());
                    });
                    actors = actors.toString();
                }else{
                    actors = actor.trim();
                }
                // 品番：  200GANA-2295
				// 因界面多语言问题，无法获取
                // 配信開始日：   2020/06/23
                let date = response
                            .find("div.detail_data > table:last > tbody > tr:eq(4) > td")
                            .html()
                            .trim();
                date = date.replace(/\s+/g,"").replace(/:/g, "").replace(/\//g, "-").trim();
				if ( rntype=="picture" ){
					if ( fh && title ) {
						title="";
						actors="";
						date="";
					}
				}	
				
                if (title) {
                    // 构建新名称
                    let newName = buildNewName(fh, rntype, suffix, if4k, ifChineseCaptions, part, title, date, actors, ifAddDate);
                    if (newName) {
                        // 修改名称
                        send_115(fid, newName, fh);
                    }
                } else if (searchUrl !== javbusUncensoredSearch) {
                    GM_notification(getDetails(fh, "商品页可能已消失"));
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
            console.log("找到后缀" + houzhui);
            return houzhui;
        }
    }
	
    /**
     * 校验是否为中文字幕
     * @param fh    番号
     * @param title 标题
     */
    function checkifChineseCaptions(fh, title) {
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
				let newName = String(fh);
				// 是4k 
				if (if4k) {
					newName = newName + if4k;
				}
				// 有中文字幕
				if (ifChineseCaptions) {
					newName = newName + "-C";
				}
				if (part){
					newName = newName + "_P" +  part;
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
				    newName = newName  +  part;
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
        $.post("https://webapi.115.com/files/edit", {
                fid: id,
                file_name: file_name
            },
            function (data, status) {
                let result = JSON.parse(data);
                if (!result.state) {
                    GM_notification(getDetails(fh, "修改失败"));
                    console.log("请求115接口异常: " + unescape(result.error
                        .replace(/\\(u[0-9a-fA-F]{4})/gm, '%$1')));
                } else {
                    GM_notification(getDetails(fh, "修改成功"));
                    console.log("修改文件名称,fh:" + fh, "name:" + file_name);
                }
            }
        );
    }

    /**
     * 通知参数
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
            console.log("传入title: " + title + " type:" + type);
        // 判断是否多集
        let part;  //FHD1 hhb1
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
            console.log("识别多集:" + part);
        }
		
		let if4k;
		if (!if4k) {
			if4k = title.match(/(-4K){1}/);
			if(if4k){ if4k = "-4k";}
		} if (!if4k) {
		    if4k = title.match(/(VP9版){1}/);
			if(if4k){ if4k = "-4kVP9版";}
		} if (!if4k) {
			if4k = title.match(/(H264版){1}/);
			if(if4k){ if4k = "-4kH264版";}
		}

        title = title.replace("SIS001", "")
            .replace("1080P", "")
            .replace("720P", "")
            .replace("[JAV] [UNCENSORED]","")
            .replace("[THZU.CC]","")
            .replace("[22SHT.ME]","")
            .replace("[7SHT.ME]","")
            .replace("BIG2048.COM","")
            .replace("FUN2048.COM@","")
			.replace("HHD800.COM@","")
            .replace("489155.com@","")
            .replace(".HHB","分段")
            .replace(".FHD","分段")
            .replace(".HD","分段");
        console.log("修正后的title: " + title);
		
		let t = '';
		if (type=="mgstage"){
			console.log("分析mgstage编号");
			t = title.match(/\d{3,4}[A-Z]{3,4}[\-_]?\d{3,4}/)
			if (!t) {  // シロウトTV @SIRO-3585
				t = title.match(/[A-Z]{2,5}[\-_]{1}\d{3,5}/);
			}	
		}else if (type=="fc2"){
			console.log("分析fc2编号");
			// 支持：FC2PPV-3281892-C / FC2-PPV-3281892 / FC2 PPV 3281892 等
			// 规则：
			// 1) 查询用番号必须是 FC2-PPV-xxxxxx（JavDB 认可）
			// 2) -C 仅作为“中文字幕”语义后缀保留到最终文件名里，不能参与搜索匹配
			let m = title.match(/(?:^|[^A-Z0-9])(FC2)[\-_ ]{0,2}(PPV)[\-_ ]{0,2}(\d{5,8})(?:[\-_ ]{0,2}(C))?(?=$|[^A-Z0-9])/);
			if (m) {
				let num = m[3];
				let cFlag = m[4];
				t = "FC2-PPV-" + num;
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
				t = title.match(/[A-Z]{2,5}[\-_]{0,1}\d{3,5}/);
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
            t = t.toString().replace("_", "-");
            console.log("找到番号:" + t);
            return{
                fh: t,
                part: part,
				if4k: if4k,
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
