import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const source = path.join(process.env.COPILOT_ROOT_PATH, '.env');
const destination = path.join(process.env.COPILOT_WORKSPACE_PATH, '.env');

if (path.resolve(source) === path.resolve(destination) || existsSync(destination)) {
  console.log('.env already present');
} else if (!existsSync(source)) {
  console.warn(`No .env found at ${source}. Create it from .env.example.`);
} else {
  copyFileSync(source, destination);
  console.log(`Copied .env from ${source}`);
}
