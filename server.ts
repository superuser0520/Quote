import express from 'express';
import path from 'path';
import fs from 'fs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { poFilesRouter } from './poFiles';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const APP_PIN = (process.env.APP_PIN || '5465').trim();
const AUTH_COOKIE = 'sooquoting_session';
const sessions = new Set<string>();

app.use(express.json({ limit: '10mb' }));

// Local Raspberry Pi persistent database path. In Docker this is /app/data,
// backed by a bind-mounted directory on the Pi host.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DB_TEMP_FILE = path.join(DATA_DIR, 'db.json.tmp');

// Ensure data directory exists on Raspberry Pi filesystem
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// API Health
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    storage: 'Raspberry Pi Local File Database',
    dbPath: DB_FILE,
    timestamp: new Date().toISOString(),
  });
});

const sessionToken = (cookieHeader = '') => cookieHeader
  .split(';')
  .map((part) => part.trim().split('='))
  .find(([name]) => name === AUTH_COOKIE)?.[1];

const authenticated = (req: express.Request) => {
  const token = sessionToken(req.headers.cookie);
  return Boolean(token && sessions.has(token));
};

app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: authenticated(req) });
});

app.post('/api/auth/pin', (req, res) => {
  const supplied = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
  const expectedBuffer = Buffer.from(APP_PIN);
  const suppliedBuffer = Buffer.from(supplied);
  const valid = suppliedBuffer.length === expectedBuffer.length
    && timingSafeEqual(suppliedBuffer, expectedBuffer);
  if (!valid) return res.status(401).json({ error: 'Incorrect PIN.' });

  const token = randomBytes(32).toString('hex');
  sessions.add(token);
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie', `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`);
  return res.json({ authenticated: true });
});

app.post('/api/auth/logout', (req, res) => {
  const token = sessionToken(req.headers.cookie);
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  return res.json({ authenticated: false });
});

app.use('/api', (req, res, next) => {
  if (authenticated(req)) return next();
  return res.status(401).json({ error: 'PIN required.' });
});

app.use('/api/po-files', poFilesRouter(DATA_DIR));

// API Get Database
app.get('/api/db', (_req, res) => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const fileData = fs.readFileSync(DB_FILE, 'utf-8');
      const json = JSON.parse(fileData);
      return res.json(json);
    }
    return res.status(404).json({ error: 'No database file found on server yet' });
  } catch (err: any) {
    console.error('Error reading Pi DB:', err);
    return res.status(500).json({ error: 'Failed to read Raspberry Pi database file' });
  }
});

// API Save Database
app.post('/api/db', (req, res) => {
  try {
    const { quotations, deliveryOrders, invoices, companyProfile } = req.body;
    const dbPayload = {
      updatedAt: new Date().toISOString(),
      companyProfile,
      quotations: quotations || [],
      deliveryOrders: deliveryOrders || [],
      invoices: invoices || [],
    };

    // Write and rename so an interrupted write does not leave db.json partial.
    fs.writeFileSync(DB_TEMP_FILE, JSON.stringify(dbPayload, null, 2), 'utf-8');
    fs.renameSync(DB_TEMP_FILE, DB_FILE);
    return res.json({ success: true, message: 'Saved to Raspberry Pi local database', updatedAt: dbPayload.updatedAt });
  } catch (err: any) {
    console.error('Error writing Pi DB:', err);
    return res.status(500).json({ error: 'Failed to save to Raspberry Pi database' });
  }
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SooQuoting running on http://0.0.0.0:${PORT}`);
    console.log(`📁 Persistent Raspberry Pi Database: ${DB_FILE}`);
  });
}

start();
