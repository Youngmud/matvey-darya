/* Конверт, отсчёт и анкета. Дата церемонии — 8 июля 2027, 17:00. */
(function () {
  "use strict";

  var WEDDING_ISO = "2027-07-08T17:00:00";
  /* Адрес приёма анкет. Токен бота здесь не хранится. */
  var RSVP_URL = "https://brylevs-rsvp.andrew-mudrov.workers.dev/rsvp";

  var gate = document.getElementById("gate");
  var invitation = document.getElementById("invitation");

  if (gate && invitation) {
    gate.addEventListener("click", openLetter);
  }

  function openLetter() {
    if (gate.classList.contains("is-opening")) return;
    gate.classList.add("is-opening");
    window.setTimeout(function () {
      invitation.hidden = false;
      gate.hidden = true;
      document.documentElement.classList.add("is-open");
      initReveal();
      initProgress();
      window.scrollTo(0, 0);
    }, 900);
  }

  initCountdown();
  initForm();

  function initReveal() {
    var nodes = invitation.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (node) { node.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    nodes.forEach(function (node) { observer.observe(node); });
  }

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
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(paint);
    }, { passive: true });
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

  function pad(value) { return value < 10 ? "0" + value : String(value); }

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

  function initForm() {
    var form = document.getElementById("rsvp-form");
    var error = document.getElementById("form-error");
    var thanks = document.getElementById("thanks");
    var companionWrap = document.getElementById("companion-field");
    if (!form || !thanks) return;
    var companion = form.elements.companion;

    form.addEventListener("change", function (event) {
      if (!event.target || event.target.name !== "pair") return;
      var withPair = form.elements.pair.value === "yes";
      companionWrap.hidden = !withPair;
      companion.required = withPair;
      if (!withPair) companion.value = "";
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearError();
      var data = new FormData(form);
      var name = String(data.get("name") || "").trim();
      var attend = String(data.get("attend") || "");
      var pair = String(data.get("pair") || "");
      var companionName = String(data.get("companion") || "").trim();

      if (!name) return showError("Напишите, пожалуйста, имя и фамилию.", form.elements.name);
      if (attend !== "yes" && attend !== "no") return showError("Отметьте, будете ли вы с нами.", form.querySelector("[name=attend]"));
      if (pair !== "yes" && pair !== "no") return showError("Отметьте, будете ли вы с парой.", form.querySelector("[name=pair]"));
      if (pair === "yes" && !companionName) return showError("Напишите имя сопровождающего.", companion);

      var payload = {
        name: name,
        attend: attend,
        pair: pair,
        companion: pair === "yes" ? companionName : ""
      };

      send(payload).then(function () {
        form.hidden = true;
        thanks.hidden = false;
        thanks.focus();
      }).catch(function () {
        showError("Не удалось отправить ответ. Попробуйте ещё раз через минуту.");
      });
    });

    function send(payload) {
      if (!RSVP_URL) return Promise.resolve();
      return fetch(RSVP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (response) {
        if (!response.ok) throw new Error("rsvp");
      });
    }

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
