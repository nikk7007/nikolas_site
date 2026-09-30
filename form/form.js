// Briefing — passo a passo, salva no aparelho, manda markdown pro api/send.php.
(function () {
  var form = document.getElementById("briefing");
  var steps = [].slice.call(form.querySelectorAll(".bf-step"));
  var nextBtn = document.getElementById("next");
  var backBtn = document.getElementById("back");
  var label = document.getElementById("step-label");
  var bar = document.querySelector(".bf-progress span");
  var statusEl = document.getElementById("status");
  var STORE = "briefing-v2";
  var cur = 0;

  // ---------- máscara do WhatsApp ----------
  var phone = form.querySelector("[data-phone]");
  var phoneMask = null;
  if (window.IMask) {
    phoneMask = IMask(phone, {
      mask: [{ mask: "(00) 0000-0000" }, { mask: "(00) 00000-0000" }], // fixo ou celular
    });
  }
  var digits = function (v) { return (v || "").replace(/\D/g, ""); };

  // ---------- validação ----------
  function problem(el) {
    var v = el.value.trim();
    if (el.required && !v) return el.dataset.err;
    if (el.hasAttribute("data-phone") && v && digits(v).length < 10) return el.dataset.err;
    if (el.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return el.dataset.err;
    return "";
  }

  function showError(el, msg) {
    var id = el.id + "-err";
    var box = document.getElementById(id);
    if (!msg) {
      el.removeAttribute("aria-invalid");
      if (box) box.remove();
      return;
    }
    el.setAttribute("aria-invalid", "true");
    if (!box) {
      box = document.createElement("p");
      box.className = "bf-err";
      box.id = id;
      el.insertAdjacentElement("afterend", box);
      el.setAttribute("aria-describedby", id);
    }
    box.textContent = msg;
  }

  function validateStep(i) {
    var first = null;
    steps[i].querySelectorAll("input[required], textarea[required], input[type=email], [data-phone]")
      .forEach(function (el) {
        var msg = problem(el);
        showError(el, msg);
        if (msg && !first) first = el;
      });
    if (first) first.focus();
    return !first;
  }

  // valida ao sair do campo; limpa o erro assim que o texto fica certo
  form.addEventListener("focusout", function (e) {
    var el = e.target;
    if (el.matches("input[required], textarea[required], input[type=email], [data-phone]")) {
      showError(el, problem(el));
    }
  });
  form.addEventListener("input", function (e) {
    if (e.target.getAttribute("aria-invalid") === "true" && !problem(e.target)) showError(e.target, "");
  });

  // ---------- campos condicionais e "nada disso" exclusivo ----------
  function refreshConditionals() {
    form.querySelectorAll("[data-show-if]").forEach(function (el) {
      var parts = el.dataset.showIf.split("=");
      var checked = form.querySelector('input[name="' + parts[0] + '"]:checked');
      el.hidden = !(checked && checked.value === parts[1]);
    });
  }

  form.addEventListener("change", function (e) {
    var el = e.target;
    if (el.name === "recursos" && el.checked) {
      form.querySelectorAll('input[name="recursos"]').forEach(function (o) {
        if (o !== el && (el.hasAttribute("data-exclusive") || o.hasAttribute("data-exclusive"))) o.checked = false;
      });
    }
    refreshConditionals();
  });

  // ---------- salvar no aparelho ----------
  function values() {
    var out = {};
    new FormData(form).forEach(function (v, k) {
      if (k === "website") return;
      if (k === "recursos") (out[k] = out[k] || []).push(v);
      else out[k] = v;
    });
    return out;
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ step: cur, data: values() })); } catch (e) { /* modo privado */ }
  }

  function restore() {
    var saved;
    try { saved = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { saved = null; }
    if (!saved || !saved.data) return 0;
    Object.keys(saved.data).forEach(function (k) {
      var v = saved.data[k];
      var els = form.querySelectorAll('[name="' + k + '"]');
      els.forEach(function (el) {
        if (el.type === "radio") el.checked = el.value === v;
        else if (el.type === "checkbox") el.checked = [].concat(v).indexOf(el.value) !== -1;
        else el.value = v;
      });
    });
    if (phoneMask) phoneMask.updateValue();
    return Math.min(saved.step || 0, steps.length - 1);
  }

  form.addEventListener("input", save);
  form.addEventListener("change", save);

  // ---------- navegação ----------
  function show(i, focus) {
    cur = i;
    steps.forEach(function (s, n) { s.hidden = n !== i; });
    var last = i === steps.length - 1;
    nextBtn.querySelector(".btn-text").textContent = last ? "Enviar" : "Continuar";
    backBtn.hidden = i === 0;
    label.textContent = "Passo " + (i + 1) + " de " + steps.length;
    bar.style.transform = "scaleX(" + (i + 1) / steps.length + ")";
    statusEl.hidden = true;
    save();
    if (focus) {
      label.scrollIntoView({ block: "start", behavior: "smooth" });
      // foco no título do passo: leitor de tela anuncia, e o teclado do celular não abre sozinho
      var legend = steps[i].querySelector("legend");
      legend.tabIndex = -1;
      legend.focus({ preventScroll: true });
    }
  }

  backBtn.addEventListener("click", function () { if (cur > 0) show(cur - 1, true); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateStep(cur)) return;
    if (cur < steps.length - 1) return show(cur + 1, true);
    send();
  });

  // ---------- envio ----------
  function line(txt, v) { return txt + ": " + (v && String(v).trim() ? v : "—"); }

  function markdown(d) {
    var semFotos = d.fotos === "Não tenho" && d.semFotos ? " (" + d.semFotos + ")" : "";
    var prazo = d.prazo === "Tenho uma data" && d.prazoData ? "Tenho uma data: " + d.prazoData : d.prazo;
    var acao = d.acao === "Ir pra outra página" && d.acaoLink ? d.acao + " (" + d.acaoLink + ")" : d.acao;
    return [
      "# Briefing",
      "",
      "## 1. Sobre você",
      line("Nome", d.nome), line("WhatsApp", d.whatsapp), line("E-mail", d.email),
      line("Instagram", d.instagram), line("Site atual", d.siteAtual),
      "",
      "## 2. Seu negócio",
      line("O que faz", d.negocio), line("Cliente", d.cliente), line("Diferencial", d.diferencial),
      "",
      "## 3. O site",
      line("O que falta hoje", d.falta), line("Ação principal", acao),
      line("Recursos", (d.recursos || []).join(", ")),
      "",
      "## 4. O que já tem",
      line("Logo", d.logo), line("Fotos", (d.fotos || "") + semFotos),
      line("E-mail com o nome do negócio", d.emailPro), line("Sites de referência", d.referencias),
      "",
      "## 5. Prazo",
      line("Prazo", prazo), line("Faixa de investimento", d.orcamento), line("Decisão", d.decisao),
      "",
    ].join("\n");
  }

  function send() {
    var d = values();
    nextBtn.disabled = true;
    nextBtn.querySelector(".btn-text").textContent = "Enviando…";
    statusEl.hidden = true;

    fetch("api/send.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "Briefing — " + (d.negocio || d.nome || "sem nome"),
        markdown: markdown(d),
        replyTo: d.email || "",
        website: form.elements.website.value,
      }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && j.ok; }); })
      .catch(function () { return false; })
      .then(function (ok) {
        nextBtn.disabled = false;
        nextBtn.querySelector(".btn-text").textContent = "Enviar";
        if (!ok) {
          statusEl.className = "bf-status is-error";
          statusEl.textContent = "Não consegui enviar agora. Tenta de novo em instantes, ou me chama no WhatsApp: suas respostas continuam salvas aqui.";
          statusEl.hidden = false;
          return;
        }
        try { localStorage.removeItem(STORE); } catch (e) { /* ignora */ }
        done(d);
      });
  }

  function done(d) {
    form.hidden = true;
    document.querySelector(".bf-intro").hidden = true;
    document.querySelector(".bf-progress").hidden = true;
    label.hidden = true;
    var box = document.getElementById("done");
    document.getElementById("done-logo").hidden = d.logo !== "Sim";
    var msg = d.logo === "Sim"
      ? "Oi, Nikolas! Acabei de enviar o briefing" + (d.negocio ? " (" + d.negocio + ")" : "") + ". Segue a logo:"
      : "Oi, Nikolas! Acabei de enviar o briefing" + (d.negocio ? " (" + d.negocio + ")" : "") + ".";
    document.getElementById("done-wa").href = "https://wa.me/5519988284453?text=" + encodeURIComponent(msg);
    box.hidden = false;
    box.focus();
    window.scrollTo({ top: 0 });
  }

  // ---------- início ----------
  var start = restore();
  refreshConditionals();
  show(start, false);
})();
