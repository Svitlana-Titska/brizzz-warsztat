(() => {
  const mount = document.getElementById("dynamic-approved-reviews");
  if (!mount) return;

  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };

  async function loadApprovedReviews() {
    try {
      const response = await fetch("/.netlify/functions/reviews", { headers: { Accept: "application/json" } });
      if (!response.ok) return;
      const result = await response.json();
      (result.reviews || []).forEach((review) => {
        const card = make("article", undefined, "published-review");
        card.style.cssText = "margin-top:22px;padding:20px;border:1px solid #34373b;border-radius:12px;background:#101113";

        const stars = make("div", "★".repeat(Math.max(1, Math.min(5, Number(review.rating) || 5))));
        stars.style.cssText = "color:var(--orange);font-size:22px;letter-spacing:3px";
        stars.setAttribute("aria-label", `Ocena ${review.rating} na 5`);

        const message = make("p", `„${review.review_text}”`);
        message.style.cssText = "margin:10px 0;color:var(--text);white-space:pre-wrap";
        const name = make("div", review.name);
        name.style.fontWeight = "700";
        const service = make("div", review.service || "");
        service.style.cssText = "font-size:13px;color:var(--muted);margin-top:3px";

        card.append(stars, message, name, service);
        if (review.reply) {
          const replyBox = make("div");
          replyBox.style.cssText = "margin-top:14px;padding:12px;background:#252628;border-radius:8px";
          const title = make("strong", "Odpowiedź warsztatu");
          const reply = make("p", review.reply);
          reply.style.margin = "8px 0 0";
          replyBox.append(title, reply);
          card.append(replyBox);
        }
        mount.append(card);
      });
    } catch (error) {
      console.error("Could not load approved reviews:", error);
    }
  }

  loadApprovedReviews();
})();
