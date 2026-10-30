"use strict";

/* Login screen: shown when the site is first opened.
   Preview only - nothing typed is stored or sent. A successful login (or
   "Continue as guest") reveals the whole website for this browser session. */
(function () {
  const gate = document.getElementById("introGate");
  if (!gate) return;

  try {
    if (sessionStorage.getItem("blackspireEntered") === "1") {
      gate.remove();
      return;
    }
  } catch (e) {}

  document.body.classList.add("intro-lock");
  const form = document.getElementById("loginForm");
  const email = document.getElementById("loginEmail");
  const pass = document.getElementById("loginPass");
  const error = document.getElementById("loginError");
  const guest = document.getElementById("loginGuest");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  setTimeout(() => email.focus({ preventScroll: true }), reduce ? 0 : 2300);

  function enter() {
    try {
      sessionStorage.setItem("blackspireEntered", "1");
    } catch (e) {}
    gate.classList.add("leaving");
    document.body.classList.remove("intro-lock");
    setTimeout(() => gate.remove(), reduce ? 0 : 700);
    window.scrollTo(0, 0);
  }

  function fail(message, field) {
    error.textContent = message;
    field.setAttribute("aria-invalid", "true");
    field.focus();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    email.removeAttribute("aria-invalid");
    pass.removeAttribute("aria-invalid");
    error.textContent = "";
    const value = email.value.trim();
    if (!value) return fail("Enter your email address.", email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return fail("Enter a valid email, like you@example.com.", email);
    if (!pass.value) return fail("Enter your password.", pass);
    enter();
  });

  guest.addEventListener("click", enter);
})();
