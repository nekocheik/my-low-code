// frontend/src/components/Modals.tsx

import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { useGraph } from '../contexts/GraphContext';

export const Modals: React.FC = () => {
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();
  const { deleteNode } = useGraph();
  const [nodeToDelete, setNodeToDelete] = React.useState<string | null>(null);

  // This function would be called from a parent component or through an event system
  const openDeleteModal = (nodeId: string) => {
    setNodeToDelete(nodeId);
    onDeleteModalOpen();
  };

  const handleConfirmDelete = () => {
    if (nodeToDelete) {
      deleteNode(nodeToDelete);
      onDeleteModalClose();
      setNodeToDelete(null);
    }
  };

  return (
    <>
      {/* Delete Node Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Deletion</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to delete this node? This action cannot be undone.</Text>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" mr={3} onClick={handleConfirmDelete}>
              Delete
            </Button>
            <Button variant="ghost" onClick={onDeleteModalClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* You can add more modals here as needed */}
      {/* For example: Edit Node Modal, Create Connection Modal, etc. */}
    </>
  );
};

// This function should be exported and used in parent components to open the delete modal
export const useModals = () => {
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();

  const openDeleteModal = (nodeId: string) => {
    // Logic to set the node to delete and open the modal
    onDeleteModalOpen();
  };

  return {
    openDeleteModal,
    isDeleteModalOpen,
    onDeleteModalClose,
  };
};