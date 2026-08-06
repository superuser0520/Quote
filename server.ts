import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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
