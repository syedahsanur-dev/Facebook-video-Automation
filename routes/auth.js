const express = require("express");
const { graph, graphError } = require("../utils/graph");
const { saveUser, getUser } = require("../utils/store");

const router = express.Router();

/** STEP 1: send the browser here to start Facebook Login (server-side flow) */
router.get("/facebook", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.FB_APP_ID,
    redirect_uri: process.env.FB_REDIRECT_URI,
    scope: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "publish_video",
    ].join(","),
    response_type: "code",
  });
  res.redirect(
    `https://www.facebook.com/${process.env.GRAPH_API_VERSION || "v21.0"}/dialog/oauth?${params.toString()}`
  );
});

/** STEP 2: Facebook redirects here with ?code=... */
router.get("/facebook/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

  try {
    const tokenResp = await graph.get("/oauth/access_token", {
      params: {
        client_id: process.env.FB_APP_ID,
        client_secret: process.env.FB_APP_SECRET,
        redirect_uri: process.env.FB_REDIRECT_URI,
        code,
      },
    });
    const shortLivedToken = tokenResp.data.access_token;

    const longLivedResp = await graph.get("/oauth/access_token", {
      params: {
        grant_type: "fb_exchange_token",
        client_id: process.env.FB_APP_ID,
        client_secret: process.env.FB_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    });
    const longLivedToken = longLivedResp.data.access_token;

    const me = await graph.get("/me", {
      params: { access_token: longLivedToken, fields: "id,name" },
    });

    saveUser(me.data.id, {
      name: me.data.name,
      userAccessToken: longLivedToken,
      tokenObtainedAt: Date.now(),
    });

    // Hand the browser back to the static dashboard with the fb user id
    // (fine for a single-admin tool; for multi-user, issue your own
    // session/JWT here instead of exposing the raw Facebook id).
    res.redirect(`/dashboard.html?fbUserId=${me.data.id}`);
  } catch (err) {
    const e = graphError(err);
    res.status(e.status).send(`Login failed: ${e.message}`);
  }
});

/** Frontend JS-SDK login flow: client gets a token, backend validates + stores it */
router.post("/facebook/token", async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ error: "accessToken required" });

  try {
    const appToken = `${process.env.FB_APP_ID}|${process.env.FB_APP_SECRET}`;
    const debug = await graph.get("/debug_token", {
      params: { input_token: accessToken, access_token: appToken },
    });
    if (!debug.data.data.is_valid || debug.data.data.app_id !== process.env.FB_APP_ID) {
      return res.status(401).json({ error: "Invalid or foreign token" });
    }

    const longLivedResp = await graph.get("/oauth/access_token", {
      params: {
        grant_type: "fb_exchange_token",
        client_id: process.env.FB_APP_ID,
        client_secret: process.env.FB_APP_SECRET,
        fb_exchange_token: accessToken,
      },
    });
    const longLivedToken = longLivedResp.data.access_token;

    const me = await graph.get("/me", {
      params: { access_token: longLivedToken, fields: "id,name" },
    });

    saveUser(me.data.id, {
      name: me.data.name,
      userAccessToken: longLivedToken,
      tokenObtainedAt: Date.now(),
    });

    res.json({ fbUserId: me.data.id, name: me.data.name });
  } catch (err) {
    const e = graphError(err);
    res.status(e.status).json(e);
  }
});

router.get("/status/:fbUserId", (req, res) => {
  const user = getUser(req.params.fbUserId);
  if (!user) return res.json({ connected: false });
  res.json({
    connected: true,
    name: user.name,
    pagesCount: (user.pages || []).length,
  });
});

module.exports = router;
