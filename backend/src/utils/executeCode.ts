// backend/src/utils/executeCode.ts

import { exec } from 'child_process';
import path from 'path';

export const executeCode = (filePath: string, callback: (error: Error | null, result: { stdout: string; stderr: string } | null) => void) => {
  exec(`node ${filePath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution error: ${error.message}`);
      return callback(error, null);
    }

    if (stderr) {
      console.error(`stderr: ${stderr}`);
      // Vous pouvez choisir d'envoyer stderr comme partie de la réponse
    }

    console.log(`stdout: ${stdout}`);
    callback(null, { stdout, stderr });
  });
};