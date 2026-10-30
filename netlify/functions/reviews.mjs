const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(body),
});

const getConfig = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase function environment variables");
  return { url: url.replace(/\/$/, ""), key };
};

export async function handler(event) {
  let config;
  try {
    config = getConfig();
  } catch (error) {
    console.error(error.message);
    return json(500, { error: "Review service is not configured." });
  }

  const headers = {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "GET") {
    try {
      const [reviewsResponse, repliesResponse] = await Promise.all([
        fetch(`${config.url}/rest/v1/customer_reviews?select=id,name,service,rating,review_text,created_at&status=eq.approved&order=created_at.desc`, { headers }),
        fetch(`${config.url}/rest/v1/review_replies?select=review_id,reply,updated_at`, { headers }),
      ]);
      if (!reviewsResponse.ok || !repliesResponse.ok) {
        const details = await (!reviewsResponse.ok ? reviewsResponse : repliesResponse).text();
        console.error("Supabase read error:", details);
        return json(502, { error: "Could not load published reviews." });
      }
      const reviews = await reviewsResponse.json();
      const replies = await repliesResponse.json();
      const replyMap = new Map(replies.map((item) => [String(item.review_id), item.reply]));
      return json(200, {
        reviews: reviews.map((item) => ({
          ...item,
          reply: replyMap.get(String(item.id)) || "",
        })),
      });
    } catch (error) {
      console.error("Review list error:", error);
      return json(502, { error: "Could not load published reviews." });
    }
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { Allow: "GET, POST" }, body: "Method Not Allowed" };
  }

  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid request body." });
  }

  const name = String(input.name || "").trim().slice(0, 80);
  const service = String(input.service || "Inna usługa").trim().slice(0, 120);
  const reviewText = String(input.review_text || "").trim().slice(0, 2000);
  const rating = Number(input.rating);

  if (!name || !reviewText || reviewText.length < 10 || !Number.isInteger(rating) || rating < 1 || rating > 5 || input.consent !== true) {
    return json(400, { error: "Please complete all required review fields." });
  }

  try {
    const response = await fetch(`${config.url}/rest/v1/customer_reviews`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        name,
        service,
        rating,
        review_text: reviewText,
        status: "pending",
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("Supabase insert error:", details);
      return json(502, { error: "Could not save the review for moderation." });
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error("Review submission error:", error);
    return json(502, { error: "Could not save the review for moderation." });
  }
}
