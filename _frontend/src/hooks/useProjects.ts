import { useState, useEffect } from 'react';
import axios from 'axios';

export const useProjects = () => {
  const [projects, setProjects] = useState<string[]>([]);  // Initialisation avec un tableau vide
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadProjectGraph = async (project: string) => {
    try {
      setSelectedProject(project);
      const res = await axios.get(`/project-graph?project=${project}`);
      return res.data.graph;
    } catch (error) {
      console.error('Error loading project graph:', error);
    }
  };

  const createProject = async (projectCode: string, projectName: string) => {
    try {
      const res = await axios.post('/create-project', { projectCode, projectName });
      setProjects([...projects, res.data.projectPath]);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleInstallPackage = async (packageName: string) => {
    try {
      const res = await axios.post('/install-package', { project: selectedProject, packageName });
      console.log(res.data.stdout);
    } catch (error) {
      console.error('Error installing package:', error);
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get('/projects');
        setProjects(res.data || []);  // S'assurer que les données sont un tableau
      } catch (error) {
        console.error('Error loading projects:', error);
        setProjects([]);  // Valeur par défaut en cas d'erreur
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return { projects, selectedProject, loadProjectGraph, createProject, handleInstallPackage, isLoading };
};