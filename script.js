// ==UserScript==
// @name         HDrezka Dual Subtitles
// @version      1.4.3
// @description  Adds dual subtitles (English and Russian) to HDrezka.
// @match        *://hdrezka.ag/*
// @match        *://hdrezka.cm/*
// @match        *://hdrezka.me/*
// @match        *://hdrezka.tv/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  let subtitlesData = {}; // Object for storing active subtitles
  let contextMenuEnabled = false; // Flag for tracking context menu activation
  let episodeObserver; // Observer for episode/translation changes
  let videoTimeUpdateListener = null; // Listener for video time updates for subtitles
  let translatorObserver = null; // Observer for translator changes
  let overlays = {}; // Object for storing subtitle overlays
  let videoSrcObserver = null; // Observer for video src changes
  let epTabsObserver = null; // Observer for episode tabs
  let nativeSubtitlesDisabled = false; // Flag indicating if native subtitles were disabled
  let nativeSubtitlesObserver = null; // Observer for native subtitles

  window.addEventListener("load", () => {
    console.log("[DualSubtitles] Page loaded.");
    const video = document.querySelector("#player video");
    if (!video) {
      console.error("[DualSubtitles] Video not found");
      return;
    }
    if (!window.CDNPlayerInfo || !CDNPlayerInfo.subtitle) {
      console.error("[DualSubtitles] CDNPlayerInfo.subtitle not found");
      return;
    }
    console.log("[DualSubtitles] Starting auto-overlay of subtitles.");

    // Disable native subtitles only once during loading
    disableAllNativeSubtitles();

    // Add observer for new subtitle elements
    setupNativeSubtitlesObserver();

    // Load subtitles, then display
    parseAndLoadSubtitles().then(() => {
      setupSubtitleDisplay();
    });

    // Add observer for translator changes
    setupTranslatorObserver(video);

    // Add observer for episode/season changes
    setupEpisodeObserver(video);
  });

  // Set up observer for native subtitles
  function setupNativeSubtitlesObserver() {
    // Disable previous observer if it existed
    if (nativeSubtitlesObserver) {
      nativeSubtitlesObserver.disconnect();
    }

    const playerElement = document.getElementById("oframecdnplayer");
    if (!playerElement) return;

    // Create style to hide all native subtitles
    if (!document.getElementById("hide-native-subtitles-style")) {
      const styleElement = document.createElement("style");
      styleElement.id = "hide-native-subtitles-style";
      styleElement.textContent = `
        .b-simple_text_decor__subtitle,
        .text-subtitle, 
        .subtitles-container, 
        .vjs-text-track-display, 
        .vjs-text-track,
        .vjs-text-track-cue,
        #oframecdnplayer > pjsdiv[style*="bottom: 50px"]:not(.multi-subtitle-container):not(.subtitle-overlay-container),
        #oframecdnplayer > pjsdiv[style*="bottom: 40px"]:not(.multi-subtitle-container):not(.subtitle-overlay-container),
        .pjsdiv.subtitles {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(styleElement);
    }

    // Create new observer to monitor for native subtitles
    nativeSubtitlesObserver = new MutationObserver(function (mutations) {
      for (const mutation of mutations) {
        // Check only added nodes
        if (mutation.addedNodes && mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              // Only DOM elements
              // Check if this is a subtitle element
              if (
                node.classList &&
                (node.classList.contains("subtitles") ||
                  node.classList.contains("text-subtitle") ||
                  node.classList.contains("b-simple_text_decor__subtitle") ||
                  node.classList.contains("vjs-text-track") ||
                  node.classList.contains("vjs-text-track-cue"))
              ) {
                node.style.display = "none";
                node.style.visibility = "hidden";
              }

              // Check attributes that might identify subtitle elements
              if (
                node.style &&
                (node.style.bottom === "50px" ||
                  node.style.bottom === "40px") &&
                !node.classList.contains("subtitle-overlay-container") &&
                !node.classList.contains("multi-subtitle-container")
              ) {
                node.style.display = "none";
                node.style.visibility = "hidden";
              }
            }
          }
        }

        // Also check attribute changes for existing elements
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style" &&
          mutation.target.style &&
          (mutation.target.style.bottom === "50px" ||
            mutation.target.style.bottom === "40px") &&
          !mutation.target.classList.contains("subtitle-overlay-container") &&
          !mutation.target.classList.contains("multi-subtitle-container")
        ) {
          mutation.target.style.display = "none";
          mutation.target.style.visibility = "hidden";
        }
      }
    });

    // Observe the entire player to intercept any new subtitles
    nativeSubtitlesObserver.observe(playerElement, {
      childList: true, // observe child element addition/removal
      attributes: true, // observe attributes
      subtree: true, // observe all descendants
      attributeFilter: ["style", "class"], // watch only these attributes
    });

    console.log("[DualSubtitles] Native subtitle observer set up");
  }

  // Function to completely disable all native subtitles
  function disableAllNativeSubtitles() {
    console.log("[DualSubtitles] Disabling all native subtitles...");

    const video = document.querySelector("#player video");
    if (!video) return;

    // 1. Disable through video element API
    if (video.textTracks && video.textTracks.length > 0) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = "disabled";
      }

      // Remove track elements
      const trackElements = video.querySelectorAll("track");
      trackElements.forEach((track) => {
        track.remove();
      });
    }

    // 2. Disable through player API
    try {
      // Disable via global player
      if (typeof player !== "undefined") {
        if (player.subtitle) player.subtitle.disable();
        if (player.subtitles) player.subtitles.disable();
      }

      // Disable via CDNPlayer
      if (typeof CDNPlayer !== "undefined") {
        if (CDNPlayer.subtitle) CDNPlayer.subtitle.disable();
        if (CDNPlayer.subtitles) CDNPlayer.subtitles.disable();
      }
    } catch (e) {
      console.log("[DualSubtitles] Error disabling through player API:", e);
    }

    // 3. Force disable through clicks on subtitle buttons
    try {
      // Find all subtitle selectors and click the "off" option
      const subtitleSelectors = document.querySelectorAll(
        ".subtitle-select, .cdn-selector-subtitle, .cdnplayer-subtitles-menu"
      );

      subtitleSelectors.forEach((selector) => {
        if (selector) {
          const offOption = selector.querySelector('li[data-subtitle="off"]');
          if (offOption) {
            offOption.click();
          }
        }
      });

      // Also find subtitle buttons in the player
      const subtitleButtons = document.querySelectorAll(
        ".vjs-subs-caps-button, .subtitles-button, .vjs-subtitles-button"
      );

      subtitleButtons.forEach((button) => {
        if (button && !button.classList.contains("subtitles-disabled")) {
          button.click(); // Click to open menu

          // With a small delay, click the disable option
          setTimeout(() => {
            const offOptions = document.querySelectorAll(
              '.vjs-menu-item[data-subtitle="off"], .subtitles-item[data-subtitle="off"]'
            );
            offOptions.forEach((option) => option.click());
          }, 50);
        }
      });
    } catch (e) {
      console.log("[DualSubtitles] Error clicking disable button:", e);
    }

    // 4. Hide all existing subtitle elements
    const subtitleElements = [
      ".b-simple_text_decor__subtitle",
      ".text-subtitle",
      ".subtitles-container",
      ".vjs-text-track-display",
      ".vjs-text-track",
      ".vjs-text-track-cue",
      '#oframecdnplayer > pjsdiv[style*="bottom: 50px"]:not(.multi-subtitle-container):not(.subtitle-overlay-container)',
      '#oframecdnplayer > pjsdiv[style*="bottom: 40px"]:not(.multi-subtitle-container):not(.subtitle-overlay-container)',
      ".pjsdiv.subtitles",
    ];

    subtitleElements.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.style.display = "none";
        el.style.visibility = "hidden";
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
      });
    });

    // 5. Find all suspicious elements that might be subtitles
    document.querySelectorAll("pjsdiv").forEach((el) => {
      if (
        el.style &&
        (el.style.bottom === "50px" || el.style.bottom === "40px") &&
        !el.classList.contains("subtitle-overlay-container") &&
        !el.classList.contains("multi-subtitle-container")
      ) {
        el.style.display = "none";
        el.style.visibility = "hidden";
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
      }
    });

    nativeSubtitlesDisabled = true;
    console.log("[DualSubtitles] All native subtitles disabled");
  }

  // Function to track translator changes
  function setupTranslatorObserver(video) {
    const translatorsList = document.getElementById("translators-list");
    if (!translatorsList) return;

    // Force clear subtitles immediately on click
    translatorsList.addEventListener("mousedown", function (e) {
      const clickedTranslator =
        e.target.tagName === "LI" ? e.target : e.target.closest("li");
      if (clickedTranslator) {
        console.log("[DualSubtitles] Translator clicked, clearing subtitles");
        // Immediately hide all subtitles from screen
        hideAllSubtitles();
      }
    });

    // Handler for translator click to reload subtitles
    translatorsList.addEventListener("click", function (e) {
      const clickedTranslator =
        e.target.tagName === "LI" ? e.target : e.target.closest("li");
      if (clickedTranslator) {
        console.log(
          "[DualSubtitles] Translator switch detected, waiting for new data to load..."
        );

        // Completely clear existing subtitles
        removeAllSubtitles();

        // Re-disable native subtitles
        disableAllNativeSubtitles();

        // Wait for CDNPlayerInfo update after translation change
        setTimeout(() => {
          if (window.CDNPlayerInfo && CDNPlayerInfo.subtitle) {
            console.log(
              "[DualSubtitles] Reloading subtitles after translator change"
            );

            // Reload and display subtitles
            parseAndLoadSubtitles().then(() => {
              setupSubtitleDisplay();
            });
          }
        }, 1000);
      }
    });

    // Disable previous observer if it existed
    if (translatorObserver) {
      translatorObserver.disconnect();
    }

    // Set up observer for active class changes for translators
    translatorObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (
          mutation.attributeName === "class" &&
          mutation.target.classList.contains("active") &&
          mutation.target.parentElement === translatorsList
        ) {
          console.log(
            "[DualSubtitles] Active translator change detected via class"
          );

          // Hide subtitles immediately
          hideAllSubtitles();

          // Completely remove subtitles and reload them
          setTimeout(() => {
            removeAllSubtitles();

            // Re-disable native subtitles
            disableAllNativeSubtitles();

            if (window.CDNPlayerInfo && CDNPlayerInfo.subtitle) {
              parseAndLoadSubtitles().then(() => {
                setupSubtitleDisplay();
              });
            }
          }, 500);
        }
      });
    });

    // Observe all elements in the translator list
    const translatorItems = translatorsList.querySelectorAll("li");
    translatorItems.forEach((item) => {
      translatorObserver.observe(item, { attributes: true });
    });
  }

  // Hide all subtitles from screen without removing them
  function hideAllSubtitles() {
    document.querySelectorAll(".subtitle-overlay-container").forEach((el) => {
      el.innerHTML = ""; // Clear content but keep the elements themselves
    });
  }

  // Function to track episode/season changes
  function setupEpisodeObserver(video) {
    // Main method: tracking video src changes
    if (videoSrcObserver) {
      videoSrcObserver.disconnect();
    }

    // Save current video src
    video.dataset.lastSrc = video.src;

    // Create observer for video.src changes
    videoSrcObserver = new MutationObserver((mutations) => {
      if (video.src !== video.dataset.lastSrc) {
        console.log(
          "[DualSubtitles] Episode change detected via src, reloading subtitles"
        );
        handleEpisodeChange(video);
      }
    });

    // Track src attribute on video element
    videoSrcObserver.observe(video, {
      attributes: true,
      attributeFilter: ["src"],
    });

    // Additional method: tracking episode and season buttons
    const episodesTab = document.getElementById("simple-episodes-tabs");
    const seasonsTab = document.getElementById("simple-seasons-tabs");

    // Tab click handlers
    const handleTabClick = (e) => {
      const clickedTab =
        e.target.tagName === "LI" ? e.target : e.target.closest("li");
      if (clickedTab) {
        console.log("[DualSubtitles] Episode/season tab click");

        // Immediately hide subtitle content
        hideAllSubtitles();

        // Re-disable native subtitles
        disableAllNativeSubtitles();

        // After some time, check if src changed
        setTimeout(() => {
          if (video.src !== video.dataset.lastSrc) {
            console.log("[DualSubtitles] Episode change via tab click");
            handleEpisodeChange(video);
          } else {
            console.log(
              "[DualSubtitles] Checking additional episode change indicators"
            );
            // If src didn't change, check other indicators (active episode data, etc.)
            checkForEpisodeChange(video);
          }
        }, 1000);
      }
    };

    // Add click handlers for tabs
    if (episodesTab) {
      episodesTab.addEventListener("click", handleTabClick);
    }

    if (seasonsTab) {
      seasonsTab.addEventListener("click", handleTabClick);
    }

    // Observer for active class changes in episode tabs
    if (epTabsObserver) {
      epTabsObserver.disconnect();
    }

    epTabsObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.attributeName === "class" &&
          mutation.target.classList.contains("active")
        ) {
          console.log(
            "[DualSubtitles] Active episode change detected via class"
          );

          // With a short pause, check if subtitles need updating
          setTimeout(() => {
            checkForEpisodeChange(video);
          }, 500);
        }
      });
    });

    // Apply observer to episode and season tabs
    if (episodesTab) {
      const episodes = episodesTab.querySelectorAll("li");
      episodes.forEach((ep) => {
        epTabsObserver.observe(ep, { attributes: true });
      });
    }

    if (seasonsTab) {
      const seasons = seasonsTab.querySelectorAll("li");
      seasons.forEach((season) => {
        epTabsObserver.observe(season, { attributes: true });
      });
    }
  }

  // Check additional indicators of episode change
  function checkForEpisodeChange(video) {
    // Get current episode and season data
    const currentEpisode = document.querySelector(
      "#simple-episodes-tabs .active"
    );
    const currentSeason = document.querySelector(
      "#simple-seasons-tabs .active"
    );

    // Check if previous values were saved
    const prevEpisodeId = video.dataset.lastEpisodeId;
    const prevSeasonId = video.dataset.lastSeasonId;

    // Get current IDs
    const episodeId = currentEpisode
      ? currentEpisode.getAttribute("data-episode_id")
      : null;
    const seasonId = currentSeason
      ? currentSeason.getAttribute("data-season_id")
      : null;

    console.log(
      `[DualSubtitles] Checking episode change: ${prevEpisodeId} -> ${episodeId}, season: ${prevSeasonId} -> ${seasonId}`
    );

    // If IDs changed, handle episode change
    if (
      (episodeId && prevEpisodeId !== episodeId) ||
      (seasonId && prevSeasonId !== seasonId)
    ) {
      console.log("[DualSubtitles] Episode change detected via ID");
      handleEpisodeChange(video);
    }

    // Save current values
    if (episodeId) video.dataset.lastEpisodeId = episodeId;
    if (seasonId) video.dataset.lastSeasonId = seasonId;
  }

  // Episode change handler
  function handleEpisodeChange(video) {
    console.log("[DualSubtitles] Processing episode change");

    // Update last known video src
    video.dataset.lastSrc = video.src;

    // Immediately hide subtitles
    hideAllSubtitles();

    // When changing episodes, completely remove and reload subtitles
    setTimeout(() => {
      removeAllSubtitles();

      // Re-disable native subtitles
      disableAllNativeSubtitles();

      if (window.CDNPlayerInfo && CDNPlayerInfo.subtitle) {
        // Reload and display subtitles
        parseAndLoadSubtitles().then(() => {
          setupSubtitleDisplay();
        });
      }
    }, 1000);
  }

  // Function to completely remove all subtitles
  function removeAllSubtitles() {
    // Clear subtitle data
    subtitlesData = {};

    // Reset overlays object
    overlays = {};

    // Remove all subtitle containers from screen
    document.querySelectorAll(".subtitle-overlay-container").forEach((el) => {
      el.remove();
    });

    // Disable all text tracks and remove tracks
    const video = document.querySelector("#player video");
    if (video) {
      // Disable text tracks
      if (video.textTracks && video.textTracks.length > 0) {
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].mode = "disabled";
        }
      }

      // Remove track elements
      const trackElements = video.querySelectorAll("track");
      trackElements.forEach((track) => {
        track.remove();
      });

      // Remove timeupdate listener
      if (videoTimeUpdateListener) {
        video.removeEventListener("timeupdate", videoTimeUpdateListener);
        videoTimeUpdateListener = null;
      }

      // Disable native subtitles if still active
      if (!nativeSubtitlesDisabled) {
        disableNativeSubtitles(video);
        nativeSubtitlesDisabled = true;
      }
    }

    console.log("[DualSubtitles] All subtitles removed");
  }

  // Function to parse and load subtitles
  async function parseAndLoadSubtitles() {
    subtitlesData = {};
    const activeSubtitles = {};

    // Parse available subtitles
    if (!window.CDNPlayerInfo || !CDNPlayerInfo.subtitle) {
      console.error(
        "[DualSubtitles] CDNPlayerInfo.subtitle not found when attempting to load subtitles"
      );
      return subtitlesData;
    }

    CDNPlayerInfo.subtitle.split(",").forEach((e) => {
      try {
        const parts = e.split("[");
        if (parts.length < 2) return;
        const data = parts[1].split("]");
        const lang = data[0].trim();
        const link = data[1].trim();
        console.log("[DualSubtitles] Parsed:", lang, link);

        // Save all available subtitles
        if (
          lang.toLowerCase().includes("en") ||
          lang.toLowerCase() === "english"
        ) {
          activeSubtitles["en"] = {
            name: lang,
            url: link,
          };
        } else if (
          lang.toLowerCase().includes("ru") ||
          lang.toLowerCase() === "russian" ||
          lang.toLowerCase() === "русский"
        ) {
          activeSubtitles["ru"] = {
            name: lang,
            url: link,
          };
        }
      } catch (err) {
        console.error("[DualSubtitles] Parsing error:", e, err);
      }
    });

    console.log("[DualSubtitles] Active subtitles:", activeSubtitles);

    // Load subtitles for each language
    for (const lang in activeSubtitles) {
      try {
        const url = activeSubtitles[lang].url;
        const response = await fetch(url);
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);

        const text = await response.text();
        subtitlesData[lang] = parseVTT(text, lang);
        console.log(
          `[DualSubtitles] Subtitles for ${lang} loaded and parsed:`,
          subtitlesData[lang].length
        );
      } catch (error) {
        console.error(
          `[DualSubtitles] Error loading subtitles for ${lang}:`,
          error
        );
      }
    }

    return subtitlesData;
  }

  // Function to parse VTT file
  function parseVTT(vttText, lang) {
    const lines = vttText.split("\n");
    const cues = [];
    let currentCue = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and WEBVTT header
      if (!line || line === "WEBVTT") continue;

      // Check if line contains time range (00:00:00.000 --> 00:00:00.000)
      if (line.includes("-->")) {
        const timeData = line.split("-->");
        const startTime = parseTimeToSeconds(timeData[0].trim());
        const endTime = parseTimeToSeconds(timeData[1].trim());

        currentCue = {
          startTime,
          endTime,
          text: "",
          lang,
        };
        cues.push(currentCue);
      } else if (currentCue) {
        // Add text to current cue, removing numbers at the end of the line
        const cleanedLine = line.replace(/\d+\s*$/, "").trim();
        if (cleanedLine) {
          if (currentCue.text) {
            currentCue.text += " " + cleanedLine;
          } else {
            currentCue.text = cleanedLine;
          }
        }
      }
    }

    return cues;
  }

  // Converts time in "00:00:00.000" format to seconds
  function parseTimeToSeconds(timeString) {
    const parts = timeString.split(":");
    let seconds = 0;

    if (parts.length === 3) {
      // Format HH:MM:SS.mmm
      seconds =
        parseFloat(parts[0]) * 3600 +
        parseFloat(parts[1]) * 60 +
        parseFloat(parts[2]);
    } else if (parts.length === 2) {
      // Format MM:SS.mmm
      seconds = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }

    return seconds;
  }

  // REPLACING the old disableNativeSubtitles function, which is no longer used
  // with a shortened version that just calls the new disableAllNativeSubtitles function
  function disableNativeSubtitles(video) {
    disableAllNativeSubtitles();
  }

  // Function to enable context menu on subtitles
  function enableContextMenu(playerElement) {
    if (contextMenuEnabled) return;

    // Handler for right-click on main player
    playerElement.addEventListener(
      "contextmenu",
      function (e) {
        // Check if right-click was on a subtitle element
        let path = e.composedPath();
        for (const element of path) {
          if (
            element.classList &&
            (element.classList.contains("subtitle-overlay-container") ||
              element.classList.contains("subtitle-text") ||
              element.classList.contains("subtitle-span"))
          ) {
            // Allow standard browser context menu
            e.stopPropagation();
            return true;
          }
        }
      },
      true
    );

    contextMenuEnabled = true;
    console.log("[DualSubtitles] Context menu for subtitles enabled");
  }

  // Sets up subtitle display
  function setupSubtitleDisplay() {
    const video = document.querySelector("#player video");
    if (!video) return;

    if (Object.keys(subtitlesData).length === 0) {
      console.log("[DualSubtitles] Subtitles not loaded.");
      return;
    }

    // Create containers for subtitles
    const parent =
      document.getElementById("oframecdnplayer") || video.parentElement;
    if (!parent) return;

    // Remove old overlays if any
    document.querySelectorAll(".subtitle-overlay-container").forEach((el) => {
      el.remove();
    });

    // Create overlays for each language
    overlays = {};

    for (const lang in subtitlesData) {
      const overlay = document.createElement("div");
      overlay.className = "subtitle-overlay-container";
      overlay.setAttribute("data-lang", lang);
      overlay.style.position = "absolute";
      overlay.style.width = "90%";
      overlay.style.left = "5%";
      overlay.style.textAlign = "center";
      overlay.style.zIndex = "9999";
      overlay.style.pointerEvents = "auto";
      overlay.style.userSelect = "text";

      if (lang === "en") {
        overlay.style.bottom = "80px";
      } else if (lang === "ru") {
        overlay.style.bottom = "55px";
      }

      parent.appendChild(overlay);
      overlays[lang] = overlay;
      console.log(`[DualSubtitles] Overlay for ${lang} created.`);
    }

    // Enable context menu for subtitles
    enableContextMenu(parent);

    // Remove previous listener if it existed
    if (videoTimeUpdateListener) {
      video.removeEventListener("timeupdate", videoTimeUpdateListener);
    }

    // Create new listener
    videoTimeUpdateListener = () => {
      updateSubtitles(video.currentTime);
    };

    // Start updating subtitles during playback
    video.addEventListener("timeupdate", videoTimeUpdateListener);

    // Monitor fullscreen mode changes
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    // Re-disable native subtitles
    setTimeout(() => {
      disableAllNativeSubtitles();
    }, 100);

    console.log("[DualSubtitles] Subtitle display set up successfully.");

    // Function to handle fullscreen mode changes
    function handleFullscreenChange() {
      const isFullscreen = !!(
        document.fullscreenElement || document.webkitFullscreenElement
      );
      console.log("[DualSubtitles] Fullscreen mode change:", isFullscreen);

      // Current container for placing overlays
      const currentContainer =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        parent;

      // Move overlays to current container
      for (const lang in overlays) {
        const overlay = overlays[lang];
        if (overlay && overlay.parentNode !== currentContainer) {
          overlay.remove();
          currentContainer.appendChild(overlay);
        }
      }

      // After mode change, reactivate context menu
      setTimeout(() => {
        enableContextMenu(currentContainer);
      }, 100);
    }
  }

  // Updates subtitles based on current video time
  function updateSubtitles(currentTime) {
    for (const lang in subtitlesData) {
      const cues = subtitlesData[lang];
      const overlay = overlays[lang];

      // Skip if overlay for language not found
      if (!overlay) continue;

      // Find active subtitles for current time
      const activeCue = cues.find(
        (cue) => currentTime >= cue.startTime && currentTime <= cue.endTime
      );

      if (activeCue) {
        const fontSize = lang === "en" ? "16px" : "14px";
        const fontWeight = lang === "en" ? "600" : "400";

        overlay.innerHTML = `<span class="subtitle-span" style="
          background-color:rgba(0,0,0,0.7);
          padding:2px 4px;
          border-radius:3px;
          line-height:1.2;
          color:white;
          display:inline-block;
          max-width:100%;
          white-space:normal;
          word-break:break-word;
          font-size:${fontSize};
          font-weight:${fontWeight};
          user-select:text;
          pointer-events:auto;
          -webkit-user-select:text;
          -moz-user-select:text;
          -ms-user-select:text;
          cursor:text;
        ">${activeCue.text}</span>`;
      } else {
        overlay.innerHTML = "";
      }
    }
  }

  // Cleanup on page unload
  window.addEventListener("unload", () => {
    // Disconnect observers
    if (episodeObserver) {
      episodeObserver.disconnect();
    }
    if (translatorObserver) {
      translatorObserver.disconnect();
    }
    if (videoSrcObserver) {
      videoSrcObserver.disconnect();
    }
    if (epTabsObserver) {
      epTabsObserver.disconnect();
    }
    if (nativeSubtitlesObserver) {
      nativeSubtitlesObserver.disconnect();
    }

    // Remove event listeners
    const video = document.querySelector("#player video");
    if (video && videoTimeUpdateListener) {
      video.removeEventListener("timeupdate", videoTimeUpdateListener);
    }

    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    document.removeEventListener(
      "webkitfullscreenchange",
      handleFullscreenChange
    );
  });
})();
