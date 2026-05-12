import http from 'http';
import app from './app';
import { initializeSocketIO, initializeEmergencyNamespace, getSocketIO } from './services/socketService';
import { VisitorService } from './services/visitorService';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

const httpServer = http.createServer(app);
const io = initializeSocketIO(httpServer);
initializeEmergencyNamespace(io);

// Start visitor archiving scheduler
VisitorService.startArchivingScheduler();

httpServer.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
