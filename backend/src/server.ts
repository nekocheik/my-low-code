// backend/src/server.ts

import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { Node, ProjectGraph, Edge } from './types';
import { compileNodes } from './utils';
import { Context } from './context';
import { Linter } from 'eslint';
import ivm from 'isolated-vm';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

const PROJECTS_DIR = path.join(__dirname, 'projects');

// Assurer que le répertoire des projets existe
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR);
}

// Create initial graph for a project
// backend/src/server.ts (Lors de la création initiale du graphe)
function createInitialGraph(): ProjectGraph {
  return {
    nodes: [
      {
        id: 'index.js', // Utiliser fileName comme id
        type: 'code',
        position: { x: 100, y: 100 },
        data: {
          label: 'index.js',
          fileName: 'index.js',
          imports: [],
          code: '// Your code here\nconsole.log("Hello World");',
          exportedFunctions: []
        }
      }
    ],
    edges: []
  };
}


/**
 * Create a new project
 */
app.post('/create-project', (req: Request, res: Response) => {
  const { projectCode, projectName } = req.body;

  if (!projectCode || !projectName) {
    return res.status(400).json({ message: 'projectCode and projectName are required.' });
  }

  const projectDirName = `${projectCode}-${projectName}`;
  const projectPath = path.join(PROJECTS_DIR, projectDirName);

  if (fs.existsSync(projectPath)) {
    return res.status(400).json({ message: 'Project already exists.' });
  }

  fs.mkdirSync(projectPath);
  fs.writeFileSync(path.join(projectPath, 'index.js'), '// Your code here\nconsole.log("Hello World");\n');

  // Create initial graph
  const initialGraph = createInitialGraph();
  fs.writeFileSync(path.join(projectPath, 'graph.json'), JSON.stringify(initialGraph, null, 2));

  return res.status(201).json({ message: 'Project created successfully.', projectPath: projectDirName });
});

/**
 * Get list of projects
 */
app.get('/projects', (req: Request, res: Response) => {
  const projects = fs.readdirSync(PROJECTS_DIR);
  return res.status(200).json(projects);
});

/**
 * Initialize project graph
 */
app.post('/init-project-graph', (req: Request, res: Response) => {
  const { project } = req.body;

  if (!project) {
    return res.status(400).json({ message: 'Project name is required.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  // Create initial graph
  const initialGraph = createInitialGraph();
  fs.writeFileSync(graphPath, JSON.stringify(initialGraph, null, 2));

  return res.status(200).json({ message: 'Project graph initialized successfully.', graph: initialGraph });
});

/**
 * Get file content
 */
app.get('/file-content', (req: Request, res: Response) => {
  const { project, file } = req.query;

  if (!project || !file) {
    return res.status(400).json({ message: 'Project and file are required.' });
  }

  const filePath = path.join(PROJECTS_DIR, project as string, file as string);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found.' });
  }

  const code = fs.readFileSync(filePath, 'utf-8');
  return res.status(200).json({ code });
});

/**
 * Update file content and project graph
 */


// backend/src/server.ts

app.post('/update-file', (req: Request, res: Response) => {
  const { project, nodeId, nodeData } = req.body;

  if (!project || !nodeId || !nodeData) {
    return res.status(400).json({ message: 'Project, nodeId, and nodeData are required.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  const { fileName, imports, code, position } = nodeData;
  const oldFilePath = path.join(projectPath, nodeId); // nodeId est l'ancien fileName
  const newFilePath = path.join(projectPath, fileName); // nouveau fileName

  try {
    // Si le fileName a changé, renommez le fichier
    if (nodeId !== fileName) {
      if (fs.existsSync(oldFilePath)) {
        fs.renameSync(oldFilePath, newFilePath);
      } else {
        return res.status(400).json({ message: 'Original file not found for renaming.' });
      }
    }

    // Écrire les imports et le code dans le fichier
    let fileContent = '';
    imports.forEach((imp: string) => {
      fileContent += `${imp}\n`;
    });
    fileContent += `\n${code}`;

    fs.writeFileSync(newFilePath, fileContent);

    // Extraire les fonctions exportées
    const exportedFunctions = Context.extractExportedFunctions(code);

    // Lint du code
    const linter = new Linter();
    const lintConfig = {
      env: { es6: true, node: true },
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
      rules: {
        'no-unused-vars': 'warn',
        'no-undef': 'error',
      },
    };
    const lintMessages = linter.verify(code, lintConfig as any);

    // Mettre à jour le graph du projet
    const graphPath = path.join(projectPath, 'graph.json');
    let graph: ProjectGraph = { nodes: [], edges: [] };
    if (fs.existsSync(graphPath)) {
      graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    }

    const existingNodeIndex = graph.nodes.findIndex(node => node.id === nodeId);
    const updatedNode: Node = {
      id: fileName, // Mettre à jour l'id si fileName a changé
      type: 'code',
      position: position,
      data: {
        label: fileName,
        fileName,
        imports,
        code,
        exportedFunctions,
      },
    };

    if (existingNodeIndex !== -1) {
      graph.nodes[existingNodeIndex] = updatedNode;
    } else {
      graph.nodes.push(updatedNode);
    }

    fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2));

    return res.status(200).json({
      message: 'File and graph updated successfully.',
      exportedFunctions,
      lintMessages,
    });
  } catch (error) {
    console.error('Error updating file or graph:', error);
    return res.status(500).json({ message: 'Error updating file or graph.', error });
  }
});


/**
 * Install a package in a project
 */
app.post('/install-package', (req: Request, res: Response) => {
  const { project, packageName } = req.body;

  if (!project || !packageName) {
    return res.status(400).json({ message: 'Project and packageName are required.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  // Execute 'npm install' for the specified package
  exec(`npm install ${packageName}`, { cwd: projectPath }, (error: Error | null, stdout: string, stderr: string) => {
    if (error) {
      return res.status(500).json({ message: 'Error installing package.', error: error.message, stderr });
    }
    return res.status(200).json({ message: 'Package installed successfully.', stdout, stderr });
  });
});

/**
 * Execute project code from a specific node using isolated-vm
 */
app.post('/execute', async (req: Request, res: Response) => {
  const { project, nodeId } = req.body;

  if (!project || !nodeId) {
    return res.status(400).json({ message: 'Project and nodeId are required.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');

  if (!fs.existsSync(graphPath)) {
    return res.status(404).json({ message: 'Project graph not found.' });
  }

  try {
    const graph: ProjectGraph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    const compiledCode = compileNodes(graph, nodeId);

    const isolate = new ivm.Isolate({ memoryLimit: 256 });
    const context = await isolate.createContext();

    console.log("ici 1", { compiledCode });

    const allowedModules = ['lodash', 'moment']; // Liste des modules autorisés

    // Injecter une fonction require limitée (optionnel et à utiliser avec précaution)
    await context.global.set('require', new ivm.Reference((moduleName: string) => {
      if (!allowedModules.includes(moduleName)) {
        throw new Error(`Module "${moduleName}" is not allowed.`);
      }
      return require(moduleName);
    }), { copy: true }); // Utiliser copy: false

    let stdout = '';
    let stderr = '';

    // Configurer console.log et console.error avec copy: false
    const logRef = new ivm.Reference((...args: any[]) => {
      stdout += args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ') + '\n';
    });
    const errorRef = new ivm.Reference((...args: any[]) => {
      stderr += args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ') + '\n';
    });

    await context.global.set('console', {
      log: logRef,
      error: errorRef,
    }, { copy: true }); // Changement ici: copy: false

    // Envelopper le code dans une IIFE async pour gérer les promesses
    const wrappedCode = `
      (async () => {
        try {
          ${compiledCode}
          return { success: true, result: "Execution completed successfully" };
        } catch (error) {
          console.error(error.toString());
          return { success: false, error: error.toString() };
        }
      })()
    `;

    // Log du code compilé pour débogage
    console.log('Compiled Code:', compiledCode);
    console.log('Wrapped Code:', wrappedCode);

    // Compiler et exécuter le script
    const script = await isolate.compileScript(wrappedCode);
    const rawResult = await script.run(context, { timeout: 5000 });

    // Copier le résultat de l'exécution
    const result = await rawResult.copy();

    // Nettoyage de l'environnement isolé
    context.release();
    isolate.dispose();

    return res.status(200).json({
      result: result.success ? result.result : result.error,
      stdout,
      stderr,
    });
  } catch (error: any) {
    console.error('Execution error:', error);
    return res.status(500).json({
      message: 'Error compiling or executing code.',
      error: error.message,
      stack: error.stack,
    });
  }
});

/**
 * Get project graph
 */
app.get('/project-graph', (req: Request, res: Response) => {
  const { project } = req.query;

  if (!project || typeof project !== 'string') {
    return res.status(400).json({ message: 'Project is required as a query parameter.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');

  if (!fs.existsSync(graphPath)) {
    const initialGraph = createInitialGraph();
    fs.writeFileSync(graphPath, JSON.stringify(initialGraph, null, 2));
    return res.status(200).json({ graph: initialGraph });
  }

  const graph: ProjectGraph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
  return res.status(200).json({ graph });
});

/**
 * Get accessible exported functions via dependencies
 */

app.get('/accessible-functions', (req: Request, res: Response) => {
  const { project, nodeId } = req.query;

  if (!project || typeof project !== 'string' || !nodeId || typeof nodeId !== 'string') {
    return res.status(400).json({ message: 'Project and nodeId are required as query parameters.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');

  if (!fs.existsSync(graphPath)) {
    return res.status(404).json({ message: 'Project graph not found.' });
  }

  const graph: ProjectGraph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
  const edgesFromNode = graph.edges.filter(edge => edge.source === nodeId);
  const accessibleFunctions: string[] = [];

  edgesFromNode.forEach(edge => {
    const targetNode = graph.nodes.find(node => node.id === edge.target);
    if (targetNode) {
      accessibleFunctions.push(...targetNode.data.exportedFunctions);
    }
  });

  return res.status(200).json({ accessibleFunctions });
});

/**
 * Delete a node from a project
 */

app.post('/delete-node', (req: Request, res: Response) => {
  const { project, nodeId } = req.body;

  if (!project || !nodeId) {
    return res.status(400).json({ message: 'Project and nodeId are required.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');

  if (!fs.existsSync(graphPath)) {
    return res.status(404).json({ message: 'Project graph not found.' });
  }

  try {
    const graph: ProjectGraph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    graph.nodes = graph.nodes.filter(node => node.id !== nodeId);
    graph.edges = graph.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
    fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2));

    const filePath = path.join(projectPath, nodeId); // nodeId est maintenant fileName
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.status(200).json({ message: 'Node deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting node.', error });
  }
});


/**
 * Clone a node in a project
 */
app.post('/clone-node', (req: Request, res: Response) => {
  const { project, nodeId, newNodeId } = req.body;

  if (!project || !nodeId || !newNodeId) {
    return res.status(400).json({ message: 'Project, nodeId and newNodeId are required.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');
  if (!fs.existsSync(graphPath)) {
    return res.status(404).json({ message: 'Project graph not found.' });
  }

  try {
    const graph: ProjectGraph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    const nodeToClone = graph.nodes.find(node => node.id === nodeId);

    if (!nodeToClone) {
      return res.status(404).json({ message: 'Node to clone not found.' });
    }

    const clonedNode: Node = {
      ...nodeToClone,
      id: newNodeId,
      data: {
        ...nodeToClone.data,
        fileName: `clone_${nodeToClone.data.fileName}`,
      },
      position: {
        x: nodeToClone.position.x + 50,
        y: nodeToClone.position.y + 50,
      },
    };

    graph.nodes.push(clonedNode);
    fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2));

    const originalFilePath = path.join(projectPath, nodeToClone.data.fileName);
    const clonedFilePath = path.join(projectPath, clonedNode.data.fileName);
    if (fs.existsSync(originalFilePath)) {
      fs.copyFileSync(originalFilePath, clonedFilePath);
    }

    return res.status(200).json({ message: 'Node cloned successfully.', clonedNode });
  } catch (error) {
    return res.status(500).json({ message: 'Error cloning node.', error });
  }
});

/**
 * Update project graph
 */
app.post('/update-graph', (req: Request, res: Response) => {
  const { project, nodes, edges } = req.body;

  if (!project || !nodes || !edges) {
    return res.status(400).json({ message: 'Project, nodes and edges are required.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  try {
    const updatedGraph: ProjectGraph = { nodes, edges };
    fs.writeFileSync(graphPath, JSON.stringify(updatedGraph, null, 2));
    return res.status(200).json({ message: 'Graph updated successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating graph.', error });
  }
});

/**
 * Execute allowed commands in a project
 */
app.post('/execute-command', (req: Request, res: Response) => {
  const { project, command } = req.body;

  if (!project || !command) {
    return res.status(400).json({ message: 'Project and command are required.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  // Sécurité : Valider la commande pour éviter l'exécution de commandes dangereuses
  const allowedCommands = ['ls', 'npm install', 'npm run build', 'npm run start'];
  if (!allowedCommands.includes(command)) {
    return res.status(403).json({ message: 'Command not allowed.' });
  }

  exec(command, { cwd: projectPath }, (error: Error | null, stdout: string, stderr: string) => {
    if (error) {
      return res.status(500).json({ message: 'Error executing command.', error: error.message, stderr });
    }
    return res.status(200).json({ stdout, stderr });
  });
});

/**
 * Endpoint /execute
 */
app.post('/execute', async (req: Request, res: Response) => {
  const { project, nodeId } = req.body;

  if (!project || !nodeId) {
    return res.status(400).json({ message: 'Project and nodeId are required.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');

  if (!fs.existsSync(graphPath)) {
    return res.status(404).json({ message: 'Project graph not found.' });
  }

  try {
    const graph: ProjectGraph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    const compiledCode = compileNodes(graph, nodeId);

    const isolate = new ivm.Isolate({ memoryLimit: 256 });
    const context = await isolate.createContext();

    console.log("ici 1", { compiledCode });

    const allowedModules = ['lodash', 'moment']; // Liste des modules autorisés

    // Injecter une fonction require limitée (optionnel et à utiliser avec précaution)
    await context.global.set('require', new ivm.Reference((moduleName: string) => {
      if (!allowedModules.includes(moduleName)) {
        throw new Error(`Module "${moduleName}" is not allowed.`);
      }
      return require(moduleName);
    }), { copy: true }); // Utiliser copy: false

    let stdout = '';
    let stderr = '';

    // Configurer console.log et console.error avec copy: false
    const logRef = new ivm.Reference((...args: any[]) => {
      stdout += args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ') + '\n';
    });
    const errorRef = new ivm.Reference((...args: any[]) => {
      stderr += args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ') + '\n';
    });

    await context.global.set('console', {
      log: logRef,
      error: errorRef,
    }, { copy: true }); // Changement ici: copy: false

    // Envelopper le code dans une IIFE async pour gérer les promesses
    const wrappedCode = `
      (async () => {
        try {
          ${compiledCode}
          return { success: true, result: "Execution completed successfully" };
        } catch (error) {
          console.error(error.toString());
          return { success: false, error: error.toString() };
        }
      })()
    `;

    // Log du code compilé pour débogage
    console.log('Compiled Code:', compiledCode);
    console.log('Wrapped Code:', wrappedCode);

    // Compiler et exécuter le script
    const script = await isolate.compileScript(wrappedCode);
    const rawResult = await script.run(context, { timeout: 5000 });

    // Copier le résultat de l'exécution
    const result = await rawResult.copy();

    // Nettoyage de l'environnement isolé
    context.release();
    isolate.dispose();

    return res.status(200).json({
      result: result.success ? result.result : result.error,
      stdout,
      stderr,
    });
  } catch (error: any) {
    console.error('Execution error:', error);
    return res.status(500).json({
      message: 'Error compiling or executing code.',
      error: error.message,
      stack: error.stack,
    });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
