const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const HISTORY_DIR = path.join(ROOT, 'data', 'history');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'generate_history.py');

app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ ok: true });
});

app.post('/api/generate-snapshot', async (req, res) => {
  try {
    execFile('python', [SCRIPT_PATH], { cwd: ROOT }, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({
          ok: false,
          message: 'Snapshot generation failed.',
          error: stderr || error.message,
        });
      }

      const timestamp = new Date().toISOString();
      const dateFolder = timestamp.slice(0, 10);
      const snapshotFile = path.join(
        HISTORY_DIR,
        dateFolder,
        `${timestamp.replace(/[:.]/g, '-')}.json`
      );

      if (!fs.existsSync(snapshotFile)) {
        return res.status(500).json({
          ok: false,
          message: 'Snapshot file was not created.',
        });
      }

      res.json({
        ok: true,
        message: 'Snapshot generated successfully.',
        file: snapshotFile.replace(ROOT + path.sep, ''),
        stdout,
      });
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Unexpected server error.',
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
