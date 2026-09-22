import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function poFilesRouter(dataDirectory: string) {
  const router = Router();
  const directory = path.join(dataDirectory, 'po-files');
  router.post('/', (req, res) => {
    const { data, filename } = req.body || {};
    if (typeof data !== 'string' || typeof filename !== 'string' || !/\.pdf$/i.test(filename)
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return res.status(400).json({ error: 'A PDF attachment is required.' });
    const bytes = Buffer.from(data, 'base64');
    if (bytes.length > 7 * 1024 * 1024 || !bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      return res.status(400).json({ error: 'Invalid PDF or file exceeds 7 MB.' });
    }
    try {
      fs.mkdirSync(directory, { recursive: true });
      const id = createHash('sha256').update(bytes).digest('hex');
      const target = path.join(directory, `${id}.pdf`);
      if (!fs.existsSync(target)) {
        const temporary = path.join(directory, `${id}.tmp`);
        fs.writeFileSync(temporary, bytes);
        fs.renameSync(temporary, target);
      }
      return res.json({ id });
    } catch { return res.status(500).json({ error: 'Could not store PO PDF.' }); }
  });
  router.get('/:id', (req, res) => {
    if (!/^[a-f0-9]{64}$/.test(req.params.id)) return res.sendStatus(400);
    const file = path.join(directory, `${req.params.id}.pdf`);
    if (!fs.existsSync(file)) return res.sendStatus(404);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Purchase-order.pdf"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(file);
  });
  return router;
}
