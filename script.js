/* Поведение ленты: появление блоков, отсчёт, ответ на приглашение.
   Дату свадьбы меняйте здесь и в текстах index.html. */
(function () {
  "use strict";

  var WEDDING_ISO = "2027-07-08T15:00:00";

  initReveal();
  initProgress();
  initCountdown();
  initForm();

  /* Быстрый fade-in, когда блок входит в кадр */
  function initReveal() {
    var nodes = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (node) {
        node.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    nodes.forEach(function (node) {
      observer.observe(node);
    });
  }

  /* Линия сверху повторяет длину прокрученного свитка */
  function initProgress() {
    var bar = document.getElementById("progress");
    if (!bar) return;

    var ticking = false;

    function paint() {
      var scrollable = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      bar.style.transform = "scaleX(" + Math.min(1, Math.max(0, ratio)) + ")";
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(paint);
      },
      { passive: true }
    );

    paint();
  }

  function initCountdown() {
    var wedding = new Date(WEDDING_ISO);
    var daysEl = document.getElementById("cd-days");
    var hoursEl = document.getElementById("cd-hours");
    var minutesEl = document.getElementById("cd-minutes");
    var secondsEl = document.getElementById("cd-seconds");
    var grid = document.getElementById("countdown-grid");
    var note = document.getElementById("countdown-note");
    if (!daysEl || Number.isNaN(wedding.getTime())) return;

    function tick() {
      var diff = wedding.getTime() - Date.now();
      if (diff <= 0) {
        if (grid) grid.hidden = true;
        if (note) note.hidden = false;
        return;
      }

      var total = Math.floor(diff / 1000);
      var days = Math.floor(total / 86400);
      var hours = Math.floor((total % 86400) / 3600);
      var minutes = Math.floor((total % 3600) / 60);
      var seconds = total % 60;

      daysEl.textContent = String(days);
      hoursEl.textContent = pad(hours);
      minutesEl.textContent = pad(minutes);
      secondsEl.textContent = pad(seconds);

      setLabel("cd-days-label", days, "день", "дня", "дней");
      setLabel("cd-hours-label", hours, "час", "часа", "часов");
      setLabel("cd-minutes-label", minutes, "минута", "минуты", "минут");
      setLabel("cd-seconds-label", seconds, "секунда", "секунды", "секунд");
    }

    tick();
    window.setInterval(tick, 1000);
  }

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function setLabel(id, value, one, few, many) {
    var el = document.getElementById(id);
    if (el) el.textContent = plural(value, one, few, many);
  }

  function plural(value, one, few, many) {
    var n = Math.abs(value) % 100;
    var n1 = n % 10;
    if (n > 10 && n < 20) return many;
    if (n1 > 1 && n1 < 5) return few;
    if (n1 === 1) return one;
    return many;
  }

  /* Ответ остаётся на странице: сервера у статической ленты нет */
  function initForm() {
    var form = document.getElementById("rsvp-form");
    var error = document.getElementById("form-error");
    var thanks = document.getElementById("thanks");
    var thanksText = document.getElementById("thanks-text");
    if (!form || !thanks || !thanksText) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearError();

      var data = new FormData(form);
      var name = String(data.get("name") || "").trim();
      var guests = Number(data.get("guests"));
      var note = String(data.get("note") || "").trim();
      var nameInput = form.elements.name;

      if (!name) {
        showError("Напишите, пожалуйста, как вас представить.", nameInput);
        return;
      }

      if (!Number.isInteger(guests) || guests < 1 || guests > 8) {
        showError("Укажите число гостей от 1 до 8.", form.elements.guests);
        return;
      }

      var guestWord = plural(guests, "гость", "гостя", "гостей");
      var message = name + ", мы ждём вас. В ответе — " + guests + " " + guestWord + ".";
      if (note) message += " Спасибо за комментарий.";

      thanksText.textContent = message;
      form.hidden = true;
      thanks.hidden = false;
      thanks.focus();
    });

    function showError(message, field) {
      if (!error) return;
      error.hidden = false;
      error.textContent = message;
      if (field) {
        field.setAttribute("aria-invalid", "true");
        field.focus();
      }
    }

    function clearError() {
      if (error) {
        error.hidden = true;
        error.textContent = "";
      }
      Array.prototype.forEach.call(form.elements, function (field) {
        if (field.removeAttribute) field.removeAttribute("aria-invalid");
      });
    }
  }
})();
