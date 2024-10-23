import type { Node, Edge } from 'reactflow';

export interface CodeNodeData {
  label: string;
  fileName: string;
  imports: string[];
  code: string;
  exportedFunctions: string[];
  lintErrors?: Array<{
    line: number;
    message: string;
  }>;
}

export interface PositionLoggerNodeData {
  label: string;
}

export type CodeNode = Node<CodeNodeData, 'code'>;
export type PositionLoggerNode = Node<PositionLoggerNodeData, 'position-logger'>;
export type AppNode = CodeNode | PositionLoggerNode;

// API Response Types
export interface GraphResponse {
  graph: {
    nodes: AppNode[];
    edges: Edge[];
  }
}

export interface UpdateNodeResponse {
  message: string;
}

export interface ExecuteNodeResponse {
  stdout: string;
  stderr: string;
}

export interface CloneNodeResponse {
  message: string;
  clonedNode: AppNode;
}