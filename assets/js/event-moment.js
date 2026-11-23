(function () {
  "use strict";

  var WRAPPER_SELECTOR = '.wrapper-main[data-wisal-contract="2"]';
  var TARGET_SELECTOR = "[data-event-moment]";
  var ISO_PATTERN =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;

  var WEEKDAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  var WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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

    return {
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      second: second,
      milliseconds: milliseconds,
      offsetMinutes: offsetMinutes,
      timestamp: wallClockDate.getTime() - offsetMinutes * 60 * 1000
    };
  }

  function getLanguage(wrapper) {
    var languageOwner = wrapper.closest("[lang]") || document.documentElement;
    var language = (languageOwner.getAttribute("lang") || "en").toLowerCase();
    return language.indexOf("ar") === 0 ? "ar" : "en";
  }

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function weekdayIndex(eventDate) {
    return new Date(Date.UTC(eventDate.year, eventDate.month - 1, eventDate.day)).getUTCDay();
  }

  function formatWeekday(eventDate, language) {
    var index = weekdayIndex(eventDate);
    if (language === "ar") {
      return "يوم " + WEEKDAYS_AR[index];
    }
    return WEEKDAYS_EN[index];
  }

  function formatMonth(eventDate) {
    return MONTHS_EN[eventDate.month - 1];
  }

  function formatNumeric(eventDate) {
    return pad(eventDate.day) + "." + pad(eventDate.month) + "." + eventDate.year;
  }

  function formatClock(eventDate) {
    var hour = eventDate.hour % 12;
    if (hour === 0) {
      hour = 12;
    }
    return pad(hour) + ":" + pad(eventDate.minute);
  }

  function formatPeriod(eventDate) {
    return eventDate.hour >= 12 ? "مساءً" : "صباحًا";
  }

  function formatMoment(target, eventDate, language) {
    if (target.classList.contains("moment-weekday")) {
      return formatWeekday(eventDate, language);
    }
    if (target.classList.contains("moment-month")) {
      return formatMonth(eventDate);
    }
    if (target.classList.contains("moment-year")) {
      return String(eventDate.year);
    }
    if (target.classList.contains("moment-period")) {
      return formatPeriod(eventDate);
    }
    if (target.classList.contains("moment-numeric")) {
      return formatNumeric(eventDate);
    }
    if (target.classList.contains("moment-clock")) {
      return formatClock(eventDate);
    }

    var type = target.getAttribute("data-event-moment");
    if (type === "date") {
      return formatNumeric(eventDate);
    }
    if (type === "time") {
      return formatClock(eventDate);
    }
    if (type === "date-time") {
      return formatNumeric(eventDate) + " " + formatClock(eventDate);
    }
    return null;
  }

  function isTyping(element) {
    return element.classList.contains("is-typing");
  }

  function updateTarget(target, eventDate, language) {
    if (!target || isTyping(target)) {
      return;
    }
    var formattedValue = formatMoment(target, eventDate, language);
    if (formattedValue === null) {
      return;
    }
    if (normalize(target.textContent) !== normalize(formattedValue)) {
      target.textContent = formattedValue;
    }
  }

  // Authored text may carry decorative kashida or casing; only rewrite when the value differs.
  function normalize(value) {
    return String(value).replace(/[\u0640\s]/g, "").toLowerCase();
  }

  function markCalendar(wrapper, eventDate) {
    var calendar = wrapper.querySelector("[data-calendar-month]");
    if (!calendar) {
      return;
    }
    var first = new Date(Date.UTC(eventDate.year, eventDate.month - 1, 1));
    var leading = first.getUTCDay();
    var daysInMonth = new Date(Date.UTC(eventDate.year, eventDate.month, 0)).getUTCDate();
    calendar.setAttribute("data-calendar-month", String(eventDate.month));
    calendar.setAttribute("data-calendar-year", String(eventDate.year));
    calendar.classList.toggle("is-six-weeks", leading + daysInMonth > 35);
    calendar.querySelectorAll("[data-day]").forEach(function (day) {
      var number = Number(day.getAttribute("data-day"));
      day.hidden = number > daysInMonth;
      day.classList.toggle("is-chosen", number === eventDate.day);
      if (number === 1) {
        day.style.gridColumnStart = String(leading + 1);
      }
    });
  }

  function readEventValue(wrapper, preferred) {
    var preferredDate = parseEventDate(preferred);
    if (preferredDate) {
      return preferredDate;
    }

    var countdown = wrapper.querySelector(".countdown-wrapper");
    var stored = countdown && countdown.getAttribute("data-event-date");
    var fromCountdown = parseEventDate(stored);
    if (fromCountdown) {
      return fromCountdown;
    }

    var fromWrapper = parseEventDate(wrapper.getAttribute("data-event-date"));
    if (fromWrapper) {
      return fromWrapper;
    }

    var nodes = wrapper.querySelectorAll("[data-event-date]");
    for (var index = 0; index < nodes.length; index += 1) {
      var parsed = parseEventDate(nodes[index].getAttribute("data-event-date"));
      if (parsed) {
        return parsed;
      }
    }

    return null;
  }

  function syncWrapper(wrapper, preferred) {
    if (!wrapper) {
      return;
    }
    if (parseEventDate(preferred)) {
      wrapper.__wisalEventDate = preferred;
    }
    var eventDate = readEventValue(wrapper, wrapper.__wisalEventDate || preferred);
    if (!eventDate) {
      return;
    }
    var language = getLanguage(wrapper);
    wrapper.querySelectorAll(TARGET_SELECTOR).forEach(function (target) {
      updateTarget(target, eventDate, language);
    });
    markCalendar(wrapper, eventDate);
  }

  function initialize() {
    var wrappers = document.querySelectorAll(WRAPPER_SELECTOR);

    wrappers.forEach(function (wrapper) {
      syncWrapper(wrapper);

      var typingObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          var target = mutation.target;
          if (target.nodeType === 1 && target.matches(TARGET_SELECTOR) && !isTyping(target)) {
            syncWrapper(wrapper);
          }
        });
      });

      typingObserver.observe(wrapper, {
        subtree: true,
        attributes: true,
        attributeFilter: ["class"]
      });

      var dateObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.attributeName === "data-event-date") {
            syncWrapper(wrapper, mutation.target.getAttribute("data-event-date"));
          }
        });
      });

      dateObserver.observe(wrapper, {
        subtree: true,
        attributes: true,
        attributeFilter: ["data-event-date"]
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
