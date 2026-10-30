"use strict";

/* Contact form: sends the enquiry to the server (server.js), which saves it
   as a new row in data/enquiries.xlsx. */
const form = document.getElementById("contactForm");
const message = document.getElementById("formMessage");
const submitBtn = form.querySelector('button[type="submit"]');

// contact.html?venture=reviveev pre-selects the venture being asked about
const venture = new URLSearchParams(location.search).get("venture");
if (venture) {
  form.elements.venture_id.value = venture;
  document.getElementById("ventureHint").textContent = "Enquiry about: " + venture;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  // Spam trap: real visitors never fill the hidden field
  if (form.elements.website.value) return;

  const payload = {
    name: form.elements.name.value,
    email: form.elements.email.value,
    topic: form.elements.topic.value,
    message: form.elements.message.value,
    venture_id: form.elements.venture_id.value,
    website: form.elements.website.value,
  };

  submitBtn.disabled = true;
  message.textContent = "Sending…";
  try {
    const res = await fetch("/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "Server error");
    message.textContent = "Thank you. Your enquiry has been received and we will reply soon.";
    form.reset();
    if (venture) form.elements.venture_id.value = venture;
  } catch (err) {
    message.textContent =
      "Sorry, we could not send your enquiry. " +
      (err.message && err.message !== "Failed to fetch" ? err.message : "Please make sure the site is running with “npm start”, then try again.");
  } finally {
    submitBtn.disabled = false;
  }
});
