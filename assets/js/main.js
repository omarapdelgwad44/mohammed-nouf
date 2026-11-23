(function () {
  "use strict";

  function setupGate() {
    var gate = document.getElementById("gate");
    var invitation = document.getElementById("invitation");
    var openButton = document.getElementById("open-invitation");

    if (!gate || !invitation || !openButton) {
      return;
    }

    invitation.inert = true;

    openButton.addEventListener("click", function () {
      document.body.classList.add("is-open");
      invitation.inert = false;
      gate.inert = true;
      window.scrollTo(0, 0);
    });
  }

  function setupMusic() {
    var music = document.getElementById("music");
    var toggle = document.getElementById("music-toggle");
    var stage = toggle ? toggle.closest(".stage") : null;

    if (!music || !toggle || !stage) {
      return;
    }

    function setPlaying(playing) {
      stage.classList.toggle("is-playing", playing);
      toggle.setAttribute("aria-pressed", playing ? "true" : "false");
    }

    var fileInput = document.getElementById("music-file");
    var chosen = false;

    function chooseSong() {
      if (fileInput) {
        fileInput.click();
      }
    }

    function playMusic() {
      var pending = music.play();
      if (pending && typeof pending.catch === "function") {
        pending.catch(function () {
          setPlaying(false);
          chooseSong();
        });
      }
    }

    toggle.addEventListener("click", function () {
      if (!chosen) {
        chooseSong();
        return;
      }
      if (!music.paused) {
        music.pause();
        return;
      }
      playMusic();
    });

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) {
          return;
        }
        if (music.dataset.objectUrl) {
          URL.revokeObjectURL(music.dataset.objectUrl);
        }
        var objectUrl = URL.createObjectURL(file);
        music.dataset.objectUrl = objectUrl;
        music.src = objectUrl;
        chosen = true;
        playMusic();
      });
    }

    document.querySelectorAll(".music-choose").forEach(function (caption) {
      caption.addEventListener("click", chooseSong);
    });

    music.addEventListener("play", function () {
      setPlaying(true);
    });

    music.addEventListener("pause", function () {
      setPlaying(false);
    });
  }

  function setupCalendar() {
    var picker = document.querySelector(".calendar-picker");
    var owner = document.querySelector("[data-event-date]");
    if (!picker || !owner) {
      return;
    }

    function datePart(value) {
      var match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : "";
    }

    function syncPicker() {
      var next = datePart(owner.getAttribute("data-event-date"));
      if (next && picker.value !== next) {
        picker.value = next;
      }
    }

    function openPicker() {
      if (typeof picker.showPicker !== "function") {
        picker.focus();
        return;
      }
      var pending = picker.showPicker();
      if (pending && typeof pending.catch === "function") {
        pending.catch(function () {
          picker.focus();
        });
      }
    }

    var frame = document.querySelector(".outline");
    var band = frame ? frame.closest(".band") : null;
    if (frame && band) {
      band.addEventListener("click", function (event) {
        var rect = frame.getBoundingClientRect();
        var inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        if (inside) {
          openPicker();
        }
      });
    }

    picker.addEventListener("change", function () {
      if (!picker.value) {
        return;
      }
      var current = owner.getAttribute("data-event-date") || "";
      var time = (current.match(/T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?/) || ["T20:00:00"])[0];
      if (/^T\d{2}:\d{2}$/.test(time)) {
        time += ":00";
      }
      var offset = (current.match(/(?:Z|[+-]\d{2}:\d{2})$/) || ["+03:00"])[0];
      var next = picker.value + time + offset;
      if (current !== next) {
        owner.setAttribute("data-event-date", next);
      }
    });

    new MutationObserver(syncPicker).observe(owner, {
      attributes: true,
      attributeFilter: ["data-event-date"]
    });
    syncPicker();
  }

  function setupMapPins() {
    var link = document.querySelector('[data-wisal-field="location.map_url"]');
    var pins = document.querySelector(".map-pins");

    if (!link || !pins) {
      return;
    }

    pins.addEventListener("click", function () {
      link.click();
    });
  }

  function setupRsvp() {
    var dialog = document.getElementById("rsvp-dialog");
    var openButton = document.getElementById("rsvp-open");
    var closeButton = document.getElementById("rsvp-close");

    if (!dialog || typeof dialog.showModal !== "function") {
      return;
    }

    if (openButton) {
      openButton.addEventListener("click", function () {
        dialog.showModal();
      });
    }

    if (closeButton) {
      closeButton.addEventListener("click", function () {
        dialog.close();
      });
    }

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  }

  function setupNameTextFit() {
    var values = document.querySelectorAll(".name-text__value");

    if (!values.length) {
      return;
    }

    function fit(value) {
      var wrapper = value.parentElement;

      if (!wrapper) {
        return;
      }

      value.style.setProperty("--fit", "1");

      var wrapperRect = wrapper.getBoundingClientRect();
      var wrapperStyle = getComputedStyle(wrapper);
      var valueStyle = getComputedStyle(value);
      var lineHeight = parseFloat(valueStyle.lineHeight) || 1;
      var scaleY = parseFloat(valueStyle.getPropertyValue("--name-sy")) || 1;
      var maxLines = parseInt(wrapperStyle.getPropertyValue("--name-lines"), 10) || 2;
      var valueRect = value.getBoundingClientRect();
      var scaledLineHeight = lineHeight * scaleY;
      var linesNeeded = Math.max(
        1,
        Math.ceil(valueRect.height / scaledLineHeight)
      );
      var hasWordBreak = /\s/.test(value.textContent.trim());
      var allowedLines = hasWordBreak
        ? Math.min(linesNeeded, maxLines)
        : 1;

      var previousWhiteSpace = value.style.whiteSpace;
      value.style.whiteSpace = "nowrap";

      var range = document.createRange();
      range.selectNodeContents(value);
      var nowrapWidth = range.getBoundingClientRect().width;

      if (typeof range.detach === "function") {
        range.detach();
      }

      value.style.whiteSpace = previousWhiteSpace;

      var factor = 1;

      if (nowrapWidth > 0) {
        factor = Math.min(
          factor,
          (wrapperRect.width * allowedLines * 0.96) / nowrapWidth
        );
      }

      if (scaledLineHeight > 0) {
        factor = Math.min(
          factor,
          wrapperRect.height / (scaledLineHeight * allowedLines)
        );
      }

      if (!isFinite(factor) || factor <= 0) {
        factor = 1;
      }

      value.style.setProperty("--fit", String(Math.min(1, factor)));
    }

    function fitAll() {
      values.forEach(fit);
    }

    values.forEach(function (value) {
      new MutationObserver(function () {
        fit(value);
      }).observe(value, {
        childList: true,
        characterData: true,
        subtree: true
      });
    });

    window.addEventListener("resize", fitAll);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitAll).catch(function () {
        fitAll();
      });
    }

    fitAll();
  }

  function initialize() {
    setupGate();
    setupMusic();
    setupCalendar();
    setupMapPins();
    setupRsvp();
    setupNameTextFit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
