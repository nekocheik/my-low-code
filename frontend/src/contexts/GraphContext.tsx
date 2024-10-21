// frontend/src/contexts/GraphContext.tsx

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import axiosInstance from '../axiosInstance';
import { useAlert } from './AlertContext';

interface GraphContextType {
  nodes: Node[];
  edges: Edge[];
  loadGraph: (project: string) => Promise<void>;
  updateGraph: (project: string, updatedNodes: Node[], updatedEdges: Edge[]) => Promise<void>;
  addNode: (newNode: Node) => void;
  deleteNode: (nodeId: string) => Promise<void>;
  cloneNode: (nodeId: string) => Promise<void>;
  executeNode: (nodeId: string) => Promise<{ stdout: string; stderr: string }>;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export const GraphProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const { showAlert } = useAlert();

  const loadGraph = useCallback(async (project: string) => {
    try {
      const response = await axiosInstance.get('/project-graph', {
        params: { project },
      });
      setNodes(response.data.graph.nodes);
      setEdges(response.data.graph.edges);
      showAlert('Graphe chargé avec succès.', 'success');
    } catch (error) {
      console.error('Échec du chargement du graphe du projet:', error);
      showAlert('Échec du chargement du graphe du projet.', 'error');
    }
  }, [showAlert]);

  const updateGraph = async (project: string, updatedNodes: Node[], updatedEdges: Edge[]) => {
    try {
      const response = await axiosInstance.post('/project-graph/update-graph', {
        project,
        nodes: updatedNodes,
        edges: updatedEdges
      });
      console.log('Réponse de mise à jour du graphe:', response.data);
      setNodes(updatedNodes);
      setEdges(updatedEdges);
      showAlert('Graphe mis à jour avec succès.', 'success');
    } catch (error) {
      console.error('Échec de la mise à jour du graphe:', error);
      showAlert('Échec de la mise à jour du graphe.', 'error');
      throw error;
    }
  };

  const addNode = (newNode: Node) => {
    setNodes(prevNodes => [...prevNodes, newNode]);
  };

  const deleteNode = async (nodeId: string) => {
    try {
      const response = await axiosInstance.post('/project-graph/delete-node', {
        project: '', // Le projet sera passé lors de l'appel
        nodeId
      });
      console.log('Réponse de suppression du nœud:', response.data);
      setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId));
      setEdges(prevEdges => prevEdges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
      showAlert('Nœud supprimé avec succès.', 'success');
    } catch (error) {
      console.error('Échec de la suppression du nœud:', error);
      showAlert('Échec de la suppression du nœud.', 'error');
      throw error;
    }
  };

  const cloneNode = async (nodeId: string) => {
    try {
      const newNodeId = `${nodeId}_clone`;
      const response = await axiosInstance.post('/project-graph/clone-node', {
        project: '', // Le projet sera passé lors de l'appel
        nodeId,
        newNodeId
      });
      console.log('Réponse de clonage du nœud:', response.data);
      setNodes(prevNodes => [...prevNodes, response.data.clonedNode]);
      showAlert('Nœud cloné avec succès.', 'success');
    } catch (error) {
      console.error('Échec du clonage du nœud:', error);
      showAlert('Échec du clonage du nœud.', 'error');
      throw error;
    }
  };

  const executeNode = async (nodeId: string): Promise<{ stdout: string; stderr: string }> => {
    try {
      const response = await axiosInstance.post('/execute', {
        project: '', // Le projet sera passé lors de l'appel
        nodeId
      });
      console.log('Réponse d\'exécution du nœud:', response.data);
      showAlert('Nœud exécuté avec succès.', 'success');
      return { stdout: response.data.stdout, stderr: response.data.stderr };
    } catch (error) {
      console.error('Échec de l\'exécution du nœud:', error);
      showAlert('Échec de l\'exécution du nœud.', 'error');
      throw error;
    }
  };

  return (
    <GraphContext.Provider value={{ nodes, edges, loadGraph, updateGraph, addNode, deleteNode, cloneNode, executeNode }}>
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
