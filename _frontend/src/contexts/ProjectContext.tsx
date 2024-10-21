// frontend/src/contexts/ProjectContext.tsx

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import axiosInstance from '../axiosInstance';
// Supprimer l'import de useGraph
import { useAlert } from './AlertContext';

interface Project {
  _id: string;
  name: string;
  createdAt: string;
}

interface ProjectContextType {
  projects: Project[];
  selectedProject: string;
  selectProject: (project: string) => void;
  loadProjects: () => Promise<void>;
  importGitProject: (repoUrl: string) => Promise<void>;
  deleteProject: (projectName: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  // Retirer l'utilisation de useGraph
  const { showAlert } = useAlert();

  const loadProjects = async () => {
    try {
      const response = await axiosInstance.get('/projects');
      setProjects(response.data);
    } catch (error: any) {
      console.error('Failed to load projects:', error);
      showAlert('Échec du chargement des projets.', 'error');
    }
  };

  const selectProject = (project: string) => {
    setSelectedProject(project);
    showAlert(`Projet "${project}" sélectionné.`, 'info');
    // loadGraph est maintenant géré ailleurs
  };

  const importGitProject = async (repoUrl: string) => {
    try {
      const response = await axiosInstance.post("/git/pull", { repoUrl });
      showAlert("Projet Git importé avec succès.", "success");
      await loadProjects();
      if (response.data.projectName) {
        setSelectedProject(response.data.projectName);
      } else {
        showAlert("Le nom du projet n'a pas été trouvé dans la réponse.", "warning");
      }
    } catch (error: any) {
      console.error("Failed to import Git project:", error);
      const errorMessage =
        error.response?.data?.message || "Échec de l'importation du projet Git.";
      showAlert(errorMessage, "error");
      throw error;
    }
  };

  const deleteProject = async (projectName: string) => {
    try {
      await axiosInstance.delete(`/projects/${projectName}`);
      showAlert(`Projet "${projectName}" supprimé avec succès.`, 'success');
      await loadProjects();
      if (selectedProject === projectName) {
        setSelectedProject("");
      }
    } catch (error: any) {
      console.error("Failed to delete project:", error);
      const errorMessage =
        error.response?.data?.message || "Échec de la suppression du projet.";
      showAlert(errorMessage, "error");
      throw error;
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const contextValue: ProjectContextType = {
    projects,
    selectedProject,
    selectProject,
    loadProjects,
    importGitProject,
    deleteProject,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
