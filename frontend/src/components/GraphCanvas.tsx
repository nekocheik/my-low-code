// frontend/src/components/GraphCanvas.tsx

import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    applyNodeChanges,
    applyEdgeChanges,
    NodeChange,
    EdgeChange,
    Connection,
    Node,
    Edge,
    useReactFlow, // **Import ajouté ici**
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Button, Input, VStack, HStack, Text, Select } from '@chakra-ui/react';
import { useCombined } from '../contexts/CombinedContext';
import CodeNode from './CodeNode';
import { useModal } from '../contexts/ModalContext';
import { useAlert } from '../contexts/AlertContext';
import axiosInstance from '../axiosInstance';

const nodeTypes = {
    code: CodeNode,
};

const UPDATE_DELAY = 30000; // Délai en millisecondes avant la mise à jour

export const GraphCanvas: React.FC = () => {
    const {
      nodes,
      edges,
      updateGraph,
      addNode,
      deleteNode,
      cloneNode,
      executeNode,
      selectedProject,
      loadGraph,
    } = useCombined();
    const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
    const { openModal, closeModal, setModalContent } = useModal();
    const [searchTerm, setSearchTerm] = useState('');
    const { fitView } = useReactFlow(); // Utilisation de useReactFlow après l'importation correcte
    const { showAlert } = useAlert();

    const [nodesState, setNodesState] = useState<Node[]>(nodes);
    const [edgesState, setEdgesState] = useState<Edge[]>(edges);
    const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setNodesState(nodes);
        setEdgesState(edges);
    }, [nodes, edges]);

    const refreshGraph = useCallback(async () => {
        if (selectedProject) {
            try {
                await loadGraph(selectedProject);
                showAlert('Graphe rafraîchi avec succès', 'success');
            } catch (error) {
                console.error('Erreur lors du rafraîchissement du graphe:', error);
                showAlert('Échec du rafraîchissement du graphe', 'error');
            }
        }
    }, [selectedProject, loadGraph, showAlert]);

    useEffect(() => {
        console.log("ix")
        refreshGraph();
    }, [refreshGraph, selectedProject]);

    const scheduleUpdate = useCallback((updatedNodes: Node[], updatedEdges: Edge[]) => {
        if (updateTimerRef.current) {
            clearTimeout(updateTimerRef.current);
        }
        updateTimerRef.current = setTimeout(async () => {
            try {
                await updateGraph(updatedNodes, updatedEdges);
                await refreshGraph();
                showAlert('Graphe mis à jour et rafraîchi', 'success');
            } catch (error) {
                console.error('Erreur lors de la mise à jour du graphe:', error);
                showAlert('Échec de la mise à jour du graphe', 'error');
            }
        }, UPDATE_DELAY);
    }, [updateGraph, refreshGraph, showAlert]);

    const onNodesChangeCallback = useCallback(
        (changes: NodeChange[]) => {
            const updatedNodes = applyNodeChanges(changes, nodesState);
            setNodesState(updatedNodes);
            scheduleUpdate(updatedNodes, edgesState);
        },
        [nodesState, edgesState, scheduleUpdate]
    );

    const onEdgesChangeCallback = useCallback(
        (changes: EdgeChange[]) => {
            const updatedEdges = applyEdgeChanges(changes, edgesState);
            setEdgesState(updatedEdges);
            scheduleUpdate(nodesState, updatedEdges);
        },
        [edgesState, nodesState, scheduleUpdate]
    );

    const onConnect = useCallback(
        (connection: Connection) => {
            setSelectedConnection(connection);
            setModalContent(
                'delete', // ou 'connect', selon votre implémentation
                { nodeId: connection.source }
            );
            openModal('delete', { nodeId: connection.source });
        },
        [openModal, setModalContent]
    );

    const handleAddNode = useCallback(() => {
        const newFileName = `newFile_${Date.now()}.js`;
        const newNode: Node = {
            id: newFileName,
            type: 'code',
            position: { x: Math.random() * 500, y: Math.random() * 500 },
            data: { code: '// New node', fileName: newFileName, imports: [], exportedFunctions: [] },
        };
        addNode(newNode);
    }, [addNode]);

    const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    }, []);

    const focusNode = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            fitView({ nodes: [node], duration: 800 });
        }
    }, [nodes, fitView]);

    const onEdgeClick = useCallback(
        (event: React.MouseEvent, edge: Edge) => {
            event.stopPropagation();
            setModalContent('delete', { edgeId: edge.id });
            openModal('delete', { edgeId: edge.id });
        },
        [openModal, setModalContent]
    );

    const handleDeleteEdge = useCallback((edgeId: string) => {
        const updatedEdges = edgesState.filter((e) => e.id !== edgeId);
        setEdgesState(updatedEdges);
        scheduleUpdate(nodesState, updatedEdges);
        closeModal();
    }, [edgesState, nodesState, scheduleUpdate, closeModal]);

    const filteredNodes = React.useMemo(() => {
        return nodesState.filter(node =>
            node.data.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            node.data.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [nodesState, searchTerm]);

    return (
        <Box width="60%" height="100%" position="relative">
            <ReactFlow
                nodes={nodesState}
                edges={edgesState}
                onNodesChange={onNodesChangeCallback}
                onEdgesChange={onEdgesChangeCallback}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                onEdgeClick={onEdgeClick}
                fitView
                panOnScroll
                elementsSelectable
                nodesDraggable
            >
                <Background />
                <Controls />
                <MiniMap />
            </ReactFlow>
            <VStack position="absolute" top={4} left={4} spacing={2} align="stretch">
                <Input
                    placeholder="Rechercher des nœuds..."
                    value={searchTerm}
                    onChange={handleSearch}
                    bg="white"
                    width="200px"
                />
                {searchTerm && (
                    <Box bg="white" borderRadius="md" p={2} maxHeight="200px" overflowY="auto">
                        {filteredNodes.map(node => (
                            <HStack key={node.id} justify="space-between" p={1} _hover={{ bg: "gray.100" }}>
                                <Text>{node.data.fileName}</Text>
                                <Button size="sm" onClick={() => focusNode(node.id)}>Focus</Button>
                            </HStack>
                        ))}
                    </Box>
                )}
            </VStack>
            <Button position="absolute" bottom={4} left={4} colorScheme="teal" onClick={handleAddNode}>
                Ajouter Nœud
            </Button>
            <Button
                position="absolute"
                bottom={4}
                right={4}
                colorScheme="blue"
                onClick={() => scheduleUpdate(nodesState, edgesState)}
            >
                Sauvegarder tout
            </Button>
            <Button
                position="absolute"
                bottom={16}
                right={4}
                colorScheme="green"
                onClick={refreshGraph}
            >
                Rafraîchir le graphe
            </Button>
        </Box>
    );
};
