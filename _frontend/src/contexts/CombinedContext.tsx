// frontend/src/contexts/CombinedContext.tsx

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import axiosInstance from '../axiosInstance';
import { useAlert } from './AlertContext';
import { useGraph } from './GraphContext';
import { useProject } from './ProjectContext';

interface Project {
  _id: string;
  name: string;
  createdAt: string;
}

interface CombinedContextType {
  projects: Project[];
  selectedProject: string;
  nodes: Node[];
  edges: Edge[];
  loadProjects: () => Promise<void>;
  selectProject: (project: string) => void;
  createProject: (projectCode: string, projectName: string) => Promise<void>;
  installPackage: (packageName: string) => Promise<void>;
  importGitProject: (repoUrl: string) => Promise<void>;
  deleteProject: (projectName: string) => Promise<void>;
  loadGraph: () => Promise<void>;
  updateGraph: (updatedNodes: Node[], updatedEdges: Edge[]) => Promise<void>;
  addNode: (newNode: Node) => void;
  deleteNode: (nodeId: string) => Promise<void>;
  cloneNode: (nodeId: string) => Promise<void>;
  executeNode: (nodeId: string) => Promise<{ stdout: string; stderr: string }>;
}

const CombinedContext = createContext<CombinedContextType | undefined>(undefined);

export const CombinedProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { projects, selectedProject, selectProject, loadProjects, createProject, installPackage, importGitProject, deleteProject } = useProject();
  const { nodes, edges, loadGraph, updateGraph, addNode, deleteNode, cloneNode, executeNode } = useGraph();
  const { showAlert } = useAlert();

  // Charger le graphe lorsque le projet sélectionné change
  useEffect(() => {
    if (selectedProject) {
      loadGraph(selectedProject);
    }
  }, [selectedProject, loadGraph]);

  const handleUpdateGraph = async (updatedNodes: Node[], updatedEdges: Edge[]) => {
    try {
      await updateGraph(selectedProject, updatedNodes, updatedEdges);
    } catch (error) {
      // L'erreur est déjà gérée dans GraphProvider
    }
  };

  const contextValue: CombinedContextType = {
    projects,
    selectedProject,
    nodes,
    edges,
    loadProjects,
    selectProject,
    createProject,
    installPackage,
    importGitProject,
    deleteProject,
    loadGraph: () => loadGraph(selectedProject),
    updateGraph: handleUpdateGraph,
    addNode,
    deleteNode,
    cloneNode,
    executeNode
  };

  return (
    <CombinedContext.Provider value={contextValue}>
      {children}
    </CombinedContext.Provider>
  );
};

export const useCombined = () => {
  const context = useContext(CombinedContext);
  if (!context) {
    throw new Error('useCombined must be used within a CombinedProvider');
  }
  return context;
};
