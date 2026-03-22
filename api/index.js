let store = {};

// ⏱ CHECK FOR DEAD SESSIONS (fallback safety)
setInterval(async () => {
  const now = Date.now();

  for (let session_id in store) {
    const s = store[session_id];

    if (!s.completed && now - s.last_update > 2000) {
      try {
        await fetch("https://webhook.site/31f2dec7-c788-416f-b2ec-08165c421441", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "partial_ad_data",
            session_id,
            user_id: s.user_id,
            watch_ms: s.watch_ms,
            completed: false
          })
        });

        console.log("⚠️ Partial sent:", session_id);

      } catch (e) {
        console.log("Webhook error:", e);
      }

      delete store[session_id];
    }
  }
}, 1000);


export default async function handler(req, res) {

  // ✅ CORS HEADERS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ PREFLIGHT FIX (VERY IMPORTANT)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ❌ Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { session_id, user_id, action, watch_ms } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: "Missing session_id" });
  }

  // 🚀 START
  if (action === "start") {
    store[session_id] = {
      user_id,
      watch_ms: 0,
      last_update: Date.now(),
      completed: false
    };

    return res.json({ status: "started" });
  }

  // ⏱ PROGRESS
  if (action === "progress") {
    if (store[session_id]) {
      store[session_id].watch_ms = watch_ms;
      store[session_id].last_update = Date.now();
    }

    return res.json({ status: "updated" });
  }

  // ✅ COMPLETE
  if (action === "complete") {
    let data = store[session_id];

    if (data) {
      data.completed = true;

      try {
        await fetch("https://webhook.site/31f2dec7-c788-416f-b2ec-08165c421441", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "final_ad_data",
            session_id,
            user_id: data.user_id,
            watch_ms: data.watch_ms,
            completed: true
          })
        });

        console.log("✅ Final sent:", session_id);

      } catch (e) {}

      delete store[session_id];
    }

    return res.json({ status: "completed" });
  }

  // 📊 DEBUG
  if (action === "get") {
    return res.json(store[session_id] || {});
  }

  res.json({ status: "unknown_action" });
            }
