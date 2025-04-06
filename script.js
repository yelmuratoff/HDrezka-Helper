// ==UserScript==
// @name         HDrezka Dual Subtitles
// @version      1.4.0
// @description  Добавляет дуальные субтитры (английские и русские) на HDrezka.
// @match        *://hdrezka.ag/*
// @match        *://hdrezka.cm/*
// @match        *://hdrezka.me/*
// @match        *://hdrezka.tv/*
// @grant        none
// ==/UserScript==

(function() {
  "use strict";

  let subtitlesData = {}; // Объект для хранения активных субтитров
  let disableCheckInterval; // Интервал для проверки и отключения нативных субтитров
  let contextMenuEnabled = false; // Флаг для отслеживания активации контекстного меню

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

    // Сначала отключаем нативные субтитры
    disableNativeSubtitles(video);

    // Запускаем интервал для постоянной проверки и отключения нативных субтитров
    disableCheckInterval = setInterval(() => disableNativeSubtitles(video), 1000);

    // Загружаем субтитры, затем отображаем
    parseAndLoadSubtitles().then(() => {
      setupSubtitleDisplay();
    });
  });

  // Функция для парсинга и загрузки субтитров
  async function parseAndLoadSubtitles() {
    subtitlesData = {};
    const activeSubtitles = {};

    // Парсим доступные субтитры
    CDNPlayerInfo.subtitle.split(",").forEach(e => {
      try {
        const parts = e.split("[");
        if (parts.length < 2) return;
        const data = parts[1].split("]");
        const lang = data[0].trim();
        const link = data[1].trim();
        console.log("[DualSubtitles] Распарсено:", lang, link);

        // Сохраняем все доступные субтитры
        if (lang.toLowerCase().includes("en") || lang.toLowerCase() === "english") {
          activeSubtitles["en"] = {
            name: lang,
            url: link
          };
        } else if (lang.toLowerCase().includes("ru") ||
                  lang.toLowerCase() === "russian" ||
                  lang.toLowerCase() === "русский") {
          activeSubtitles["ru"] = {
            name: lang,
            url: link
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
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const text = await response.text();
        subtitlesData[lang] = parseVTT(text, lang);
        console.log(`[DualSubtitles] Субтитры для ${lang} загружены и разобраны:`, subtitlesData[lang].length);
      } catch (error) {
        console.error(`[DualSubtitles] Ошибка загрузки субтитров для ${lang}:`, error);
      }
    }

    return subtitlesData;
  }

  // Функция для парсинга VTT-файла
  function parseVTT(vttText, lang) {
    const lines = vttText.split('\n');
    const cues = [];
    let currentCue = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Пропускаем пустые строки и заголовок WEBVTT
      if (!line || line === 'WEBVTT') continue;

      // Проверяем, содержит ли строка временной диапазон (00:00:00.000 --> 00:00:00.000)
      if (line.includes('-->')) {
        const timeData = line.split('-->');
        const startTime = parseTimeToSeconds(timeData[0].trim());
        const endTime = parseTimeToSeconds(timeData[1].trim());

        currentCue = {
          startTime,
          endTime,
          text: '',
          lang
        };
        cues.push(currentCue);
      } else if (currentCue) {
        // Добавляем текст к текущему cue, удаляя числа в конце строки
        const cleanedLine = line.replace(/\d+\s*$/, '').trim();
        if (cleanedLine) {
          if (currentCue.text) {
            currentCue.text += ' ' + cleanedLine;
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
    const parts = timeString.split(':');
    let seconds = 0;

    if (parts.length === 3) {
      // Формат HH:MM:SS.mmm
      seconds = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      // Формат MM:SS.mmm
      seconds = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }

    return seconds;
  }

  // Улучшенная функция для отключения встроенных субтитров
  function disableNativeSubtitles(video) {
    // 1. Отключаем все текстовые дорожки через API video.textTracks
    if (video.textTracks && video.textTracks.length > 0) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = "disabled";
      }
    }

    // 2. Удаляем все элементы track
    const trackElements = video.querySelectorAll("track");
    trackElements.forEach(track => {
      track.remove();
    });

    // 3. Отключаем через имеющиеся API плеера
    try {
      // Отключение через глобальный player
      if (typeof(player) !== 'undefined') {
        if (player.subtitle) player.subtitle.disable();
        // Дополнительные пути отключения
        if (player.subtitles) player.subtitles.disable();
      }

      // Отключение через CDNPlayer
      if (typeof(CDNPlayer) !== 'undefined') {
        if (CDNPlayer.subtitle) CDNPlayer.subtitle.disable();
        // Дополнительные пути отключения
        if (CDNPlayer.subtitles) CDNPlayer.subtitles.disable();
      }
    } catch (e) {
      console.log("[DualSubtitles] Ошибка при отключении через API плеера:", e);
    }

    // 4. Имитация клика по кнопке отключения субтитров
    try {
      const subtitleSelectors = document.querySelectorAll('.subtitle-select, .cdn-selector-subtitle, .cdnplayer-subtitles-menu');
      subtitleSelectors.forEach(selector => {
        if (selector) {
          const offOption = selector.querySelector('li[data-subtitle="off"]');
          if (offOption) {
            // Симулируем клик для выключения субтитров
            offOption.click();
          }
        }
      });

      // Дополнительно ищем кнопки субтитров в плеере
      const subtitleButtons = document.querySelectorAll('.vjs-subs-caps-button, .subtitles-button, .vjs-subtitles-button');
      subtitleButtons.forEach(button => {
        // Проверяем, не является ли кнопка уже активной для отключения
        if (button && !button.classList.contains('subtitles-disabled')) {
          button.click(); // Кликаем для вызова меню
          // Ищем опцию отключения субтитров в выпадающем меню
          setTimeout(() => {
            const offOptions = document.querySelectorAll('.vjs-menu-item[data-subtitle="off"], .subtitles-item[data-subtitle="off"]');
            offOptions.forEach(option => option.click());
          }, 50);
        }
      });
    } catch (e) {
      console.log("[DualSubtitles] Ошибка при клике по кнопке отключения:", e);
    }

    // 5. Скрытие видимых элементов субтитров через CSS
    const subtitleElements = [
      '.b-simple_text_decor__subtitle',
      '.text-subtitle',
      '.subtitles-container',
      '.vjs-text-track-display',
      '.vjs-text-track',
      '.vjs-text-track-cue',
      '#oframecdnplayer > pjsdiv[style*="bottom: 50px"]:not(.multi-subtitle-container):not(.subtitle-overlay-container)',
      '.pjsdiv.subtitles'
    ];

    subtitleElements.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
      });
    });

    // 6. Удаляем возможные контейнеры субтитров, созданные плеером
    document.querySelectorAll('pjsdiv').forEach(el => {
      // Проверяем, похож ли элемент на контейнер субтитров (по стилям)
      if (el.style &&
          (el.style.bottom === '50px' || el.style.bottom === '40px') &&
          !el.classList.contains('subtitle-overlay-container') &&
          !el.classList.contains('multi-subtitle-container')) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
      }
    });

    // 7. Добавляем MutationObserver для отслеживания динамически созданных элементов субтитров
    const playerContainer = document.getElementById('oframecdnplayer') || video.parentElement;
    if (playerContainer && !playerContainer._subtitleObserverAdded) {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          // Если добавлены новые узлы
          if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(node => {
              // Проверяем, является ли узел элементом с субтитрами
              if (node.nodeType === 1) { // Элемент
                // Проверка по классам
                if (node.classList &&
                    (node.classList.contains('subtitles') ||
                     node.classList.contains('text-subtitle') ||
                     node.classList.contains('b-simple_text_decor__subtitle'))) {
                  node.style.display = 'none';
                  node.style.visibility = 'hidden';
                }

                // Проверка по позиции и отсутствию наших классов
                if (node.style &&
                    (node.style.bottom === '50px' || node.style.bottom === '40px') &&
                    !node.classList.contains('subtitle-overlay-container') &&
                    !node.classList.contains('multi-subtitle-container')) {
                  node.style.display = 'none';
                  node.style.visibility = 'hidden';
                }
              }
            });
          }
        });
      });

      observer.observe(playerContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });

      playerContainer._subtitleObserverAdded = true;
    }

    console.log("[DualSubtitles] Нативные субтитры отключены");
  }

  // Функция для включения контекстного меню на субтитрах
  function enableContextMenu(playerElement) {
    if (contextMenuEnabled) return;

    // Обработчик правого клика на основном плеере
    playerElement.addEventListener('contextmenu', function(e) {
      // Проверяем, был ли правый клик на элементе субтитров
      let path = e.composedPath();
      for (const element of path) {
        if (element.classList &&
           (element.classList.contains('subtitle-overlay-container') ||
            element.classList.contains('subtitle-text') ||
            element.classList.contains('subtitle-span'))) {
          // Разрешаем стандартное контекстное меню браузера
          e.stopPropagation();
          return true;
        }
      }
    }, true);

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
    const parent = document.getElementById("oframecdnplayer") || video.parentElement;
    if (!parent) return;

    // Удаляем старые оверлеи, если есть
    document.querySelectorAll('.subtitle-overlay-container').forEach(el => {
      el.remove();
    });

    // Создаем оверлеи для каждого языка
    const overlays = {};

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

    // Запускаем функцию обновления субтитров при воспроизведении
    video.addEventListener("timeupdate", () => {
      updateSubtitles(video.currentTime, overlays);
    });

    // Следим за изменением fullscreen режима
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    console.log("[DualSubtitles] Отображение субтитров настроено успешно.");

    // Функция обработки изменения fullscreen режима
    function handleFullscreenChange() {
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
      console.log("[DualSubtitles] Изменение режима fullscreen:", isFullscreen);

      // Текущий контейнер для размещения оверлеев
      const currentContainer = document.fullscreenElement || document.webkitFullscreenElement || parent;

      // Перемещаем оверлеи в текущий контейнер
      for (const lang in overlays) {
        const overlay = overlays[lang];
        if (overlay && overlay.parentNode !== currentContainer) {
          overlay.remove();
          currentContainer.appendChild(overlay);
        }
      }

      // После смены режима снова отключаем нативные субтитры и переактивируем контекстное меню
      setTimeout(() => {
        disableNativeSubtitles(video);
        enableContextMenu(currentContainer);
      }, 100);
    }
  }

  // Обновляет субтитры на основе текущего времени видео
  function updateSubtitles(currentTime, overlays) {
    for (const lang in subtitlesData) {
      const cues = subtitlesData[lang];
      const overlay = overlays[lang];

      // Находим активные субтитры для текущего времени
      const activeCue = cues.find(cue =>
        currentTime >= cue.startTime && currentTime <= cue.endTime
      );

      if (activeCue && overlay) {
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
      } else if (overlay) {
        overlay.innerHTML = "";
      }
    }
  }

  // Очистка при unload страницы
  window.addEventListener("unload", () => {
    if (disableCheckInterval) {
      clearInterval(disableCheckInterval);
    }
  });
})();