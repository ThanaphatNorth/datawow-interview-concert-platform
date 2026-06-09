'use client';

import styles from './ConcertCard.module.css';
import { Button } from '@/components/ui/Button';
import { PersonIcon, TrashIcon } from '@/components/ui/icons';
import type { Concert } from '@/lib/types';

interface ConcertCardProps {
  concert: Concert;
  /** 'user' shows Reserve/Cancel/Sold out; 'admin' shows Delete. */
  variant: 'user' | 'admin';
  onReserve?: (concert: Concert) => void;
  onCancel?: (concert: Concert) => void;
  onDelete?: (concert: Concert) => void;
  pending?: boolean;
}

export function ConcertCard({
  concert,
  variant,
  onReserve,
  onCancel,
  onDelete,
  pending = false,
}: ConcertCardProps) {
  const isReserved = !!concert.myReservation && concert.myReservation.status === 'ACTIVE';

  return (
    <article className={styles.card} data-testid="concert-card" data-concert-id={concert.id}>
      <h2 className={styles.title} data-testid="concert-title">
        {concert.name}
      </h2>
      <div className={styles.divider} />
      <p className={styles.description} data-testid="concert-description">
        {concert.description}
      </p>
      <div className={styles.footer}>
        <span className={styles.seats} data-testid="concert-seats">
          <PersonIcon />
          {concert.totalSeats.toLocaleString()}
        </span>

        {variant === 'user' &&
          (concert.soldOut && !isReserved ? (
            <span className={styles.soldOut} data-testid="concert-soldout-badge">
              Sold out
            </span>
          ) : isReserved ? (
            <Button
              variant="danger"
              loading={pending}
              data-testid="concert-cancel-btn"
              onClick={() => onCancel?.(concert)}
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="primary"
              loading={pending}
              data-testid="concert-reserve-btn"
              onClick={() => onReserve?.(concert)}
            >
              Reserve
            </Button>
          ))}

        {variant === 'admin' && (
          <Button
            variant="danger"
            data-testid="concert-delete-btn"
            onClick={() => onDelete?.(concert)}
          >
            <TrashIcon width={16} height={16} />
            Delete
          </Button>
        )}
      </div>
    </article>
  );
}
