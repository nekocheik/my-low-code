import type { Node } from 'reactflow';

export type PositionLoggerNode = Node<{ label: string }, 'position-logger'>;
export type AppNode = PositionLoggerNode;
// Ajoutez d'autres types de nœuds ici si nécessaire