// frontend/src/components/Modals.tsx

import React, { useCallback } from 'react';
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
} from '@chakra-ui/react';
import { useModal } from '../contexts/ModalContext';
import { useGraph } from '../contexts/GraphContext';

export const Modals: React.FC = () => {
  const { isDeleteModalOpen, closeDeleteModal, nodeToDelete } = useModal();
  const { deleteNode } = useGraph();

  const handleConfirmDelete = useCallback(() => {
    if (nodeToDelete) {
      deleteNode(nodeToDelete);
      closeDeleteModal();
    }
  }, [nodeToDelete, deleteNode, closeDeleteModal]);

  return (
    <>
      {/* Delete Node Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirmer la Suppression</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Êtes-vous sûr de vouloir supprimer ce nœud ? Cette action est irréversible.</Text>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" mr={3} onClick={handleConfirmDelete}>
              Supprimer
            </Button>
            <Button variant="ghost" onClick={closeDeleteModal}>Annuler</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Ajoutez d'autres modals ici si nécessaire */}
    </>
  );
};
