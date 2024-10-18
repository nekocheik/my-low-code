
export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeData {
  label: string;
  fileName: string;
  imports: string[];
  code: string;
  exportedFunctions: string[];
}

export interface Node {
  id: string;
  type: string;
  position: NodePosition;
  data: NodeData;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string; // Ajout d'un label pour les fonctions exportées
}

export interface ProjectGraph {
  nodes: Node[];
  edges: Edge[];
}
