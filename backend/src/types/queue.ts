export interface QueuedOperation {
    id: string;
    type: 'updateGraph' | 'deleteNode' | 'cloneNode';
    data: any;
    timestamp: number;
    requestHash: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: any;
    error?: string;
  }
