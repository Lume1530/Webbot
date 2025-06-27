const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const APIFY_TOKEN = 'apify_api_UQ7Y5Tm6sJVDYZQgT20leh2o5ZLavL1LsS1y';
const APIFY_ACTOR_ID = 'apify/instagram-post-scraper';

app.post('/api/track-reel', async (req, res) => {
  const { url } = req.body;
  try {
    const startEndpoint = `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_TOKEN}`;
    const runResponse = await fetch(startEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { postUrls: [url] } }),
    });
    const runData = await runResponse.json();
    const runId = runData.data.id;

    // Poll for run completion
    let output = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(res => setTimeout(res, 2000));
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      const statusData = await statusResponse.json();
      if (statusData.data.status === 'SUCCEEDED') {
        output = statusData.data.output;
        break;
      }
      if (statusData.data.status === 'FAILED' || statusData.data.status === 'ABORTED') {
        throw new Error('Apify actor failed to fetch Instagram stats');
      }
    }
    if (!output) throw new Error('Timed out waiting for Apify actor to finish');
    res.json(output.posts && output.posts.length > 0 ? output.posts[0] : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Proxy server running on port 3001')); 