(function () {
  "use strict";

  var WRAPPER_SELECTOR = '.wrapper-main[data-wisal-contract="2"]';
  var ISO_PATTERN =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;

  function getDateOwner(wrapper) {
    return wrapper.querySelector("[data-event-date]");
  }

  function canonicalize(value) {
    var text = String(value || "").trim();
    var slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);

    if (slash) {
      var month = ("0" + slash[1]).slice(-2);
      var day = ("0" + slash[2]).slice(-2);
      var hour = ("0" + (slash[4] || "20")).slice(-2);
      var minute = slash[5] || "00";
      text = slash[3] + "-" + month + "-" + day + "T" + hour + ":" + minute + ":00";
    }

    text = text.replace(/^(\d{4}-\d{2}-\d{2})[ ](\d{2}:\d{2})/, "$1T$2");
    text = text.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      text += "T20:00:00";
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
      text += ":00";
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(text)) {
      text += "+03:00";
    }

    return text;
  }

  function parseEventDate(value) {
    if (value == null) {
      return null;
    }

    value = canonicalize(value);

    var match = value.match(ISO_PATTERN);
    if (!match) {
      return null;
    }

    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var hour = Number(match[4]);
    var minute = Number(match[5]);
    var second = Number(match[6] || 0);
    var fraction = match[7] || "";
    var timezone = match[8];

    if (
      month < 1 || month > 12 ||
      day < 1 || day > 31 ||
      hour > 23 ||
      minute > 59 ||
      second > 59
    ) {
      return null;
    }

    var milliseconds = Number((fraction + "000").slice(0, 3));
    var wallClockDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second, milliseconds));

    if (
      wallClockDate.getUTCFullYear() !== year ||
      wallClockDate.getUTCMonth() !== month - 1 ||
      wallClockDate.getUTCDate() !== day
    ) {
      return null;
    }

    var offsetMinutes = 0;
    if (timezone !== "Z") {
      var offsetMatch = timezone.match(/^([+-])(\d{2}):(\d{2})$/);
      if (!offsetMatch) {
        return null;
      }
      var offsetHours = Number(offsetMatch[2]);
      var offsetRemainder = Number(offsetMatch[3]);
      if (
        offsetHours > 14 ||
        offsetRemainder > 59 ||
        (offsetHours === 14 && offsetRemainder !== 0)
      ) {
        return null;
      }
      offsetMinutes = offsetHours * 60 + offsetRemainder;
      if (offsetMatch[1] === "-") {
        offsetMinutes *= -1;
      }
    }

    return wallClockDate.getTime() - offsetMinutes * 60 * 1000;
  }

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function partsFromRemaining(remaining) {
    if (remaining <= 0) {
      return { days: "0", hours: "00", minutes: "00", seconds: "00" };
    }
    var total = Math.floor(remaining / 1000);
    var days = Math.floor(total / 86400);
    var hours = Math.floor((total % 86400) / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    var seconds = total % 60;
    return {
      days: String(days),
      hours: pad(hours),
      minutes: pad(minutes),
      seconds: pad(seconds)
    };
  }

  function render(owner, parts) {
    ["days", "hours", "minutes", "seconds"].forEach(function (unit) {
      var node = owner.querySelector('[data-countdown="' + unit + '"]');
      if (node && node.textContent !== parts[unit]) {
        node.textContent = parts[unit];
      }
    });
  }

  function readTimestamp(wrapper, preferred) {
    var preferredTimestamp = parseEventDate(preferred);
    if (preferredTimestamp !== null) {
      return preferredTimestamp;
    }

    var countdown = wrapper.querySelector(".countdown-wrapper");
    var stored = countdown && parseEventDate(countdown.getAttribute("data-event-date"));
    if (stored !== null) {
      return stored;
    }

    var fromWrapper = parseEventDate(wrapper.getAttribute("data-event-date"));
    if (fromWrapper !== null) {
      return fromWrapper;
    }

    var nodes = wrapper.querySelectorAll("[data-event-date]");
    for (var index = 0; index < nodes.length; index += 1) {
      var parsed = parseEventDate(nodes[index].getAttribute("data-event-date"));
      if (parsed !== null) {
        return parsed;
      }
    }

    return null;
  }

  function watch(wrapper) {
    function tick() {
      var liveCountdown = wrapper.querySelector(".countdown-wrapper");
      if (!liveCountdown) {
        return;
      }
      var timestamp = readTimestamp(wrapper, liveCountdown.getAttribute("data-event-date"));
      render(liveCountdown, partsFromRemaining(timestamp === null ? 0 : timestamp - Date.now()));
    }

    tick();
    window.setInterval(tick, 1000);

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.attributeName === "data-event-date") {
          tick();
        }
      });
    });

    observer.observe(wrapper, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-event-date"]
    });
  }

  function initialize() {
    document.querySelectorAll(WRAPPER_SELECTOR).forEach(watch);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
