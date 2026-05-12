const fs = require('fs');
const path = require('path');
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let text = fs.readFileSync(schemaPath, 'utf8');
// Remove the injected debug log line and any direct duplicate relation line
text = text.replace('\r\n[INFO] 23:29:45 ts-node-dev ver. 2.0.0 (using ts-node ver. 5.9.3)\r\n', '\r\n');
text = text.replace('\n[INFO] 23:29:45 ts-node-dev ver. 2.0.0 (using ts-node ver. 5.9.3)\n', '\n');
text = text.replace('\r\n  billingRecords  BillingRecord[]\r\n\r\n  createdAt       DateTime  @default(now)\r\n', '\r\n  createdAt       DateTime  @default(now)\r\n');
text = text.replace('\n  billingRecords  BillingRecord[]\n\n  createdAt       DateTime  @default(now)\n', '\n  createdAt       DateTime  @default(now)\n');
fs.writeFileSync(schemaPath, text, 'utf8');
console.log('Schema repair script executed');
