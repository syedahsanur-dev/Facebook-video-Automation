const express = require("express");
const { graph, graphError } = require("../utils/graph");
const { saveUser, getUser } = require("../utils/store");

const router = express.Router();

router.get("/:fbUserId/sync", async (req, res) => {
  const user = getUser(req.params.fbUserId);
  if (!user) return res.status(404).json({ error: "User not connected" });

  try {
    let pages = [];
    let resp = await graph.get("/me/accounts", {
      params: {
        access_token: user.userAccessToken,
        fields: "id,name,category,access_token,fan_count",
        limit: 100,
      },
    });
    pages = pages.concat(resp.data.data);

    let nextUrl = resp.data.paging?.next || null;
    while (nextUrl) {
      const full = await graph.get(nextUrl);
      pages = pages.concat(full.data.data);
      nextUrl = full.data.paging?.next || null;
    }

    const normalized = pages.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      followers: p.fan_count ?? null,
      pageAccessToken: p.access_token,
    }));

    saveUser(req.params.fbUserId, { pages: normalized });

    res.json({
      count: normalized.length,
      pages: normalized.map(({ pageAccessToken, ...safe }) => safe),
    });
  } catch (err) {
    const e = graphError(err);
    res.status(e.status).json(e);
  }
});

router.get("/:fbUserId", (req, res) => {
  const user = getUser(req.params.fbUserId);
  if (!user) return res.status(404).json({ error: "User not connected" });
  const pages = (user.pages || []).map(({ pageAccessToken, ...safe }) => safe);
  res.json({ count: pages.length, pages });
});

module.exports = router;
