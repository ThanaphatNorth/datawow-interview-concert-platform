'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { XCircleIcon } from '@/components/ui/icons';

interface ConfirmDeleteDialogProps {
  open: boolean;
  concertName: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  concertName,
  onConfirm,
  onCancel,
  pending = false,
}: ConfirmDeleteDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} testId="delete-dialog" labelledBy="delete-dialog-title">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="text-danger">
          <XCircleIcon width={40} height={40} />
        </span>
        <p id="delete-dialog-title" className="text-base font-semibold">
          Are you sure to delete?
          <br />
          <span data-testid="delete-dialog-name">&ldquo;{concertName}&rdquo;</span>
        </p>
        <div className="flex w-full justify-center gap-3">
          <Button variant="outline" data-testid="delete-cancel-btn" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={pending}
            data-testid="delete-confirm-btn"
            onClick={onConfirm}
          >
            Yes, Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
