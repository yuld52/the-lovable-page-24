// ... (código anterior mantido) ...

// --- PUSH NOTIFICATIONS (PWA Puro) ---
app.get("/api/push/public-key", (req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(500).json({ message: "VAPID keys not configured" });
  }
  res.json({ publicKey });
});

app.post("/api/push/subscribe", requireAuth, async (req, res) => {
  try {
    const { subscription, userId } = req.body;
    if (!subscription || !userId) {
      return res.status(400).json({ message: "Missing subscription or userId" });
    }
    await saveSubscription(userId, subscription);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Push subscription error:", err);
    res.status(500).json({ message: err.message || "Failed to save subscription" });
  }
});

app.post("/api/push/unsubscribe", requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }
    await removeSubscription(userId);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Push unsubscribe error:", err);
    res.status(500).json({ message: err.message || "Failed to remove subscription" });
  }
});

// ... (resto do arquivo mantido) ...