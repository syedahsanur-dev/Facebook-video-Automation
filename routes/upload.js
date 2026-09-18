const express = require("express");
const multer = require("multer");
const fs = require("fs");
const os = require("os");
const FormData = require("form-data");
const axios = require("axios");
const { GRAPH_VERSION, graphError } = require("../utils/graph");
const { getUser } = require("../utils/store");

const router = express.Router();
const upload = multer({ dest: os.tmpdir() }); // safe on serverless (Vercel) and local

const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const GRAPH_VIDEO_URL = `https://graph-video.facebook.com/${GRAPH_VERSION}`;

function getPageToken(fbUserId, pageId) {
  const user = getUser(fbUserId);
  if (!user) return null;
  const page = (user.pages || []).find((p) => p.id === pageId);
  return page ? page.pageAccessToken : null;
}

/**
 * Text/link feed post. Supports scheduling and the *limited* organic
 * feed_targeting Meta allows (country only, best-effort, large Pages only).
 * Division/state-level targeting is not a real organic Graph API feature —
 * see README.
 */
router.post("/post", async (req, res) => {
  const { fbUserId, pageId, message, link, scheduledUnixTime, countries } = req.body;
  const pageToken = getPageToken(fbUserId, pageId);
  if (!pageToken) return res.status(404).json({ error: "Page not found/synced" });

  const params = { message, link, access_token: pageToken };
  if (scheduledUnixTime) {
    params.published = false;
    params.scheduled_publish_time = scheduledUnixTime;
  }
  if (Array.isArray(countries) && countries.length) {
    params.feed_targeting = JSON.stringify({ countries });
  }

  try {
    const resp = await axios.post(`${GRAPH_URL}/${pageId}/feed`, null, { params });
    res.json(resp.data);
  } catch (err) {
    const e = graphError(err);
    res.status(e.status).json(e);
  }
});

router.post("/photo", upload.single("file"), async (req, res) => {
  const { fbUserId, pageId, caption, scheduledUnixTime } = req.body;
  const pageToken = getPageToken(fbUserId, pageId);
  if (!pageToken) return res.status(404).json({ error: "Page not found/synced" });
  if (!req.file) return res.status(400).json({ error: "file is required" });

  try {
    const form = new FormData();
    form.append("source", fs.createReadStream(req.file.path));
    form.append("caption", caption || "");
    form.append("access_token", pageToken);
    if (scheduledUnixTime) {
      form.append("published", "false");
      form.append("scheduled_publish_time", scheduledUnixTime);
    }

    const resp = await axios.post(`${GRAPH_URL}/${pageId}/photos`, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    res.json(resp.data);
  } catch (err) {
    const e = graphError(err);
    res.status(e.status).json(e);
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

router.post("/video", upload.single("file"), async (req, res) => {
  const { fbUserId, pageId, description, scheduledUnixTime } = req.body;
  const pageToken = getPageToken(fbUserId, pageId);
  if (!pageToken) return res.status(404).json({ error: "Page not found/synced" });
  if (!req.file) return res.status(400).json({ error: "file is required" });

  try {
    const form = new FormData();
    form.append("source", fs.createReadStream(req.file.path));
    form.append("description", description || "");
    form.append("access_token", pageToken);
    if (scheduledUnixTime) {
      form.append("published", "false");
      form.append("scheduled_publish_time", scheduledUnixTime);
    }

    const resp = await axios.post(`${GRAPH_VIDEO_URL}/${pageId}/videos`, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    res.json(resp.data);
  } catch (err) {
    const e = graphError(err);
    res.status(e.status).json(e);
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

/** Reels: real 3-step resumable upload (start -> upload bytes -> finish/publish) */
router.post("/reel", upload.single("file"), async (req, res) => {
  const { fbUserId, pageId, description } = req.body;
  const pageToken = getPageToken(fbUserId, pageId);
  if (!pageToken) return res.status(404).json({ error: "Page not found/synced" });
  if (!req.file) return res.status(400).json({ error: "file is required" });

  try {
    const fileSize = fs.statSync(req.file.path).size;

    const start = await axios.post(`${GRAPH_URL}/${pageId}/video_reels`, null, {
      params: { upload_phase: "start", access_token: pageToken },
    });
    const videoId = start.data.video_id;
    const uploadUrl = start.data.upload_url;

    await axios.post(uploadUrl, fs.createReadStream(req.file.path), {
      headers: {
        Authorization: `OAuth ${pageToken}`,
        offset: 0,
        file_size: fileSize,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const finish = await axios.post(`${GRAPH_URL}/${pageId}/video_reels`, null, {
      params: {
        upload_phase: "finish",
        video_id: videoId,
        description: description || "",
        video_state: "PUBLISHED",
        access_token: pageToken,
      },
    });

    res.json({ videoId, ...finish.data });
  } catch (err) {
    const e = graphError(err);
    res.status(e.status).json(e);
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

/**
 * Page Stories publishing via API requires special Meta partner approval —
 * not available through the standard Graph API. Not implemented here to
 * avoid shipping a feature that will just fail with a permissions error.
 */

module.exports = router;
