// ==UserScript==
// @name         HDrezka Dual Subtitles
// @version      1.4.3
// @description  Добавляет дуальные субтитры (английские и русские) на HDrezka.
// @match        *://hdrezka.ag/*
// @match        *://hdrezka.cm/*
// @match        *://hdrezka.me/*
// @match        *://hdrezka.tv/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  let subtitlesData = {}; // Объект для хранения активных субтитров
  let contextMenuEnabled = false; // Флаг для отслеживания активации контекстного меню
  let episodeObserver; // Наблюдатель за изменением серии/перевода
  let videoTimeUpdateListener = null; // Слушатель обновления времени видео для субтитров
  let translatorObserver = null; // Наблюдатель за изменениями переводчика
  let overlays = {}; // Объект для хранения оверлеев субтитров
  let videoSrcObserver = null; // Наблюдатель за изменениями src видео
  let epTabsObserver = null; // Наблюдатель за вкладками эпизодов
  let nativeSubtitlesDisabled = false; // Флаг, указывающий, были ли отключены нативные субтитры
  let nativeSubtitlesObserver = null; // Наблюдатель за нативными субтитрами

  window.addEventListener("load", () => {
    console.log("[DualSubtitles] Страница загружена.");
    const video = document.querySelector("#player video");
    if (!video) {
      console.error("[DualSubtitles] Видео не найдено");
      return;
    }
    if (!window.CDNPlayerInfo || !CDNPlayerInfo.subtitle) {
      console.error("[DualSubtitles] CDNPlayerInfo.subtitle не найден");
      return;
    }
    console.log("[DualSubtitles] Запускаем авто-наложение субтитров.");

    // Отключаем нативные субтитры только один раз при загрузке
    disableAllNativeSubtitles();

    // Добавляем наблюдатель за появлением новых элементов субтитров
    setupNativeSubtitlesObserver();

    // Загружаем субтитры, затем отображаем
    parseAndLoadSubtitles().then(() => {
      setupSubtitleDisplay();
    });

    // Добавляем наблюдателя за изменениями переводчика
    setupTranslatorObserver(video);

    // Добавляем наблюдателя за изменениями серии/сезона
    setupEpisodeObserver(video);
  });

  // Настраиваем наблюдатель за нативными субтитрами
  function setupNativeSubtitlesObserver() {
    // Отключаем предыдущий наблюдатель, если он был
    if (nativeSubtitlesObserver) {
      nativeSubtitlesObserver.disconnect();
    }

    const playerElement = document.getElementById("oframecdnplayer");
    if (!playerElement) return;

    // Создаем стиль для скрытия всех нативных субтитров
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

    // Создаем новый наблюдатель, который будет следить за появлением нативных субтитров
    nativeSubtitlesObserver = new MutationObserver(function (mutations) {
      for (const mutation of mutations) {
        // Проверяем только добавленные узлы
        if (mutation.addedNodes && mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              // Только элементы DOM
              // Проверяем, является ли это элементом субтитров
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

              // Проверяем атрибуты, которые могут идентифицировать элемент субтитров
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

        // Также проверяем изменения атрибутов для существующих элементов
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

    // Наблюдаем за всем плеером, чтобы перехватывать любые новые субтитры
    nativeSubtitlesObserver.observe(playerElement, {
      childList: true, // наблюдаем за добавлением/удалением дочерних элементов
      attributes: true, // наблюдаем за атрибутами
      subtree: true, // наблюдаем за всеми потомками
      attributeFilter: ["style", "class"], // следим только за этими атрибутами
    });

    console.log(
      "[DualSubtitles] Наблюдатель за нативными субтитрами установлен"
    );
  }

  // Функция для полного отключения всех нативных субтитров
  function disableAllNativeSubtitles() {
    console.log("[DualSubtitles] Отключение всех нативных субтитров...");

    const video = document.querySelector("#player video");
    if (!video) return;

    // 1. Отключаем через API видеоэлемента
    if (video.textTracks && video.textTracks.length > 0) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = "disabled";
      }

      // Удаляем элементы track
      const trackElements = video.querySelectorAll("track");
      trackElements.forEach((track) => {
        track.remove();
      });
    }

    // 2. Отключаем через API плеера
    try {
      // Отключение через глобальный player
      if (typeof player !== "undefined") {
        if (player.subtitle) player.subtitle.disable();
        if (player.subtitles) player.subtitles.disable();
      }

      // Отключение через CDNPlayer
      if (typeof CDNPlayer !== "undefined") {
        if (CDNPlayer.subtitle) CDNPlayer.subtitle.disable();
        if (CDNPlayer.subtitles) CDNPlayer.subtitles.disable();
      }
    } catch (e) {
      console.log("[DualSubtitles] Ошибка при отключении через API плеера:", e);
    }

    // 3. Принудительно отключаем через клик по кнопкам субтитров
    try {
      // Ищем все селекторы субтитров и кликаем по опции "off"
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

      // Также ищем кнопки субтитров в плеере
      const subtitleButtons = document.querySelectorAll(
        ".vjs-subs-caps-button, .subtitles-button, .vjs-subtitles-button"
      );

      subtitleButtons.forEach((button) => {
        if (button && !button.classList.contains("subtitles-disabled")) {
          button.click(); // Кликаем для вызова меню

          // С небольшой задержкой кликаем по опции отключения
          setTimeout(() => {
            const offOptions = document.querySelectorAll(
              '.vjs-menu-item[data-subtitle="off"], .subtitles-item[data-subtitle="off"]'
            );
            offOptions.forEach((option) => option.click());
          }, 50);
        }
      });
    } catch (e) {
      console.log("[DualSubtitles] Ошибка при клике по кнопке отключения:", e);
    }

    // 4. Скрываем все существующие элементы субтитров
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

    // 5. Ищем все подозрительные элементы, которые могут быть субтитрами
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
    console.log("[DualSubtitles] Все нативные субтитры отключены");
  }

  // Функция для отслеживания изменения переводчика
  function setupTranslatorObserver(video) {
    const translatorsList = document.getElementById("translators-list");
    if (!translatorsList) return;

    // Принудительно очищаем субтитры сразу при клике
    translatorsList.addEventListener("mousedown", function (e) {
      const clickedTranslator =
        e.target.tagName === "LI" ? e.target : e.target.closest("li");
      if (clickedTranslator) {
        console.log("[DualSubtitles] Клик по переводчику, очищаем субтитры");
        // Немедленно скрываем все субтитры с экрана
        hideAllSubtitles();
      }
    });

    // Обработчик клика по переводчику для перезагрузки субтитров
    translatorsList.addEventListener("click", function (e) {
      const clickedTranslator =
        e.target.tagName === "LI" ? e.target : e.target.closest("li");
      if (clickedTranslator) {
        console.log(
          "[DualSubtitles] Обнаружено переключение переводчика, ждем загрузки новых данных..."
        );

        // Полностью очищаем существующие субтитры
        removeAllSubtitles();

        // Повторно отключаем нативные субтитры
        disableAllNativeSubtitles();

        // Ждем обновления CDNPlayerInfo после смены перевода
        setTimeout(() => {
          if (window.CDNPlayerInfo && CDNPlayerInfo.subtitle) {
            console.log(
              "[DualSubtitles] Перезагружаем субтитры после смены переводчика"
            );

            // Заново загружаем и отображаем субтитры
            parseAndLoadSubtitles().then(() => {
              setupSubtitleDisplay();
            });
          }
        }, 1000);
      }
    });

    // Отключаем предыдущий наблюдатель, если он был
    if (translatorObserver) {
      translatorObserver.disconnect();
    }

    // Настраиваем наблюдатель за изменениями класса активности для переводчиков
    translatorObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (
          mutation.attributeName === "class" &&
          mutation.target.classList.contains("active") &&
          mutation.target.parentElement === translatorsList
        ) {
          console.log(
            "[DualSubtitles] Обнаружена смена активного переводчика через класс"
          );

          // Сразу скрываем субтитры
          hideAllSubtitles();

          // Полностью удаляем субтитры и перезагружаем их
          setTimeout(() => {
            removeAllSubtitles();

            // Повторно отключаем нативные субтитры
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

    // Наблюдаем за всеми элементами списка переводчиков
    const translatorItems = translatorsList.querySelectorAll("li");
    translatorItems.forEach((item) => {
      translatorObserver.observe(item, { attributes: true });
    });
  }

  // Скрываем все субтитры с экрана, не удаляя их
  function hideAllSubtitles() {
    document.querySelectorAll(".subtitle-overlay-container").forEach((el) => {
      el.innerHTML = ""; // Очищаем содержимое, но сохраняем сами элементы
    });
  }

  // Функция для отслеживания изменения серии/сезона
  function setupEpisodeObserver(video) {
    // Основной способ: отслеживание изменений src видео
    if (videoSrcObserver) {
      videoSrcObserver.disconnect();
    }

    // Сохраняем текущий src видео
    video.dataset.lastSrc = video.src;

    // Создаем наблюдателя за изменениями video.src
    videoSrcObserver = new MutationObserver((mutations) => {
      if (video.src !== video.dataset.lastSrc) {
        console.log(
          "[DualSubtitles] Обнаружена смена серии через src, перезагружаем субтитры"
        );
        handleEpisodeChange(video);
      }
    });

    // Отслеживаем атрибут src у видеоэлемента
    videoSrcObserver.observe(video, {
      attributes: true,
      attributeFilter: ["src"],
    });

    // Дополнительный способ: отслеживание кнопок эпизодов и сезонов
    const episodesTab = document.getElementById("simple-episodes-tabs");
    const seasonsTab = document.getElementById("simple-seasons-tabs");

    // Обработчики кликов по вкладкам
    const handleTabClick = (e) => {
      const clickedTab =
        e.target.tagName === "LI" ? e.target : e.target.closest("li");
      if (clickedTab) {
        console.log("[DualSubtitles] Клик по вкладке эпизода/сезона");

        // Немедленно скрываем содержимое субтитров
        hideAllSubtitles();

        // Повторно отключаем нативные субтитры
        disableAllNativeSubtitles();

        // Через некоторое время проверяем, изменился ли src
        setTimeout(() => {
          if (video.src !== video.dataset.lastSrc) {
            console.log("[DualSubtitles] Смена серии через клик по вкладке");
            handleEpisodeChange(video);
          } else {
            console.log(
              "[DualSubtitles] Проверка дополнительных признаков смены серии"
            );
            // Если src не изменился, проверим другие признаки (данные активного эпизода и т.д.)
            checkForEpisodeChange(video);
          }
        }, 1000);
      }
    };

    // Добавляем обработчики кликов по вкладкам
    if (episodesTab) {
      episodesTab.addEventListener("click", handleTabClick);
    }

    if (seasonsTab) {
      seasonsTab.addEventListener("click", handleTabClick);
    }

    // Наблюдатель за изменениями активного класса во вкладках эпизодов
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
            "[DualSubtitles] Обнаружена смена активного эпизода через класс"
          );

          // Через небольшую паузу проверяем необходимость обновления субтитров
          setTimeout(() => {
            checkForEpisodeChange(video);
          }, 500);
        }
      });
    });

    // Применяем наблюдатель к вкладкам эпизодов и сезонов
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

  // Проверка дополнительных признаков смены серии
  function checkForEpisodeChange(video) {
    // Получаем текущие данные эпизода и сезона
    const currentEpisode = document.querySelector(
      "#simple-episodes-tabs .active"
    );
    const currentSeason = document.querySelector(
      "#simple-seasons-tabs .active"
    );

    // Проверяем, были ли сохранены предыдущие значения
    const prevEpisodeId = video.dataset.lastEpisodeId;
    const prevSeasonId = video.dataset.lastSeasonId;

    // Получаем текущие идентификаторы
    const episodeId = currentEpisode
      ? currentEpisode.getAttribute("data-episode_id")
      : null;
    const seasonId = currentSeason
      ? currentSeason.getAttribute("data-season_id")
      : null;

    console.log(
      `[DualSubtitles] Проверка смены эпизода: ${prevEpisodeId} -> ${episodeId}, сезона: ${prevSeasonId} -> ${seasonId}`
    );

    // Если идентификаторы изменились, обрабатываем смену серии
    if (
      (episodeId && prevEpisodeId !== episodeId) ||
      (seasonId && prevSeasonId !== seasonId)
    ) {
      console.log("[DualSubtitles] Обнаружена смена серии через ID");
      handleEpisodeChange(video);
    }

    // Сохраняем текущие значения
    if (episodeId) video.dataset.lastEpisodeId = episodeId;
    if (seasonId) video.dataset.lastSeasonId = seasonId;
  }

  // Обработчик смены серии
  function handleEpisodeChange(video) {
    console.log("[DualSubtitles] Обработка смены серии");

    // Обновляем последний известный src видео
    video.dataset.lastSrc = video.src;

    // Немедленно скрываем субтитры
    hideAllSubtitles();

    // При смене серии полностью удаляем и перезагружаем субтитры
    setTimeout(() => {
      removeAllSubtitles();

      // Повторно отключаем нативные субтитры
      disableAllNativeSubtitles();

      if (window.CDNPlayerInfo && CDNPlayerInfo.subtitle) {
        // Заново загружаем и отображаем субтитры
        parseAndLoadSubtitles().then(() => {
          setupSubtitleDisplay();
        });
      }
    }, 1000);
  }

  // Функция для полного удаления всех субтитров
  function removeAllSubtitles() {
    // Очищаем данные субтитров
    subtitlesData = {};

    // Сбрасываем объект оверлеев
    overlays = {};

    // Удаляем все контейнеры субтитров с экрана
    document.querySelectorAll(".subtitle-overlay-container").forEach((el) => {
      el.remove();
    });

    // Отключаем все текстовые дорожки и удаляем треки
    const video = document.querySelector("#player video");
    if (video) {
      // Отключаем текстовые дорожки
      if (video.textTracks && video.textTracks.length > 0) {
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].mode = "disabled";
        }
      }

      // Удаляем элементы track
      const trackElements = video.querySelectorAll("track");
      trackElements.forEach((track) => {
        track.remove();
      });

      // Удаляем слушатель timeupdate
      if (videoTimeUpdateListener) {
        video.removeEventListener("timeupdate", videoTimeUpdateListener);
        videoTimeUpdateListener = null;
      }

      // Отключаем нативные субтитры, если они еще активны
      if (!nativeSubtitlesDisabled) {
        disableNativeSubtitles(video);
        nativeSubtitlesDisabled = true;
      }
    }

    console.log("[DualSubtitles] Все субтитры удалены");
  }

  // Функция для парсинга и загрузки субтитров
  async function parseAndLoadSubtitles() {
    subtitlesData = {};
    const activeSubtitles = {};

    // Парсим доступные субтитры
    if (!window.CDNPlayerInfo || !CDNPlayerInfo.subtitle) {
      console.error(
        "[DualSubtitles] CDNPlayerInfo.subtitle не найден при попытке загрузки субтитров"
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
        console.log("[DualSubtitles] Распарсено:", lang, link);

        // Сохраняем все доступные субтитры
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
        console.error("[DualSubtitles] Ошибка парсинга:", e, err);
      }
    });

    console.log("[DualSubtitles] Активные субтитры:", activeSubtitles);

    // Загружаем субтитры для каждого языка
    for (const lang in activeSubtitles) {
      try {
        const url = activeSubtitles[lang].url;
        const response = await fetch(url);
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);

        const text = await response.text();
        subtitlesData[lang] = parseVTT(text, lang);
        console.log(
          `[DualSubtitles] Субтитры для ${lang} загружены и разобраны:`,
          subtitlesData[lang].length
        );
      } catch (error) {
        console.error(
          `[DualSubtitles] Ошибка загрузки субтитров для ${lang}:`,
          error
        );
      }
    }

    return subtitlesData;
  }

  // Функция для парсинга VTT-файла
  function parseVTT(vttText, lang) {
    const lines = vttText.split("\n");
    const cues = [];
    let currentCue = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Пропускаем пустые строки и заголовок WEBVTT
      if (!line || line === "WEBVTT") continue;

      // Проверяем, содержит ли строка временной диапазон (00:00:00.000 --> 00:00:00.000)
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
        // Добавляем текст к текущему cue, удаляя числа в конце строки
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

  // Конвертирует время в формате "00:00:00.000" в секунды
  function parseTimeToSeconds(timeString) {
    const parts = timeString.split(":");
    let seconds = 0;

    if (parts.length === 3) {
      // Формат HH:MM:SS.mmm
      seconds =
        parseFloat(parts[0]) * 3600 +
        parseFloat(parts[1]) * 60 +
        parseFloat(parts[2]);
    } else if (parts.length === 2) {
      // Формат MM:SS.mmm
      seconds = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }

    return seconds;
  }

  // ЗАМЕНЯЕМ старую функцию disableNativeSubtitles, которая больше не используется
  // на сокращенную, которая просто вызывает новую функцию disableAllNativeSubtitles
  function disableNativeSubtitles(video) {
    disableAllNativeSubtitles();
  }

  // Функция для включения контекстного меню на субтитрах
  function enableContextMenu(playerElement) {
    if (contextMenuEnabled) return;

    // Обработчик правого клика на основном плеере
    playerElement.addEventListener(
      "contextmenu",
      function (e) {
        // Проверяем, был ли правый клик на элементе субтитров
        let path = e.composedPath();
        for (const element of path) {
          if (
            element.classList &&
            (element.classList.contains("subtitle-overlay-container") ||
              element.classList.contains("subtitle-text") ||
              element.classList.contains("subtitle-span"))
          ) {
            // Разрешаем стандартное контекстное меню браузера
            e.stopPropagation();
            return true;
          }
        }
      },
      true
    );

    contextMenuEnabled = true;
    console.log("[DualSubtitles] Контекстное меню для субтитров включено");
  }

  // Настраивает отображение субтитров
  function setupSubtitleDisplay() {
    const video = document.querySelector("#player video");
    if (!video) return;

    if (Object.keys(subtitlesData).length === 0) {
      console.log("[DualSubtitles] Субтитры не загружены.");
      return;
    }

    // Создаем контейнеры для субтитров
    const parent =
      document.getElementById("oframecdnplayer") || video.parentElement;
    if (!parent) return;

    // Удаляем старые оверлеи, если есть
    document.querySelectorAll(".subtitle-overlay-container").forEach((el) => {
      el.remove();
    });

    // Создаем оверлеи для каждого языка
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
      console.log(`[DualSubtitles] Overlay для ${lang} создан.`);
    }

    // Включаем контекстное меню для субтитров
    enableContextMenu(parent);

    // Удаляем предыдущий слушатель, если он был
    if (videoTimeUpdateListener) {
      video.removeEventListener("timeupdate", videoTimeUpdateListener);
    }

    // Создаем новый слушатель
    videoTimeUpdateListener = () => {
      updateSubtitles(video.currentTime);
    };

    // Запускаем функцию обновления субтитров при воспроизведении
    video.addEventListener("timeupdate", videoTimeUpdateListener);

    // Следим за изменением fullscreen режима
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    // Повторно отключаем нативные субтитры
    setTimeout(() => {
      disableAllNativeSubtitles();
    }, 100);

    console.log("[DualSubtitles] Отображение субтитров настроено успешно.");

    // Функция обработки изменения fullscreen режима
    function handleFullscreenChange() {
      const isFullscreen = !!(
        document.fullscreenElement || document.webkitFullscreenElement
      );
      console.log("[DualSubtitles] Изменение режима fullscreen:", isFullscreen);

      // Текущий контейнер для размещения оверлеев
      const currentContainer =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        parent;

      // Перемещаем оверлеи в текущий контейнер
      for (const lang in overlays) {
        const overlay = overlays[lang];
        if (overlay && overlay.parentNode !== currentContainer) {
          overlay.remove();
          currentContainer.appendChild(overlay);
        }
      }

      // После смены режима переактивируем контекстное меню
      setTimeout(() => {
        enableContextMenu(currentContainer);
      }, 100);
    }
  }

  // Обновляет субтитры на основе текущего времени видео
  function updateSubtitles(currentTime) {
    for (const lang in subtitlesData) {
      const cues = subtitlesData[lang];
      const overlay = overlays[lang];

      // Пропускаем, если оверлей для языка не найден
      if (!overlay) continue;

      // Находим активные субтитры для текущего времени
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

  // Очистка при unload страницы
  window.addEventListener("unload", () => {
    // Отключаем наблюдателей
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

    // Удаляем слушатели событий
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
