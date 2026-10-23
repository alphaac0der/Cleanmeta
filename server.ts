import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'visitors.json');

// Ensure data storage directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface VisitorStore {
  total: number;
  sessions: Record<string, number>; // sessionId -> lastActiveTimestamp
  history: Record<string, number>;  // YYYY-MM-DD -> unique daily visits
}

const BASELINE_TOTAL = 20; // Starting baseline count requested by user

function loadVisitorStore(): VisitorStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (typeof parsed.total === 'number') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Notice loading visitor store:', err);
  }
  return {
    total: BASELINE_TOTAL,
    sessions: {},
    history: {}
  };
}

function saveVisitorStore(data: VisitorStore) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Notice saving visitor store:', err);
  }
}

let store = loadVisitorStore();

app.use(express.json());

// GET /api/visitors: retrieve current live statistics
app.get('/api/visitors', (_req, res) => {
  const now = Date.now();
  // Active in last 5 minutes
  const activeCount = Object.values(store.sessions).filter(
    (lastActive) => now - lastActive < 5 * 60 * 1000
  ).length;

  const todayKey = new Date().toISOString().split('T')[0];
  const todayCount = store.history[todayKey] || 1;

  res.json({
    total: store.total,
    active: Math.max(1, activeCount),
    today: todayCount
  });
});

// POST /api/visitors/ping: record session visit & heartbeat
app.post('/api/visitors/ping', (req, res) => {
  const now = Date.now();
  const todayKey = new Date().toISOString().split('T')[0];
  const { sessionId } = req.body || {};
  const sid = (typeof sessionId === 'string' && sessionId.length > 5)
    ? sessionId
    : `anon_${Math.random().toString(36).substring(2, 9)}`;

  const lastSeen = store.sessions[sid];
  let isNewVisit = false;

  // New visit if not seen before or inactive for more than 30 minutes
  if (!lastSeen || now - lastSeen > 30 * 60 * 1000) {
    store.total += 1;
    store.history[todayKey] = (store.history[todayKey] || 0) + 1;
    isNewVisit = true;
  }

  // Update session active timestamp
  store.sessions[sid] = now;

  // Prune sessions older than 24 hours
  for (const [id, timestamp] of Object.entries(store.sessions)) {
    if (now - timestamp > 24 * 60 * 60 * 1000) {
      delete store.sessions[id];
    }
  }

  saveVisitorStore(store);

  const activeCount = Object.values(store.sessions).filter(
    (timestamp) => now - timestamp < 5 * 60 * 1000
  ).length;

  res.json({
    total: store.total,
    active: Math.max(1, activeCount),
    today: store.history[todayKey] || 1,
    isNewVisit
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cleanmeta full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
