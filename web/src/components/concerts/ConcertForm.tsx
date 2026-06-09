'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createConcertSchema, type CreateConcertInput } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { PersonIcon, SaveIcon } from '@/components/ui/icons';
import { Card } from '@/components/ui/Card';

interface ConcertFormProps {
  onSubmit: (values: CreateConcertInput) => void | Promise<void>;
  submitting?: boolean;
  /** Field errors mapped from a 400 response (docs/03 §4). */
  serverFieldErrors?: Record<string, string>;
}

export function ConcertForm({ onSubmit, submitting = false, serverFieldErrors }: ConcertFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateConcertInput>({
    resolver: zodResolver(createConcertSchema),
    defaultValues: { name: '', description: '', totalSeats: undefined },
  });

  return (
    <Card>
      <h2 className="mb-4 text-2xl font-bold text-primary">Create</h2>
      <div className="mb-6 h-px bg-[var(--border)]" />
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-5"
        data-testid="concert-form"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Input
            label="Concert Name"
            testId="concert-name-input"
            placeholder="Please input concert name"
            error={errors.name?.message ?? serverFieldErrors?.name}
            {...register('name')}
          />
          <Input
            label="Total of seat"
            testId="concert-seats-input"
            type="number"
            min={1}
            placeholder="500"
            trailingIcon={<PersonIcon />}
            error={errors.totalSeats?.message ?? serverFieldErrors?.totalSeats}
            {...register('totalSeats')}
          />
        </div>

        <Textarea
          label="Description"
          testId="concert-description-input"
          placeholder="Please input description"
          error={errors.description?.message ?? serverFieldErrors?.description}
          {...register('description')}
        />

        <div className="flex justify-end">
          <Button type="submit" loading={submitting} data-testid="concert-save-btn">
            <SaveIcon width={16} height={16} />
            Save
          </Button>
        </div>
      </form>
    </Card>
  );
}
