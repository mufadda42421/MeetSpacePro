import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { initSocketServer } from './server/socket';
import { handleTranscribeApi, handleSummaryApi } from './server/api';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize WebRTC signaling & real-time communication
initSocketServer(server);

app.use(express.json({ limit: '50mb' }));

// Mount Gemini AI transcription & summary APIs
app.all('/api/transcribe', (req, res) => {
  handleTranscribeApi(req, res);
});

app.all('/api/summary', (req, res) => {
  handleSummaryApi(req, res);
});

// Serve frontend static assets in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`MeetSpace server running on port ${PORT}`);
});
