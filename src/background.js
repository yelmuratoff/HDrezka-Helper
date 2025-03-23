var urlList = [];
var browser = chrome || browser;

browser.storage.sync.get("urlList").then((data) => {
  urlList = data.urlList || [
    "https://hdrezka.ag",
    "https://hdrezka.cm",
    "https://hdrezka.ag",
    "https://hdrezka.me",
    "https://hdrezka.co",
  ];

  browser.storage.onChanged.addListener((changes) => {
    if (changes.urlList) {
      urlList = changes.urlList.newValue;

      let newValue = changes.urlList.newValue;
      let oldValue = changes.urlList.oldValue;

      let addedSites = newValue.filter(
        (site) => !oldValue || !oldValue.includes(site)
      );
      browser.tabs.query({}, function (tabs) {
        tabs.forEach((tab) => {
          if (tab.status == "complete") {
            let url = new URL(tab.url);
            if (addedSites.includes(url.origin)) {
              executeScript(tab.id);
              executeBefore(tab.id);
              browser.action.setIcon({
                path: { 128: "images/logo.png" },
                tabId: tab.id,
              });
            }
          }
        });
      });
    }
  });
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status == "complete" || changeInfo.status == "loading") {
    let url = new URL(tab.url);
    if (urlList.includes(url.origin)) {
      changeInfo.status == "complete"
        ? executeScript(tabId)
        : executeBefore(tabId);
      browser.action.setIcon({
        path: { 128: "images/logo.png" },
        tabId: tab.id,
      });
    }
  }
});

function executeScript(tabId) {
  browser.storage.sync.get(
    {
      download: true,
      inline_downloader: false,
      downloader_type: "fetch",
      chunk_size: 5,
      filename_structure: "",
      hideVK: true,
      subtitles: true,
      mobileMode: false,
    },
    (results) => {
      let chrome_arr = {
        downloadStr: browser.i18n.getMessage("downloadStr"),
        downloadLinkDesc: browser.i18n.getMessage("downloadLinkDesc"),
        subtitles: browser.i18n.getMessage("subtitles"),
        dualSubtitles: browser.i18n.getMessage("dualSubtitles"),
        applySubtitles: browser.i18n.getMessage("applySubtitles"),
        disableSubtitles: browser.i18n.getMessage("disableSubtitles"),
        cancelDownload: browser.i18n.getMessage("cancelDownload"),
        donateTitle: browser.i18n.getMessage("donateTitle"),
        donateButton: browser.i18n.getMessage("donateButton"),
        errorStr: browser.i18n.getMessage("errorStr"),
        vpnErrorMsg: browser.i18n.getMessage("vpnErrorMsg"),
        args: results,
      };
      browser.scripting.executeScript({
        target: { tabId: tabId },
        func: MainScript,
        args: [chrome_arr],
        world: "MAIN",
      });
    }
  );
}
function executeBefore(tabId) {
  browser.storage.sync.get(
    {
      mobileMode: false,
    },
    (results) => {
      browser.scripting.executeScript({
        target: { tabId: tabId },
        func: beforeLoaded,
        args: [results],
      });
    }
  );
}

function beforeLoaded(args) {
  if (args.mobileMode) {
    mobileView();
  }

  function mobileView() {
    let viewportMeta = document.querySelector("meta[name='viewport']");
    if (viewportMeta) {
      viewportMeta.content = "width=device-width, initial-scale=1.0";
    } else {
      viewportMeta = document.createElement("meta");
      viewportMeta.name = "viewport";
      viewportMeta.content = "width=device-width, initial-scale=1.0";
      document.head.appendChild(viewportMeta);
    }
    const style = document.createElement("style");
    style.innerHTML = `
			.b-dwnapp,.b-post__schedule_list,.b-sidelist__holder{overflow:auto}#translators-list li,body{min-width:0}body.active-brand,body.active-brand.pp{padding-top:0!important}#cdnplayer,#cdnplayer-container,#footer,#top-head,#top-nav,#wrapper,.b-container.b-wrapper,.b-footer__inner.b-wrapper,.b-footer__left,.b-tophead.b-wrapper,.b-topnav.b-wrapper,.b-wrapper:has(.b-content__crumbs){width:100%!important}#top-nav{display:flex;height:100%}#search{position:unset}#topnav-menu,.b-content__inline_sidebar,.b-post__social_holder .share-label,.b-post__social_holder .share-list,.b-post__wait_status,.b-simple_episodes__list:before{display:none}.b-tophead-right.user-things.pull-right{width:100%;display:flex;justify-content:space-evenly}#search-results,.b-content__columns,.b-content__inline_inner.b-content__inline_inner_mainprobar,.b-content__inline_inner_main{padding-right:0}#cdnplayer-preloader,.b-collections__newest_inner,.b-content__main,.b-wrapper.nopadd{width:100%}.b-post__infotable{display:flex;flex-wrap:wrap;justify-content:center;padding-left:0}.b-post__infotable_left{margin-left:0}#translators-list{display:grid;grid-template-columns:1fr 1fr}.b-addcomment__actions,.b-content__htitle,.b-post__infolast,.b-post__origtitle,.b-post__title,.b-user__settings_holder_save{text-align:center}.b-sidelist__holder .b-sidelist{display:flex;padding:0 5px}.b-sidelist__holder .b-sidelist div{flex-shrink:0}#ps-content-holder,.b-post__description{padding:10px}.b-content__inline:has(#videosaves-list){overflow:auto}.b-content__inline:has(.b-favorites_content__sidebar){padding-top:10px}#videosaves-list .info,#videosaves-list .title{min-width:120px}.b-search__live_all,.b-search__live_section{margin:0}.b-favorites_content__sidebar{float:unset;margin:auto}.b-content__main_filters{margin:0!important;display:flex;flex-direction:column;align-items:flex-start}.b-content__filters_types{display:flex;width:100%;flex-direction:column-reverse}.b-content__inline_items{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));padding:10px;box-sizing:border-box}.b-navigation{grid-column:1/-1}.b-content__inline_items .b-content__inline_item,.b-post__schedule_table .td-4{width:auto}#newest-slider{width:100%;padding:0}.b-simple_episodes__list{display:grid;grid-template-columns:1fr 1fr 1fr}#hd-comments-list{overflow:hidden}.b-post__actions:has(#user-favorites-holder[style*=block]) td:has(#comments-list-button){display:none}.b-post__schedule_block_title{display:flex}#ps-trailer-player,#ps-trailer-player iframe,.b-content__main_filters_item,.b-post__schedule_block_title .title{width:100%}.b-post__schedule_list .load-more{text-align:left;padding-left:1rem}.b-post__schedule_list table{min-width:max-content}.b-post__schedule_table .td-5{width:auto;padding:1rem}input[type=password],input[type=text],select{width:100%!important;box-sizing:border-box;max-width:90vw;display:block;margin:auto}.b-tabs__main{display:flex;flex-direction:column;gap:5px;padding:10px}.b-user__settings label{margin-left:1rem}textarea.b-area.b-field{max-width:95vw!important;display:block;margin:auto}.b-addcomment__actions .actions-left{float:unset}.b-userprofile__avatar_wrapper{display:flex;flex-direction:column;width:100dvw;align-items:center}.choose-avatar-holder{margin:10px}#login-popup,#register-popup{top:50%!important;left:50%!important;transform:translate(-50%,-50%);margin:0!important;width:95vw;box-sizing:border-box}.register_button{width:100%!important}.b-content__main_filters_item a{width:100%;box-sizing:border-box}.tooltipster-base{min-width:unset!important;max-width:unset!important;}
		`;
    document.head.appendChild(style);
  }
}

function MainScript(chrome_i18n) {
  var args = chrome_i18n.args;

  if (args.hideVK) {
    hideVK();
  }

  let getFilmInfo = (_) => {
    let ifExist = (el) => {
      return el ? el : document.createElement("div");
    };

    let title = ifExist(
      document.querySelector(".b-content__main .b-post__title")
    ).textContent.trim();
    let image =
      ifExist(
        document.querySelector(".b-content__main .b-sidecover a")
      ).getAttribute("href") ||
      ifExist(
        document.querySelector(".b-content__main .b-sidecover img")
      ).getAttribute("src");
    let currentEpisode = ifExist(
      document.querySelector("#simple-episodes-tabs .active")
    ).textContent.trim();
    let currentSeason = ifExist(
      document.querySelector("#simple-seasons-tabs .active")
    ).textContent.trim();
    return {
      title: title,
      image: image,
      season: currentSeason,
      episode: currentEpisode,
    };
  };

  let player = document.getElementById("player");
  if (player) {
    let videoElement = (_) => {
      return player.querySelector("video");
    };
    document.title = getFilmInfo().title;

    videoElement().addEventListener("play", (_) => {
      if ("mediaSession" in navigator) {
        let filmInfo = getFilmInfo();
        navigator.mediaSession.metadata = new MediaMetadata({
          title: filmInfo.title,
          artist: [filmInfo.season, filmInfo.episode]
            .filter(Boolean)
            .join(" • "),
          artwork: [{ src: filmInfo.image }],
        });
      }
    });

    if (args.download) {
      main();
      let temp_video_src = videoElement().src;
      let observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          let current_video_src = videoElement().src;
          if (temp_video_src != current_video_src) {
            temp_video_src = current_video_src;
            main();
          }
        });
      });
      observer.observe(document.querySelector("body"), {
        childList: true,
        subtree: true,
      });
    }
    
    // Add listener for translator changes to remove subtitles when switching audio tracks
    const translatorsList = document.getElementById("translators-list");
    if (translatorsList) {
      translatorsList.addEventListener("click", function(e) {
        if (e.target.tagName === "LI" || e.target.closest("li")) {
          // Remove subtitles when changing translator/audio
          updateSubtitlesDisplay({});
          
          // Clear subtitle checkboxes if menu is open
          const subtitleCheckboxes = document.querySelectorAll('input[id^="subtitle-"]');
          if (subtitleCheckboxes.length > 0) {
            subtitleCheckboxes.forEach(cb => cb.checked = false);
          }
        }
      });
    }
  }

  function main() {
    let arr = clearTrash(CDNPlayerInfo.streams).split(",");
    createButton();
    createDownloadMenu(arr);
    
    // Automatically apply EN and RU subtitles without opening menu
    if (args.subtitles) {
      autoApplySubtitles();
    }
  }

  function hideVK() {
    let el_ = document.getElementById("vk_groups");
    if (el_) {
      el_.style.display = "none";
    }
  }

  // Automatically apply EN and RU subtitles without user interaction
  function autoApplySubtitles() {
    if (!CDNPlayerInfo.subtitle || !document.getElementById("oframecdnplayer")) return;
    
    const playerElement = document.getElementById("oframecdnplayer");
    const activeSubtitles = {};
    let engKey, ruKey;
    
    // Parse subtitles and auto-enable EN and RU
    CDNPlayerInfo.subtitle.split(",").forEach(function(e) {
      try {
        const [lang, link] = e.split("[")[1].split("]");
        
        // Direct check for English or Russian subtitles
        if (lang.toLowerCase() === "english" || lang.toLowerCase() === "en") {
          engKey = lang;
          activeSubtitles[lang] = link;
        } else if (lang.toLowerCase() === "russian" || lang.toLowerCase() === "ru" || 
                  lang.toLowerCase() === "русский") {
          ruKey = lang;
          activeSubtitles[lang] = link;
        }
      } catch (error) {
        console.error("Error parsing subtitle:", e);
      }
    });
    
    // If both EN and RU found, reorder them (EN first) and apply
    if (Object.keys(activeSubtitles).length > 0) {
      // Create ordered object with English first if both are present
      if (engKey && ruKey) {
        const orderedSubtitles = {};
        orderedSubtitles[engKey] = activeSubtitles[engKey];
        orderedSubtitles[ruKey] = activeSubtitles[ruKey];
        
        // Apply the ordered subtitles
        updateSubtitlesDisplay(orderedSubtitles);
        
        // Also observe translator changes to remove subtitles when switching audio
        observeTranslatorChanges();
      } else {
        // Apply whatever subtitles we found
        updateSubtitlesDisplay(activeSubtitles);
        
        // Also observe translator changes
        observeTranslatorChanges();
      }
    }
  }
  
  // Function to observe translator changes and remove subtitles when audio changes
  function observeTranslatorChanges() {
    const translatorsList = document.getElementById("translators-list");
    if (!translatorsList) return;
    
    // Create an observer to watch for active class changes on translators
    const translatorObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.attributeName === "class" && 
            mutation.target.classList.contains("active")) {
          // Audio track changed - remove subtitles
          updateSubtitlesDisplay({});
        }
      });
    });
    
    // Observe all translator items for class changes
    const translatorItems = translatorsList.querySelectorAll("li");
    translatorItems.forEach(item => {
      translatorObserver.observe(item, { attributes: true });
    });
  }

  function clearTrash(data) {
    function product(iterables, repeat) {
      var argv = Array.prototype.slice.call(arguments),
        argc = argv.length;
      if (argc === 2 && !isNaN(argv[argc - 1])) {
        var copies = [];
        for (var i = 0; i < argv[argc - 1]; i++) {
          copies.push(argv[0].slice()); // Clone
        }
        argv = copies;
      }
      return argv.reduce(
        function tl(accumulator, value) {
          var tmp = [];
          accumulator.forEach(function (a0) {
            value.forEach(function (a1) {
              tmp.push(a0.concat(a1));
            });
          });
          return tmp;
        },
        [[]]
      );
    }
    function unite(arr) {
      var final = [];
      arr.forEach(function (e) {
        final.push(e.join(""));
      });
      return final;
    }
    var trashList = ["@", "#", "!", "^", "$"];
    var two = unite(product(trashList, 2));
    var tree = unite(product(trashList, 3));
    var trashCodesSet = two.concat(tree);

    var arr = data.replace("#h", "").split("//_//");
    var trashString = arr.join("");

    trashCodesSet.forEach(function (i) {
      var temp = btoa(i);
      trashString = trashString.replaceAll(temp, "");
    });
    try {
      var final_string = atob(trashString);
    } catch {
      console.error(trashString);
    }
    return final_string;
  }

  function LOADER() {
    const svgNamespace = "http://www.w3.org/2000/svg";
    function createCircle(cx, begin) {
      let circle = document.createElementNS(svgNamespace, "circle");
      circle.setAttribute("cx", cx);
      circle.setAttribute("cy", "12");
      circle.setAttribute("r", "3");
      circle.setAttribute("fill", "lightblue");

      let animate = document.createElementNS(svgNamespace, "animate");
      animate.setAttribute("attributeName", "r");
      animate.setAttribute("begin", begin);
      animate.setAttribute("dur", "0.75s");
      animate.setAttribute("values", "3;.2;3");
      animate.setAttribute("repeatCount", "indefinite");

      circle.appendChild(animate);
      return circle;
    }
    let div = document.createElement("div");
    div.style.display = "flex";
    div.style.height = "100px";
    let svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.style.height = "50px";
    svg.style.margin = "auto";
    svg.style.display = "block";
    svg.appendChild(createCircle("4", "0s"));
    svg.appendChild(createCircle("12", "0.15s"));
    svg.appendChild(createCircle("20", "0.3s"));
    div.appendChild(svg);
    return div;
  }
  function makeSVG(viewBox, path) {
    const svgNamespace = "http://www.w3.org/2000/svg";
    let svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", viewBox);
    let path_el = document.createElementNS(svgNamespace, "path");
    path_el.setAttribute("d", path);
    svg.append(path_el);
    return svg;
  }
  function closeSVG(color = "red") {
    const svgNamespace = "http://www.w3.org/2000/svg";
    let svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 512 512");
    svg.setAttribute("fill", color);
    let circle = document.createElementNS(svgNamespace, "circle");
    circle.setAttribute("cx", "256");
    circle.setAttribute("cy", "256");
    circle.setAttribute("r", "256");
    svg.append(circle);
    let path_el = document.createElementNS(svgNamespace, "path");
    path_el.setAttribute(
      "d",
      "M334.63 177.37a24 24 0 0 1 0 33.94L289.94 256l44.69 44.69a24 24 0 1 1-33.94 33.94L256 289.94l-44.69 44.69a24 24 0 1 1-33.94-33.94L222.06 256l-44.69-44.69a24 24 0 1 1 33.94-33.94L256 222.06l44.69-44.69a24 24 0 0 1 33.94 0z"
    );
    path_el.setAttribute("fill", "#fff");
    svg.append(path_el);
    return svg;
  }

  function createButton() {
    if (!document.getElementById("downloadButton")) {
      el = document.getElementById("send-video-issue");
      let div = document.createElement("div");
      div.id = "downloadButton";
      div.title = chrome_i18n.downloadStr;
      let svg = makeSVG(
        "0 0 330 330",
        "m211.667 127.121-31.669 31.666V75c0-8.285-6.716-15-15-15-8.284 0-15 6.715-15 15v83.787l-31.665-31.666c-5.857-5.857-15.355-5.857-21.213 0-5.858 5.859-5.858 15.355 0 21.213l57.271 57.271A14.95 14.95 0 0 0 164.997 210c3.838 0 7.678-1.465 10.607-4.393l57.275-57.271c5.857-5.857 5.858-15.355.001-21.215-5.859-5.857-15.356-5.857-21.213 0zM195 240h-60c-8.284 0-15 6.715-15 15 0 8.283 6.716 15 15 15h60c8.284 0 15-6.717 15-15 0-8.285-6.716-15-15-15z"
      );
      svg.setAttribute("fill", "green");
      div.appendChild(svg);
      div.style.right = "55px";
      div.style.top = "0";
      div.style.height = "50px";
      div.style.width = "50px";
      div.style.position = "absolute";
      div.style.cursor = "pointer";
      div.style.transition = "0.3s";
      div.style.background = "#2d2d2d";

      div.onmouseover = function () {
        div.style.background = "#4D4D4D";
      };
      div.onmouseout = function () {
        div.style.background = "#2d2d2d";
      };
      div.onclick = show_download_menu;

      el.parentNode.insertBefore(div, el);
    }
  }

  async function createDownloadMenu(array) {
    if (!document.getElementById("downloadMenu")) {
      let div = document.createElement("div");
      div.id = "downloadMenu";
      div.style.minHeight = "60px";
      div.style.width = "160px";
      div.style.background = "rgba(93, 93, 93, 0.5)";
      div.style.backdropFilter = "blur(5px)";
      div.style.position = "absolute";
      div.style.borderRadius = "6px";
      div.style.padding = "4px";
      div.style.filter = "drop-shadow(black 0 0 4px)";
      div.style.boxShadow = "0 2px 4px black";
      div.style.zIndex = "100";
      div.style.right = args.mobileMode ? "5px" : "0";
      div.style.top = "55px";
      div.style.display = "none";
      div.style.opacity = 0;
      div.style.transform = "scale(0)";
      div.style.transformOrigin = "top center";
      div.style.transition = "0.5s";
      div.style.userSelect = "none";
      div.style.overflow = "hidden";
      div.appendChild(LOADER());
      document.getElementById("send-video-issue").parentNode.appendChild(div);
    } else {
      document.getElementById("downloadMenu").replaceChildren(LOADER());
    }

    let div_target = document.getElementById("downloadMenu");
    let div_ = document.createElement("div");
    for (const e of array) {
      var temp = e.split("[")[1].split("]");
      var quality = temp[0];
      var links = temp[1].split(" or ").filter((x) => x.endsWith(".mp4"));
      for (let link of links) {
        let size = await getFileSize(link);
        if (size) {
          size = formatBytes(size, 1);
          let element = makeLink(quality, link, size);
          div_.appendChild(element);
          break;
        } else {
          console.error({ _: "Error", name: quality, url: link });
        }
      }
    }
    div_target.replaceChildren(div_);

    if (div_.children.length == 0) {
      vpnAlert(div_target);
      return;
    } else {
      donationPopup(div_target);
    }

    if (args.subtitles) {
      addSubtitles();
    }
  }

  function buildFileName(name, season, episode, translation, res) {
    if (args.filename_structure) {
      var selectArray = {
        title: name,
        s: season,
        ep: episode,
        transl: translation,
        res: res,
      };
      let temp = args.filename_structure;
      Object.keys(selectArray).forEach(function (e) {
        if (selectArray[e]) {
          temp = temp.replaceAll("%" + e, selectArray[e]);
        } else {
          temp = temp.replaceAll("%" + e, "");
        }
      });
      return temp;
    } else {
      return "video";
    }
  }

  function makeLink(title, href, size) {
    let filename = href.split("/").pop();
    let a = document.createElement("a");
    if (args.inline_downloader) {
      a.title = chrome_i18n.downloadStr;
      a.onclick = async (_) => {
        if (!a.getAttribute("blocked")) {
          a.setAttribute("blocked", true);
          let season, episode, translation, name;
          let el = document.querySelector("#simple-episodes-tabs .active");
          if (el) {
            season = el.getAttribute("data-season_id");
            episode = el.getAttribute("data-episode_id");
          }
          let el2 = document.querySelector("#translators-list .active");
          if (el2) {
            translation = el2.textContent.trim();
          }
          name = document
            .querySelector(".b-content__main .b-post__title")
            .textContent.trim();
          let targetFileName = buildFileName(
            name,
            season,
            episode,
            translation,
            title
          );

          let div = document.createElement("span");
          div.className = "download-area";
          div.style.display = "flex";
          div.style.alignItems = "center";
          div.style.padding = "6px 0";
          let progress = document.createElement("progress");
          progress.style.width = "100%";
          progress.max = 100;
          let percentage = document.createElement("span");
          percentage.style.marginLeft = "5px";
          percentage.textContent = "0%";
          let close_area = document.createElement("div");
          close_area.title = chrome_i18n.cancelDownload;
          close_area.style.display = "flex";
          close_area.style.marginLeft = "5px";
          let close_but = closeSVG();
          close_but.style.borderRadius = "50%";
          close_but.style.width = "20px";
          close_but.style.transition = "0.25s";
          close_but.onmouseover = (_) => {
            close_but.setAttribute("fill", "#c80000");
          };
          close_but.onmouseout = (_) => {
            close_but.setAttribute("fill", "red");
          };
          close_area.appendChild(close_but);
          div.appendChild(progress);
          div.appendChild(percentage);
          div.appendChild(close_area);
          a.appendChild(div);

          let on_progress = (percent) => {
            progress.value = percent;
            percentage.textContent = percent + "%";
          };
          let finish = (_) => {
            div.remove();
            a.style.background = null;
            setTimeout(function () {
              a.removeAttribute("blocked");
            }, 100);
          };
          let abort;
          if (args.downloader_type == "fetch") {
            abort = await videoDownloadV3(
              href,
              targetFileName,
              on_progress,
              finish
            );
          } else if (args.downloader_type == "xhr") {
            abort = videoDownloadV2(href, targetFileName, on_progress, finish);
          }
          close_but.onclick = (_) => {
            abort();
            finish();
          };
        }
      };
    } else {
      a.href = href;
      a.target = "_blank";
      a.download = filename;
      a.title = chrome_i18n.downloadLinkDesc;
    }
    a.style.display = "block";
    a.style.color = "white";
    a.style.textDecoration = "none";
    a.style.padding = "4px 5px";
    a.style.margin = "2px 0";
    a.style.borderRadius = "6px";
    a.style.transition = "0.2s";
    a.style.cursor = "pointer";

    a.onmouseover = function () {
      a.style.background = "rgb(0, 0, 255, 0.75)";
    };
    a.onmouseout = function () {
      a.style.background = null;
    };

    let span = document.createElement("span");
    span.textContent = title;
    let span2 = document.createElement("span");
    span2.style.float = "right";
    span2.textContent = size;

    a.appendChild(span);
    a.appendChild(span2);
    return a;
  }

  function addSubtitles() {
    const Subtitles = CDNPlayerInfo.subtitle;
    if (!Subtitles) return;
    
    let div_ = document.getElementById("downloadMenu");
    let details = document.createElement("details");
    details.style.border = "1px solid white";
    details.style.borderRadius = "8px";
    details.style.margin = "2px";
    details.style.marginTop = "8px";
    details.style.overflow = "hidden";
    
    // Auto-open subtitles section
    details.setAttribute("open", "");

    let summary = document.createElement("summary");
    summary.textContent = chrome_i18n.subtitles;
    summary.style.color = "aqua";
    summary.style.textAlign = "center";
    summary.style.cursor = "pointer";
    summary.style.transition = "0.2s";
    summary.style.padding = "2px 0";
    summary.onmouseover = () => summary.style.background = "blueviolet";
    summary.onmouseout = () => summary.style.background = null;

    details.appendChild(summary);
    div_.appendChild(details);

    let hr = document.createElement("hr");
    hr.style.margin = 0;
    details.appendChild(hr);

    // Subtitle selection panel
    let selectionDiv = document.createElement("div");
    selectionDiv.style.padding = "8px";
    selectionDiv.style.background = "rgba(0, 0, 0, 0.5)";
    selectionDiv.style.marginBottom = "8px";

    let selectionTitle = document.createElement("div");
    selectionTitle.textContent = chrome_i18n.dualSubtitles || "Dual Subtitles:";
    selectionTitle.style.color = "white";
    selectionTitle.style.marginBottom = "8px";
    selectionTitle.style.fontSize = "14px";
    selectionDiv.appendChild(selectionTitle);

    // Track active subtitles
    let activeSubtitles = {};
    let engKey, ruKey;

    // Disable button
    let toggleContainer = document.createElement("div");
    toggleContainer.style.display = "flex";
    toggleContainer.style.justifyContent = "space-between";
    toggleContainer.style.alignItems = "center";
    toggleContainer.style.marginBottom = "10px";
    
    let toggleText = document.createElement("span");
    toggleText.textContent = chrome_i18n.disableSubtitles || "Disable Subtitles";
    toggleText.style.color = "white";
    toggleText.style.fontSize = "13px";
    
    let toggleButton = document.createElement("button");
    toggleButton.style.background = "#ff5050";
    toggleButton.style.border = "none";
    toggleButton.style.borderRadius = "4px";
    toggleButton.style.padding = "4px 8px";
    toggleButton.style.cursor = "pointer";
    toggleButton.style.color = "white";
    toggleButton.style.fontSize = "12px";
    toggleButton.textContent = "✕";
    toggleButton.title = chrome_i18n.disableSubtitles || "Disable Subtitles";
    
    toggleButton.onmouseover = () => toggleButton.style.background = "#ff3030";
    toggleButton.onmouseout = () => toggleButton.style.background = "#ff5050";
    
    toggleButton.onclick = function() {
      activeSubtitles = {};
      document.querySelectorAll('input[id^="subtitle-"]').forEach(cb => cb.checked = false);
      updateSubtitlesDisplay({});
    };
    
    toggleContainer.appendChild(toggleText);
    toggleContainer.appendChild(toggleButton);
    selectionDiv.appendChild(toggleContainer);

    // Process subtitles
    Subtitles.split(",").forEach(async function (e) {
      try {
        let [lang, link] = e.split("[")[1].split("]");
        let size = await getFileSize(link);
        size = formatBytes(size, 1);

        // Auto-detect EN and RU subtitles
        const isEnglish = lang.toLowerCase() === "english" || lang.toLowerCase() === "en";
        const isRussian = lang.toLowerCase() === "russian" || lang.toLowerCase() === "ru" || 
                      lang.toLowerCase() === "русский";
        
        if (isEnglish) {
          engKey = lang;
          activeSubtitles[lang] = link;
        }
        
        if (isRussian) {
          ruKey = lang;
          activeSubtitles[lang] = link;
        }

        // Create checkbox
        let checkboxContainer = document.createElement("div");
        checkboxContainer.style.display = "flex";
        checkboxContainer.style.alignItems = "center";
        checkboxContainer.style.marginBottom = "4px";

        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "subtitle-" + lang;
        checkbox.style.marginRight = "8px";
        checkbox.checked = isEnglish || isRussian;

        let label = document.createElement("label");
        label.htmlFor = "subtitle-" + lang;
        label.textContent = lang;
        label.style.color = "white";
        label.style.fontSize = "12px";

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        selectionDiv.appendChild(checkboxContainer);

        // Checkbox handler
        checkbox.addEventListener("change", function () {
          if (checkbox.checked) {
            activeSubtitles[lang] = link;
          } else {
            delete activeSubtitles[lang];
          }
          updateSubtitlesDisplay(activeSubtitles);
        });

        // Download link
        let element = makeLink(lang, link, size);
        details.appendChild(element);
        
        // If this is the last subtitle being processed, apply them
        // (This is a simplification - might not be reliable for ordering)
        if (isEnglish || isRussian) {
          // Order subtitles - EN first
          if (engKey && ruKey) {
            let orderedSubs = {};
            if (activeSubtitles[engKey]) orderedSubs[engKey] = activeSubtitles[engKey];
            if (activeSubtitles[ruKey]) orderedSubs[ruKey] = activeSubtitles[ruKey];
            
            if (Object.keys(orderedSubs).length > 0) {
              activeSubtitles = orderedSubs;
              updateSubtitlesDisplay(activeSubtitles);
            }
          }
        }
      } catch (error) {
        console.error("Error processing subtitle:", e);
      }
    });

    // Apply button
    let applyButton = document.createElement("button");
    applyButton.textContent = chrome_i18n.applySubtitles || "Apply Selected Subtitles";
    applyButton.style.display = "block";
    applyButton.style.width = "100%";
    applyButton.style.padding = "6px";
    applyButton.style.background = "#00adef";
    applyButton.style.border = "none";
    applyButton.style.borderRadius = "4px";
    applyButton.style.color = "white";
    applyButton.style.cursor = "pointer";
    applyButton.style.marginTop = "8px";

    applyButton.onmouseover = () => applyButton.style.background = "#0089c0";
    applyButton.onmouseout = () => applyButton.style.background = "#00adef";
    
    applyButton.onclick = function () {
      // Reorder subtitles if both EN and RU are present
      if (engKey && ruKey && activeSubtitles[engKey] && activeSubtitles[ruKey]) {
        let orderedSubs = {};
        orderedSubs[engKey] = activeSubtitles[engKey]; 
        orderedSubs[ruKey] = activeSubtitles[ruKey];
        activeSubtitles = orderedSubs;
      }
      updateSubtitlesDisplay(activeSubtitles);
    };

    selectionDiv.appendChild(applyButton);
    details.insertBefore(selectionDiv, hr.nextSibling);
  }

  // Function to update the subtitles display
  function updateSubtitlesDisplay(activeSubtitlesList) {
    // Get video element
    let video = document.querySelector("#player video");
    if (!video) return;

    // Remove existing subtitle tracks
    while (video.textTracks.length > 0) {
      const lastTrack = video.textTracks[video.textTracks.length - 1];
      if (lastTrack && lastTrack.mode) {
        lastTrack.mode = "disabled";
      }
      const trackElement = video.querySelector("track:last-child");
      if (trackElement) {
        video.removeChild(trackElement);
      }
    }

    // Remove existing subtitle display div from the player
    document
      .querySelectorAll(
        ".multi-subtitle-display, .multi-subtitle-display-fullscreen"
      )
      .forEach((el) => {
        el.remove();
      });

    // Hide existing player subtitles
    const playerSubtitles = document.querySelector(
      '#oframecdnplayer > pjsdiv[style*="bottom: 50px"]'
    );
    if (playerSubtitles) {
      playerSubtitles.style.display = "none";
    }

    // No subtitles selected, exit early
    if (Object.keys(activeSubtitlesList).length === 0) return;

    // Find the player element
    const playerElement = document.getElementById("oframecdnplayer");
    if (!playerElement) return;

    // Track whether context menu has been enabled
    let contextMenuEnabled = false;

    // Function to create subtitle container
    function createSubtitlesContainer(parent, className) {
      let container = document.createElement("pjsdiv");
      container.className = className;
      container.style.position = "absolute";
      container.style.width = "50%";
      container.style.left = "25%";
      container.style.bottom = "40px";
      container.style.textAlign = "center";
      container.style.zIndex = "9999";
      container.style.pointerEvents = "auto";
      container.style.userSelect = "text";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
      
      // Add right-click handler directly to container
      container.addEventListener('contextmenu', function(e) {
        e.stopPropagation();
      }, true);
      
      parent.appendChild(container);
      return container;
    }

    // Create container for normal mode
    const subsContainer = createSubtitlesContainer(
      playerElement,
      "multi-subtitle-display"
    );

    // Enable context menu on subtitles - only setup once
    function enableContextMenu() {
      if (contextMenuEnabled) return;
      
      // Main player right-click handler
      playerElement.addEventListener('contextmenu', function(e) {
        // Check if right-click was on a subtitle element
        let path = e.composedPath();
        for (const element of path) {
          if (element.classList && 
             (element.classList.contains('multi-subtitle-display') || 
              element.classList.contains('multi-subtitle-display-fullscreen') ||
              element.classList.contains('subtitle-text') ||
              element.classList.contains('subtitle-span'))) {
            // Allow default browser context menu
            e.stopPropagation();
            return true;
          }
        }
      }, true);
      
      contextMenuEnabled = true;
    }
    
    // Call the function immediately
    enableContextMenu();
    
    // Single unified observer for player changes
    const playerObserver = new MutationObserver(function(mutations) {
      // Handle subtitle display hiding
      const playerSubtitles = document.querySelector(
        '#oframecdnplayer > pjsdiv[style*="bottom: 50px"]:not(.multi-subtitle-display):not(.multi-subtitle-display-fullscreen)'
      );
      if (playerSubtitles) {
        playerSubtitles.style.display = "none";
      }
    });
    
    playerObserver.observe(playerElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Process all selected subtitles
    let activeLangs = Object.keys(activeSubtitlesList);
    for (let i = 0; i < activeLangs.length; i++) {
      let lang = activeLangs[i];
      let url = activeSubtitlesList[lang];

      // Create track element for loading subtitles
      let track = document.createElement("track");
      track.kind = "subtitles";
      track.label = lang;
      track.srclang = lang.toLowerCase().substring(0, 2);
      track.src = url;

      // Add track to video
      video.appendChild(track);

      // Create display element for this subtitle
      let subDisplay = document.createElement("pjsdiv");
      subDisplay.dataset.lang = lang;
      subDisplay.className = "subtitle-text";
      
      // Add right-click handler directly
      subDisplay.addEventListener('contextmenu', function(e) {
        e.stopPropagation();
      }, true);
      
      subsContainer.appendChild(subDisplay);

      // Enable track and set up event listeners
      const trackObj = video.textTracks[video.textTracks.length - 1];
      trackObj.mode = "hidden";

      // Monitor cue changes - create a reusable style string
      const baseStyle = "background-color:rgba(0,0,0,0.7);" +
                        "padding:3px 6px;" +
                        "border-radius:3px;" +
                        "line-height:1.4;" +
                        "color:white;" +
                        "display:inline-block;" +
                        "margin-bottom:2px;" +
                        "max-width:100%;" +
                        "white-space:normal;" +
                        "word-break:break-word;" +
                        "user-select:text;" +
                        "pointer-events:auto;" +
                        "-webkit-user-select:text;" +
                        "-moz-user-select:text;" +
                        "-ms-user-select:text;";

      // Monitor cue changes
      trackObj.oncuechange = function () {
        const isFullscreen = !!(
          document.fullscreenElement || document.webkitFullscreenElement
        );

        // Get appropriate subtitle elements
        let containers = [subsContainer];
        if (isFullscreen) {
          const fullscreenContainer = document.querySelector(
            ".multi-subtitle-display-fullscreen"
          );
          if (fullscreenContainer) {
            containers = [fullscreenContainer];
          }
        }

        for (let container of containers) {
          const subElement = container.querySelector(
            `.subtitle-text[data-lang="${lang}"]`
          );
          if (!subElement) continue;

          if (this.activeCues && this.activeCues.length > 0) {
            let cueText = this.activeCues[0].text;
            // Set font size based on language position (first is larger and bold, second is smaller)
            const fontSize = i === 0 ? "18px" : "14px";
            const fontWeight = i === 0 ? "700" : "400";
            
            // Use the precomputed style string and just append variable parts
            const spanHTML = `<span 
              style="${baseStyle}font-weight:${fontWeight};font-size:${fontSize};"
              class="subtitle-span">${cueText}</span>`;
            
            subElement.innerHTML = spanHTML;
          } else {
            subElement.innerHTML = "";
          }
        }
      };
    }

    // Function to handle fullscreen state
    function handleFullscreenChange() {
      const isFullscreen = !!(
        document.fullscreenElement || document.webkitFullscreenElement
      );

      // Remove any existing fullscreen subtitle container
      document
        .querySelectorAll(".multi-subtitle-display-fullscreen")
        .forEach((el) => el.remove());

      // Update visibility of normal mode container
      if (subsContainer) {
        subsContainer.style.display = isFullscreen ? "none" : "";
      }

      // Create fullscreen container if needed
      if (isFullscreen) {
        const fullscreenElement =
          document.fullscreenElement || document.webkitFullscreenElement;
        if (!fullscreenElement) return;

        // Create new container for fullscreen
        const fullscreenContainer = createSubtitlesContainer(
          fullscreenElement,
          "multi-subtitle-display-fullscreen"
        );

        // Create subtitle elements in fullscreen container
        for (let i = 0; i < activeLangs.length; i++) {
          let lang = activeLangs[i];

          let subDisplay = document.createElement("pjsdiv");
          subDisplay.dataset.lang = lang;
          subDisplay.className = "subtitle-text";
          
          // Add right-click handler directly
          subDisplay.addEventListener('contextmenu', function(e) {
            e.stopPropagation();
          }, true);
          
          fullscreenContainer.appendChild(subDisplay);

          // Copy current content if available
          const origSubElement = subsContainer.querySelector(
            `.subtitle-text[data-lang="${lang}"]`
          );
          if (origSubElement && origSubElement.innerHTML) {
            subDisplay.innerHTML = origSubElement.innerHTML;
          }
        }
      }
    }

    // Listen for fullscreen changes
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    // Initial fullscreen check
    handleFullscreenChange();

    // Listen for fullscreen button clicks
    const fullscreenButton = document.querySelector(
      'pjsdiv[style*="fullscreen"]'
    );
    if (fullscreenButton) {
      fullscreenButton.addEventListener("click", function () {
        setTimeout(handleFullscreenChange, 500);
      });
    }

    // Check fullscreen state during playback - but throttle the checks
    let lastCheckTime = 0;
    video.addEventListener("timeupdate", function () {
      const now = Date.now();
      // Only check every 1000ms to reduce performance impact
      if (now - lastCheckTime < 1000) return;
      lastCheckTime = now;
      
      const isFullscreen = !!(
        document.fullscreenElement || document.webkitFullscreenElement
      );
      
      if (
        isFullscreen &&
        !document.querySelector(".multi-subtitle-display-fullscreen")
      ) {
        handleFullscreenChange();
      }
    });
  }

  var timer;
  function show_download_menu() {
    let div = document.getElementById("downloadMenu");
    setTimeout(function () {
      document.body.onclick = hide_download_menu;
    }, 50);
    if (div.style.display == "none") {
      div.style.display = "block";
      setTimeout(function () {
        div.style.transform = "scale(1)";
        div.style.opacity = 1;
      }, 10);
    } else {
      if (timer) {
        clearTimeout(timer);
        div.style.transform = "scale(1)";
        div.style.opacity = 1;
      }
    }
  }
  function hide_download_menu(event) {
    let div = document.getElementById("downloadMenu");
    let path = event.path || (event.composedPath && event.composedPath());
    if (!path.includes(div)) {
      div.style.transform = "scale(0)";
      div.style.opacity = 0;
      setTimeout(function () {
        document.body.onclick = "";
      }, 50);
      timer = setTimeout(function () {
        div.style.display = "none";
      }, 400);
    }
  }

  function videoDownloadV2(url, filename, on_progress, on_complete) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob";
    xhr.onprogress = (prog) => {
      on_progress(Math.round((prog.loaded / prog.total) * 100));
    };
    xhr.onload = function () {
      window.URL = window.URL || window.webkitURL;
      let file = new Blob([xhr.response], { type: "application/octet-stream" });
      let a_el = document.createElement("a");
      a_el.href = window.URL.createObjectURL(file);
      a_el.download = `${filename}.mp4`;
      a_el.click();
      setTimeout(function () {
        on_complete();
      }, 1000);
    };
    xhr.send();
    return () => {
      xhr.abort();
    };
  }

  async function videoDownloadV3(url, fileName, on_progress, on_complete) {
    let canDownload = true;
    let _blobs = [];
    let _next_offset = 0;
    let CHUNK_SIZE = parseInt(args.chunk_size) * 1024 * 1024;
    let downloaded = 0;
    let filesize = await getFileSize(url);
    let controller = new AbortController();

    function fetchNextPart(_writable) {
      fetch(url, {
        signal: controller.signal,
        method: "GET",
        headers: {
          Range: `bytes=${_next_offset}-${Math.min(
            _next_offset + CHUNK_SIZE,
            filesize
          )}`,
        },
      })
        .then((res) => {
          if (![200, 206].includes(res.status)) {
            throw new Error("Not 200/206 response: " + res.status);
          }
          return new Response(
            new ReadableStream({
              start(controller) {
                const reader = res.body.getReader();
                read();
                function read() {
                  reader
                    .read()
                    .then(({ done, value }) => {
                      if (done) {
                        controller.close();
                        return;
                      }
                      downloaded += value.byteLength;
                      _next_offset = downloaded;
                      on_progress(Math.round((downloaded / filesize) * 100));
                      controller.enqueue(value);
                      read();
                    })
                    .catch((error) => {
                      console.error(error);
                      controller.error(error);
                    });
                }
              },
            })
          );
        })
        .then((response) => response.blob())
        .then((resBlob) => {
          if (_writable) {
            _writable.write(resBlob);
          } else {
            _blobs.push(resBlob);
          }
        })
        .then(() => {
          if (_next_offset < filesize) {
            if (canDownload) {
              fetchNextPart(_writable);
            } else {
              throw new Error("Aborted!");
            }
          } else {
            if (_writable) {
              _writable.close().then(() => {
                on_complete();
              });
            } else {
              save();
              on_complete();
            }
          }
        })
        .catch((reason) => {
          console.error(reason);
          on_complete();
        });
    }

    function save() {
      const blob = new Blob(_blobs, { type: "video/mp4" });
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.href = blobUrl;
      a.download = fileName;
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }

    const supportsFileSystemAccess = "showSaveFilePicker" in window;
    if (supportsFileSystemAccess) {
      window
        .showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: "Video File",
              accept: { "video/mp4": [".mp4"] },
            },
          ],
        })
        .then((handle) => {
          fileName = handle.name;
          handle.createWritable().then((writable) => {
            fetchNextPart(writable);
          });
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error(err.name, err.message);
          }
          on_complete();
        });
    } else {
      fetchNextPart(null);
    }
    return () => {
      canDownload = false;
      controller.abort();
    };
  }

  async function getFileSize(url) {
    return new Promise(async (resolve) => {
      let controller = new AbortController();
      fetch(url, { signal: controller.signal })
        .then((resp) => {
          resolve(resp.headers.get("Content-Length"));
          controller.abort();
        })
        .catch((_) => {
          resolve(0);
        });
    });
  }

  function formatBytes(bytes, decimals = 2) {
    if (bytes == 0) return "";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  function makePopup(parrent) {
    let div = document.createElement("div");
    div.style.inset = 0;
    div.style.position = "absolute";
    div.style.zIndex = 2;
    div.style.background = "rgb(0, 0, 0, 0.85)";
    div.style.padding = "5px";
    div.style.textAlign = "center";
    div.style.display = "flex";
    div.style.flexDirection = "column";
    div.style.justifyContent = "center";
    div.style.alignItems = "center";
    div.style.gap = "5px";
    parrent.appendChild(div);
    return div;
  }
  function addCloseButton(popup, callback = null) {
    let close_but = closeSVG();
    close_but.style.position = "absolute";
    close_but.style.zIndex = 3;
    close_but.style.top = "2px";
    close_but.style.right = "2px";
    close_but.style.cursor = "pointer";
    close_but.style.borderRadius = "50%";
    close_but.style.width = "22px";
    close_but.style.transition = "0.25s";
    close_but.onmouseover = (_) => {
      close_but.setAttribute("fill", "#c80000");
    };
    close_but.onmouseout = (_) => {
      close_but.setAttribute("fill", "red");
    };
    close_but.onclick = (_) => {
      popup.remove();
      if (callback) {
        callback();
      }
    };
    popup.appendChild(close_but);
  }

  function vpnAlert(div_target) {
    let popup = makePopup(div_target);
    popup.style.background = "unset";
    popup.style.position = "unset";
    popup.style.padding = "10px";
    let svg = makeSVG(
      "0 0 24 24",
      "m20.45 5.468-4-3a.753.753 0 0 0-.45-.15H8a.753.753 0 0 0-.45.15l-4 3a.753.753 0 0 0-.3.6v4.211c0 4.97 3.126 9.481 7.784 11.228a2.744 2.744 0 0 0 1.937-.001c4.653-1.746 7.779-6.257 7.779-11.227V6.068a.75.75 0 0 0-.3-.6Zm-7.7 6.773V14a.75.75 0 0 1-1.5 0v-1.759c-.589-.282-1-.879-1-1.574 0-.965.785-1.75 1.75-1.75s1.75.785 1.75 1.75c0 .695-.411 1.292-1 1.574Z"
    );
    svg.setAttribute("fill", "white");
    svg.style.height = "55px";
    popup.appendChild(svg);

    let h1 = document.createElement("h5");
    h1.style.color = "red";
    h1.textContent = chrome_i18n.errorStr;
    popup.appendChild(h1);
    let h2 = document.createElement("h5");
    h2.textContent = chrome_i18n.vpnErrorMsg;
    popup.appendChild(h2);
  }

  function donationPopup(menu_element) {
    function checkLastNotificationTime() {
      let currentTime = Math.floor(Date.now() / 1000);
      let lastNotificationTime = localStorage.getItem("lastNotificationTime");
      if (
        !lastNotificationTime ||
        currentTime - lastNotificationTime > 12 * 60 * 60
      ) {
        return true;
      } else {
        return false;
      }
    }
    if (checkLastNotificationTime()) {
      let popup = makePopup(menu_element);
      menu_element.style.minWidth = "175px";
      menu_element.style.minHeight = "150px";
      let svg = makeSVG(
        "0 0 32 32",
        "M21 24.3h-7.09a.5.5 0 0 1 0-1H21a1.32 1.32 0 1 0 0-2.64h-5.1a.5.5 0 0 1-.3-.11l-1.43-1.14a4.99 4.99 0 0 0-5.1-.69l-1.87.8a.5.5 0 0 1-.4-.91l1.88-.8a6 6 0 0 1 6.12.82l1.28 1.03H21a2.32 2.32 0 1 1 0 4.63Zm-4.04 5.2a4.96 4.96 0 0 1-1.58-.26l-8.45-2.81a.5.5 0 1 1 .32-.95l8.45 2.82a3.99 3.99 0 0 0 3.3-.36l9.86-5.92a1.32 1.32 0 1 0-1.36-2.26l-4.17 2.5a.5.5 0 0 1-.51-.86l4.17-2.5a2.32 2.32 0 1 1 2.38 3.97l-9.86 5.92a4.96 4.96 0 0 1-2.55.71ZM7 27.5H2a.5.5 0 0 1 0-1h4.5v-9H2a.5.5 0 0 1 0-1h5a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5Zm10.5-11a7 7 0 1 1 7-7 7 7 0 0 1-7 7Zm0-13a6 6 0 1 0 6 6 6 6 0 0 0-6-6Zm0 3.47a.5.5 0 0 1-.5-.5v-.92a.5.5 0 1 1 1 0v.92a.5.5 0 0 1-.5.5Zm0 6.98a.5.5 0 0 1-.5-.5v-.92a.5.5 0 0 1 1 0v.92a.5.5 0 0 1-.5.5Zm0-.97a2.02 2.02 0 0 1-2.1-1.92.5.5 0 0 1 1 0 1.12 1.12 0 0 0 2.2 0 .87.87 0 0 0-.63-.88l-1.26-.41a1.88 1.88 0 0 1-1.32-1.83 2.11 2.11 0 0 1 4.21 0 .5.5 0 0 1-1 0 1.12 1.12 0 0 0-2.2 0 .87.87 0 0 0 .63.88l1.26.41a1.88 1.88 0 0 1 1.32 1.83 2.02 2.02 0 0 1-2.11 1.92Z"
      );
      svg.setAttribute("fill", "lime");
      svg.style.height = "48px";
      popup.appendChild(svg);

      let h = document.createElement("h5");
      h.style.color = "white";
      h.textContent = chrome_i18n.donateTitle;
      popup.appendChild(h);

      let a = document.createElement("a");
      a.href = "https://donatello.to/super_zombi";
      a.target = "_blank";
      popup.appendChild(a);

      let button = document.createElement("button");
      button.textContent = chrome_i18n.donateButton;
      a.appendChild(button);
      button.style.setProperty("--glow-color", "#00a0b0");
      button.style.border = ".25em solid var(--glow-color)";
      button.style.padding = "0.5em 2em";
      button.style.margin = "0.5em";
      button.style.color = "var(--glow-color)";
      button.style.fontWeight = "bold";
      button.style.background = "black";
      button.style.borderRadius = "0.75em";
      button.style.outline = "none";
      button.style.boxShadow =
        "0 0 1em .25em var(--glow-color), inset 0 0 1em 0 var(--glow-color)";
      button.style.textShadow = "0 0 1em var(--glow-color)";
      button.style.transition = "all 0.3s";
      button.onmouseover = (_) => {
        button.style.color = "white";
        button.style.background = "var(--glow-color)";
        button.style.boxShadow = "0 0 1.25em .5em var(--glow-color)";
      };
      button.onmouseout = (_) => {
        button.style.color = "var(--glow-color)";
        button.style.background = "black";
        button.style.boxShadow =
          "0 0 1em .25em var(--glow-color), inset 0 0 1em 0 var(--glow-color)";
      };
      button.onclick = (_) => {
        popup.remove();
        var currentTime = Math.floor(Date.now() / 1000);
        localStorage.setItem("lastNotificationTime", currentTime);
        menu_element.style.minWidth = "unset";
        menu_element.style.minHeight = "60px";
      };
      addCloseButton(popup, (_) => {
        var currentTime = Math.floor(Date.now() / 1000);
        localStorage.setItem("lastNotificationTime", currentTime);
        menu_element.style.minWidth = "unset";
        menu_element.style.minHeight = "60px";
      });
    }
  }
}
