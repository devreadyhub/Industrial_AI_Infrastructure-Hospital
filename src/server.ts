
import dotenv from 'dotenv';
import http from 'http';
import app from './app';
import { initializeSocketIO, initializeEmergencyNamespace, getSocketIO } from './services/socketService';
import { VisitorService } from './services/visitorService';

dotenv.config();
console.log("DEBUG: OLLAMA_API_URL is:", process.env.OLLAMA_API_URL);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

const httpServer = http.createServer(app);
const io = initializeSocketIO(httpServer);
initializeEmergencyNamespace(io);

// Start visitor archiving scheduler
VisitorService.startArchivingScheduler();

httpServer.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
