const express = require('express');
const cors    = require('cors');
const fetch   = require('node-fetch');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── HEALTH CHECK ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'CodeLens — Radina Anantya' });
});

// ── API PROXY ──
app.post('/api/review', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  const { code, language, focuses } = req.body;

  if (!code || code.trim().length === 0) {
    return res.status(400).json({ error: 'No code provided.' });
  }

  const lang = language === 'Auto-detect'
    ? 'auto-detect the language'
    : language;

  const prompt = `You are a friendly, expert code reviewer. Review the following code and provide clear, constructive feedback.

Language: ${lang}
Focus areas: ${focuses || 'general code quality'}

Code to review:
\`\`\`
${code}
\`\`\`

Provide your review in this exact format:

SCORE: [X/10]

SUMMARY:
[2-3 sentence overall assessment, be encouraging but honest]

✅ WHAT'S GOOD:
[List 2-4 things done well, be specific]

🐛 ISSUES FOUND:
[List issues with line references if possible, or "None found" if clean]

💡 SUGGESTIONS:
[Concrete improvement suggestions with brief code examples if helpful]

⚡ QUICK WINS:
[1-3 small easy fixes they can do right now]

Keep the tone warm, clear, and encouraging — like a senior dev who genuinely wants to help.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages:   [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content?.map(b => b.text || '').join('') || '';
    res.json({ result: text });

  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Failed to reach AI engine. Try again.' });
  }
});

// ── FALLBACK → index.html ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CodeLens server running on port ${PORT}`);
});
