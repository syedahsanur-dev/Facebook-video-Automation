const axios = require("axios");

const GRAPH_VERSION = process.env.GRAPH_API_VERSION || "v21.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

const graph = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

function graphError(err) {
  const fbErr = err.response?.data?.error;
  return {
    status: err.response?.status || 500,
    message: fbErr?.message || err.message,
    type: fbErr?.type,
    code: fbErr?.code,
    fbtrace_id: fbErr?.fbtrace_id,
  };
}

module.exports = { graph, GRAPH_VERSION, BASE_URL, graphError };
