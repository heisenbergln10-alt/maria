const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  console.error('ERROR: set OPENAI_API_KEY in environment before starting the proxy.');
}

app.post('/api/doublecrux', async (req, res) => {
  if (!OPENAI_KEY) return res.status(500).json({ error: 'OpenAI key not configured on server.' });
  try {
    // Forward the client body directly to OpenAI chat completions
    const body = req.body;
    // Ensure model is present, fall back to gpt-4o if absent
    if (!body.model) body.model = 'gpt-4o';

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await resp.text();
    // Pass through status and body
    res.status(resp.status).send(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`DoubleCrux proxy listening on http://localhost:${PORT}`);
});

