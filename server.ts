import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const app = express();
const port = 3000;

// Raw body parser for audio file uploads and exports up to 100MB
app.use('/api/convert-audio', express.raw({ type: '*/*', limit: '100mb' }));
app.use('/api/encode-mp3', express.raw({ type: '*/*', limit: '100mb' }));

app.post('/api/encode-mp3', async (req, res) => {
  const inputBuffer = req.body as Buffer;
  if (!inputBuffer || !inputBuffer.length) {
    res.status(400).json({ error: 'No audio data received' });
    return;
  }

  const rawFilename = (req.headers['x-filename'] as string) || 'audio.wav';
  const originalName = decodeURIComponent(rawFilename);
  const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inputPath = path.join(os.tmpdir(), `mp3_in_${uniqueId}.wav`);
  const outputPath = path.join(os.tmpdir(), `mp3_out_${uniqueId}.mp3`);

  try {
    await fs.promises.writeFile(inputPath, inputBuffer);

    // Convert to MP3 with high-quality LAME encoder at 320kbps
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('ffmpeg', [
        '-y',
        '-i', inputPath,
        '-vn',
        '-c:a', 'libmp3lame',
        '-b:a', '320k',
        outputPath
      ]);

      let stderr = '';
      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg MP3 error (code ${code}): ${stderr.slice(-300)}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });

    const mp3Buffer = await fs.promises.readFile(outputPath);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', mp3Buffer.length);
    res.send(mp3Buffer);
  } catch (err) {
    console.error('MP3 encoding error:', err);
    res.status(500).json({ error: (err as Error).message });
  } finally {
    fs.promises.unlink(inputPath).catch(() => {});
    fs.promises.unlink(outputPath).catch(() => {});
  }
});

app.post('/api/convert-audio', async (req, res) => {
  const inputBuffer = req.body as Buffer;
  if (!inputBuffer || !inputBuffer.length) {
    res.status(400).json({ error: 'No audio data received' });
    return;
  }

  const rawFilename = (req.headers['x-filename'] as string) || 'audio.wma';
  const originalName = decodeURIComponent(rawFilename);
  const ext = path.extname(originalName) || '.wma';
  const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inputPath = path.join(os.tmpdir(), `wma_in_${uniqueId}${ext}`);
  const outputPath = path.join(os.tmpdir(), `wma_out_${uniqueId}.wav`);

  try {
    await fs.promises.writeFile(inputPath, inputBuffer);

    // Convert with ffmpeg
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('ffmpeg', [
        '-y',
        '-i', inputPath,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '44100',
        outputPath
      ]);

      let stderr = '';
      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg error (code ${code}): ${stderr.slice(-300)}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });

    const wavBuffer = await fs.promises.readFile(outputPath);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', wavBuffer.length);
    res.send(wavBuffer);
  } catch (err) {
    console.error('Audio conversion error:', err);
    res.status(500).json({ error: (err as Error).message });
  } finally {
    // Cleanup temporary files
    fs.promises.unlink(inputPath).catch(() => {});
    fs.promises.unlink(outputPath).catch(() => {});
  }
});

// Health endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
