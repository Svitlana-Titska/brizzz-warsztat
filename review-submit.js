(() => {
  const form = document.getElementById("review-form");
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const status = document.createElement("p");
  status.className = "review-note";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.hidden = true;
  submitButton.insertAdjacentElement("afterend", status);

  let sending = false;

  form.addEventListener("submit", async (event) => {
    if (form.dataset.netlifyForwarding === "true") return;
    event.preventDefault();
    if (sending) return;

    const selectedRating = form.querySelector('input[name="ocena"]:checked');
    const consent = form.querySelector('input[name="zgoda-na-publikacje"]');
    const name = form.elements.imie.value.trim();
    const service = form.elements.usluga.value.trim() || "Inna usługa";
    const reviewText = form.elements.opinia.value.trim();

    if (!selectedRating || !consent?.checked) {
      form.reportValidity();
      return;
    }

    const rating = Number.parseInt(selectedRating.value, 10);
    sending = true;
    submitButton.disabled = true;
    status.hidden = false;
    status.textContent = "Wysyłanie opinii…";

    try {
      const response = await fetch("/.netlify/functions/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          service,
          rating,
          review_text: reviewText,
          consent: consent.checked,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.error || "Nie udało się wysłać opinii. Spróbuj ponownie.",
        );
      }

      // Submit the same form to Netlify Forms so the existing email notification remains active.
      form.dataset.netlifyForwarding = "true";
      HTMLFormElement.prototype.submit.call(form);
    } catch (error) {
      console.error("Supabase review save failed:", error);

      // Supabase failed — still forward the review to Netlify Forms.
      // This keeps the existing email notification working.
      status.textContent = "Wysyłanie opinii…";

      form.dataset.netlifyForwarding = "true";
      HTMLFormElement.prototype.submit.call(form);
    }
  });
})();
