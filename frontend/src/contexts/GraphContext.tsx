import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import type { Edge } from 'reactflow';
import axiosInstance from '../axiosInstance';
import { useAlert } from './AlertContext';
import { 
  AppNode, 
  GraphResponse, 
  UpdateNodeResponse, 
  ExecuteNodeResponse,
  CloneNodeResponse,
  CodeNodeData 
} from '../types';

interface GraphContextType {
  nodes: AppNode[];
  edges: Edge[];
  selectedProject: string | null;
  setSelectedProject: (project: string) => void;
  loadGraph: (project: string) => Promise<void>;
  updateGraph: (updatedNodes: AppNode[], updatedEdges: Edge[]) => Promise<void>;
  updateNode: (node: AppNode) => Promise<void>;
  addNode: (newNode: AppNode) => void;
  deleteNode: (nodeId: string) => Promise<void>;
  cloneNode: (nodeId: string) => Promise<void>;
  executeNode: (nodeId: string) => Promise<ExecuteNodeResponse>;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export const GraphProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [nodes, setNodes] = useState<AppNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const { showAlert } = useAlert();

  const loadGraph = useCallback(async (project: string) => {
    try {
      const response = await axiosInstance.get<GraphResponse>('/project-graph', {
        params: { project },
      });
      setNodes(response.data.graph.nodes);
      setEdges(response.data.graph.edges);
      setSelectedProject(project);
      showAlert('Graphe chargé avec succès.', 'success');
    } catch (error) {
      console.error('Échec du chargement du graphe du projet:', error);
      showAlert('Échec du chargement du graphe du projet.', 'error');
    }
  }, [showAlert]);

  const updateGraph = async (updatedNodes: AppNode[], updatedEdges: Edge[]) => {
    if (!selectedProject) {
      showAlert('Aucun projet sélectionné.', 'error');
      throw new Error('No project selected');
    }

    try {
      await axiosInstance.post<UpdateNodeResponse>('/project-graph/update-graph', {
        project: selectedProject,
        nodes: updatedNodes,
        edges: updatedEdges
      });
      
      setNodes(updatedNodes);
      setEdges(updatedEdges);
      showAlert('Graphe mis à jour avec succès.', 'success');
    } catch (error) {
      console.error('Échec de la mise à jour du graphe:', error);
      showAlert('Échec de la mise à jour du graphe.', 'error');
      throw error;
    }
  };

  const updateNode = async (node: AppNode) => {
    if (!selectedProject) {
      showAlert('Aucun projet sélectionné.', 'error');
      throw new Error('No project selected');
    }

    try {
      await axiosInstance.post<UpdateNodeResponse>('/project-graph/update-node', {
        project: selectedProject,
        node: {
          ...node,
          data: node.type === 'code' 
            ? {
                ...node.data,
                fileName: (node.data as CodeNodeData).fileName,
                code: (node.data as CodeNodeData).code,
                imports: (node.data as CodeNodeData).imports,
                exportedFunctions: (node.data as CodeNodeData).exportedFunctions,
              }
            : { label: node.data.label }
        }
      });

      setNodes(prevNodes => 
        prevNodes.map(n => n.id === node.id ? node : n)
      );
      
      showAlert('Nœud mis à jour avec succès.', 'success');
    } catch (error) {
      console.error('Échec de la mise à jour du nœud:', error);
      showAlert('Échec de la mise à jour du nœud.', 'error');
      throw error;
    }
  };

  const addNode = useCallback((newNode: AppNode) => {
    setNodes(prevNodes => [...prevNodes, newNode]);
  }, []);

  const deleteNode = async (nodeId: string) => {
    if (!selectedProject) {
      showAlert('Aucun projet sélectionné.', 'error');
      throw new Error('No project selected');
    }

    try {
      await axiosInstance.post<UpdateNodeResponse>('/project-graph/delete-node', {
        project: selectedProject,
        nodeId
      });
      
      setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId));
      setEdges(prevEdges => prevEdges.filter(edge => 
        edge.source !== nodeId && edge.target !== nodeId
      ));
      showAlert('Nœud supprimé avec succès.', 'success');
    } catch (error) {
      console.error('Échec de la suppression du nœud:', error);
      showAlert('Échec de la suppression du nœud.', 'error');
      throw error;
    }
  };

  const cloneNode = async (nodeId: string) => {
    if (!selectedProject) {
      showAlert('Aucun projet sélectionné.', 'error');
      throw new Error('No project selected');
    }

    try {
      const newNodeId = `${nodeId}_clone`;
      const response = await axiosInstance.post<CloneNodeResponse>('/project-graph/clone-node', {
        project: selectedProject,
        nodeId,
        newNodeId
      });
      
      setNodes(prevNodes => [...prevNodes, response.data.clonedNode]);
      showAlert('Nœud cloné avec succès.', 'success');
    } catch (error) {
      console.error('Échec du clonage du nœud:', error);
      showAlert('Échec du clonage du nœud.', 'error');
      throw error;
    }
  };

  const executeNode = async (nodeId: string): Promise<ExecuteNodeResponse> => {
    if (!selectedProject) {
      showAlert('Aucun projet sélectionné.', 'error');
      throw new Error('No project selected');
    }

    try {
      const response = await axiosInstance.post<ExecuteNodeResponse>('/execute', {
        project: selectedProject,
        nodeId
      });
      
      showAlert('Nœud exécuté avec succès.', 'success');
      return response.data;
    } catch (error) {
      console.error('Échec de l\'exécution du nœud:', error);
      showAlert('Échec de l\'exécution du nœud.', 'error');
      throw error;
    }
  };

  return (
    <GraphContext.Provider value={{ 
      nodes, 
      edges, 
      selectedProject, 
      setSelectedProject,
      loadGraph, 
      updateGraph, 
      updateNode,
      addNode, 
      deleteNode, 
      cloneNode, 
      executeNode 
    }}>
      {children}
    </GraphContext.Provider>
  );
};

export const useGraph = () => {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraph doit être utilisé à l\'intérieur d\'un GraphProvider');
  }
  return context;
};

