// my-low-code-app/backend/src/server.ts

import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { Node, ProjectGraph, Edge } from './types';
import { compileNodes } from './utils';
import { Context } from './context';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Répertoire des projets
const PROJECTS_DIR = path.join(__dirname, '..', 'projects');

// Assurez-vous que le répertoire des projets existe
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR);
}

// Fonction pour créer un graphe initial
function createInitialGraph(): ProjectGraph {
  return {
    nodes: [
      {
        id: 'initial_node',
        type: 'code',
        position: { x: 100, y: 100 },
        data: {
          label: 'index.js',
          fileName: 'index.js',
          imports: [],
          code: '// Votre code ici\nconsole.log("Hello World");',
          exportedFunctions: []
        }
      }
    ],
    edges: []
  };
}

/**
 * Créer un nouveau projet
 */
app.post('/create-project', (req: Request, res: Response) => {
  const { projectCode, projectName } = req.body;

  if (!projectCode || !projectName) {
    return res.status(400).json({ message: 'projectCode et projectName sont requis.' });
  }

  const projectDirName = `${projectCode}-${projectName}`;
  const projectPath = path.join(PROJECTS_DIR, projectDirName);

  if (fs.existsSync(projectPath)) {
    return res.status(400).json({ message: 'Le projet existe déjà.' });
  }

  fs.mkdirSync(projectPath);
  fs.writeFileSync(path.join(projectPath, 'index.js'), '// Votre code ici\nconsole.log("Hello World");\n');

  // Créer un graphe initial
  const initialGraph = createInitialGraph();
  fs.writeFileSync(path.join(projectPath, 'graph.json'), JSON.stringify(initialGraph, null, 2));

  return res.status(201).json({ message: 'Projet créé avec succès.', projectPath: projectDirName });
});

/**
 * Récupérer la liste des projets
 */
app.get('/projects', (req: Request, res: Response) => {
  const projects = fs.readdirSync(PROJECTS_DIR);
  return res.status(200).json(projects);
});

/**
 * Initialiser le graphe d'un projet
 */
app.post('/init-project-graph', (req: Request, res: Response) => {
  const { project } = req.body;

  if (!project) {
    return res.status(400).json({ message: 'Le nom du projet est requis.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ message: 'Projet non trouvé.' });
  }

  // Créer un graphe initial
  const initialGraph = createInitialGraph();
  fs.writeFileSync(graphPath, JSON.stringify(initialGraph, null, 2));

  return res.status(200).json({ message: 'Graphe du projet initialisé avec succès.', graph: initialGraph });
});

/**
 * Récupérer le contenu d'un fichier
 */
app.get('/file-content', (req: Request, res: Response) => {
  const { project, file } = req.query;

  if (!project || typeof project !== 'string' || !file || typeof file !== 'string') {
    return res.status(400).json({ message: 'project et file sont requis en tant que query paramètres.' });
  }

  const filePath = path.join(PROJECTS_DIR, project, file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Fichier non trouvé.' });
  }

  const code = fs.readFileSync(filePath, 'utf-8');
  return res.status(200).json({ code });
});

/**
 * Mettre à jour le contenu d'un fichier et le graphe du projet
 */
app.post('/update-file', (req: Request, res: Response) => {
  const { project, nodeId, nodeData } = req.body;

  if (!project || !nodeId || !nodeData) {
    return res.status(400).json({ message: 'project, nodeId et nodeData sont requis.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ message: 'Projet non trouvé.' });
  }

  const { fileName, imports, code, position } = nodeData;
  const filePath = path.join(projectPath, fileName);

  try {
    // Écrire les imports et le code dans le fichier
    let fileContent = '';
    if (Array.isArray(imports)) {
      imports.forEach((imp: string) => {
        fileContent += `${imp}\n`;
      });
    }
    fileContent += `\n${code}`;

    fs.writeFileSync(filePath, fileContent);

    // Extraire les fonctions exportées
    const exportedFunctions = Context.extractExportedFunctions(code);

    // Mettre à jour le graphe du projet
    const graphPath = path.join(projectPath, 'graph.json');
    let graph: ProjectGraph = { nodes: [], edges: [] };
    if (fs.existsSync(graphPath)) {
      graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    }

    const existingNodeIndex = graph.nodes.findIndex(node => node.id === nodeId);
    const updatedNode: Node = {
      id: nodeId,
      type: 'code',
      position: position,
      data: {
        label: fileName,
        fileName,
        imports,
        code,
        exportedFunctions
      }
    };

    if (existingNodeIndex !== -1) {
      graph.nodes[existingNodeIndex] = updatedNode;
    } else {
      graph.nodes.push(updatedNode);
    }

    fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2));

    return res.status(200).json({ message: 'Fichier et graphe mis à jour avec succès.', exportedFunctions });
  } catch (error) {
    console.error('Erreur lors de l\'écriture du fichier ou du graphe:', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour du fichier ou du graphe.', error: error });
  }
});

/**
 * Installer un package dans un projet
 */
app.post('/install-package', (req: Request, res: Response) => {
  const { project, packageName } = req.body;

  if (!project || !packageName) {
    return res.status(400).json({ message: 'project et packageName sont requis.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ message: 'Projet non trouvé.' });
  }

  // Exécutez 'npm install' pour le package spécifié
  exec(`npm install ${packageName}`, { cwd: projectPath }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ message: 'Erreur lors de l\'installation du package.', error: error.message, stderr });
    }
    return res.status(200).json({ message: 'Package installé avec succès.', stdout, stderr });
  });
});

/**
 * Exécuter le code d'un projet depuis un node spécifique
 */
app.post('/execute', (req: Request, res: Response) => {
  const { project, entryFile, nodeId } = req.body;

  if (!project || (!entryFile && !nodeId)) {
    return res.status(400).json({ message: 'project et entryFile ou nodeId sont requis.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');

  if (!fs.existsSync(graphPath)) {
    return res.status(404).json({ message: 'Graph du projet non trouvé.' });
  }

  try {
    // Sauvegarde avant exécution
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(projectPath, `backup_${timestamp}.json`);
    fs.copyFileSync(graphPath, backupPath);

    const graph: ProjectGraph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    const edges: Edge[] = graph.edges || [];

    // Déterminer le node d'entrée
    let entryNode = null;
    if (nodeId) {
      entryNode = nodeId;
    } else {
      entryNode = graph.nodes.find(node => node.data.fileName === entryFile)?.id;
    }

    if (!entryNode) {
      return res.status(400).json({ message: 'Node d\'entrée invalide.' });
    }

    const compiledCode = compileNodes(graph.nodes, edges, entryNode);
    const tempFilePath = path.join(projectPath, '_temp_compiled.js');
    
    fs.writeFileSync(tempFilePath, compiledCode);
    
    exec(`node ${tempFilePath}`, { cwd: projectPath }, (error, stdout, stderr) => {
      fs.unlinkSync(tempFilePath); // Supprimer le fichier temporaire après l'exécution
      if (error) {
        return res.status(500).json({ message: 'Erreur lors de l\'exécution du code.', error: error.message, stderr });
      }
      return res.status(200).json({ stdout, stderr });
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la compilation ou de l\'exécution du code.', error: error });
  }
});

/**
 * Récupérer le graphe d'un projet
 */
app.get('/project-graph', (req: Request, res: Response) => {
  const { project } = req.query;

  if (!project || typeof project !== 'string') {
    return res.status(400).json({ message: 'project est requis en tant que query paramètre.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');

  if (!fs.existsSync(graphPath)) {
    // Si le graphe n'existe pas, créons-en un initial
    const initialGraph = createInitialGraph();
    fs.writeFileSync(graphPath, JSON.stringify(initialGraph, null, 2));
    return res.status(200).json({ graph: initialGraph });
  }

  const graph: ProjectGraph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
  return res.status(200).json({ graph });
});

/**
 * Récupérer les fonctions exportées accessibles via les dépendances
 */
app.get('/accessible-functions', (req: Request, res: Response) => {
  const { project, nodeId } = req.query;

  if (!project || typeof project !== 'string' || !nodeId || typeof nodeId !== 'string') {
    return res.status(400).json({ message: 'project et nodeId sont requis en tant que query paramètres.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');

  if (!fs.existsSync(graphPath)) {
    return res.status(404).json({ message: 'Graph du projet non trouvé.' });
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
 * Supprimer un nœud d'un projet
 */
app.post('/delete-node', (req: Request, res: Response) => {
  const { project, nodeId } = req.body;

  if (!project || !nodeId) {
    return res.status(400).json({ message: 'project et nodeId sont requis.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');

  if (!fs.existsSync(graphPath)) {
    return res.status(404).json({ message: 'Graph du projet non trouvé.' });
  }

  try {
    const graph: ProjectGraph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    const nodeToDelete = graph.nodes.find(node => node.id === nodeId);

    if (!nodeToDelete) {
      return res.status(404).json({ message: 'Nœud non trouvé.' });
    }

    graph.nodes = graph.nodes.filter(node => node.id !== nodeId);
    graph.edges = graph.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
    fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2));

    // Supprimer le fichier correspondant
    const filePath = path.join(projectPath, nodeToDelete.data.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.status(200).json({ message: 'Nœud supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression du nœud:', error);
    return res.status(500).json({ message: 'Erreur lors de la suppression du nœud.', error: error });
  }
});

/**
 * Cloner un nœud d'un projet
 */
app.post('/clone-node', (req: Request, res: Response) => {
  const { project, nodeId, newNodeId } = req.body;

  if (!project || !nodeId || !newNodeId) {
    return res.status(400).json({ message: 'project, nodeId et newNodeId sont requis.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');

  if (!fs.existsSync(graphPath)) {
    return res.status(404).json({ message: 'Graph du projet non trouvé.' });
  }

  try {
    const graph: ProjectGraph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    const nodeToClone = graph.nodes.find(node => node.id === nodeId);

    if (!nodeToClone) {
      return res.status(404).json({ message: 'Nœud à cloner non trouvé.' });
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

    // Écrire le fichier cloné
    const originalFilePath = path.join(projectPath, nodeToClone.data.fileName);
    const clonedFilePath = path.join(projectPath, clonedNode.data.fileName);

    if (fs.existsSync(originalFilePath)) {
      fs.copyFileSync(originalFilePath, clonedFilePath);
    }

    return res.status(200).json({ message: 'Nœud cloné avec succès.', clonedNode });
  } catch (error) {
    console.error('Erreur lors du clonage du nœud:', error);
    return res.status(500).json({ message: 'Erreur lors du clonage du nœud.', error: error });
  }
});

/**
 * Mettre à jour le graphe d'un projet
 */
app.post('/update-graph', (req: Request, res: Response) => {
  const { project, nodes, edges } = req.body;

  if (!project || !nodes || !edges) {
    return res.status(400).json({ message: 'project, nodes et edges sont requis.' });
  }

  const projectPath = path.join(PROJECTS_DIR, project);
  const graphPath = path.join(projectPath, 'graph.json');

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ message: 'Projet non trouvé.' });
  }

  try {
    const updatedGraph: ProjectGraph = {
      nodes,
      edges
    };
    fs.writeFileSync(graphPath, JSON.stringify(updatedGraph, null, 2));
    return res.status(200).json({ message: 'Graphe mis à jour avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du graphe:', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour du graphe.', error: error });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Le serveur backend est en cours d'exécution sur http://localhost:${PORT}`);
});
