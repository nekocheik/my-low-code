// my-low-code-app/frontend/src/nodes/index.ts

import type { NodeTypes } from 'reactflow';
import { PositionLoggerNode } from './PositionLoggerNode';

export const nodeTypes = {
  'position-logger': PositionLoggerNode,
} satisfies NodeTypes;