// backend/src/types.ts

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
  label?: string;
}

export interface ProjectGraph {
  nodes: Node[];
  edges: Edge[];
}
