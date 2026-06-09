import type { AdminEvent } from '@/lib/types';
import { formatDateTime } from '@/lib/format';

export function HistoryTable({ events }: { events: AdminEvent[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-[var(--border)] bg-white">
      <table data-testid="history-table" className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="px-4 py-3 font-bold">Date time</th>
            <th className="px-4 py-3 font-bold">Username</th>
            <th className="px-4 py-3 font-bold">Concert name</th>
            <th className="px-4 py-3 font-bold">Action</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} data-testid="history-row" className="border-b border-[var(--border)]">
              <td className="px-4 py-3" data-testid="history-row-date">
                {formatDateTime(e.createdAt)}
              </td>
              <td className="px-4 py-3" data-testid="history-row-user">
                {e.user.name}
              </td>
              <td className="px-4 py-3" data-testid="history-row-concert">
                {e.concert.name}
              </td>
              <td className="px-4 py-3" data-testid="history-row-action">
                {e.action === 'RESERVE' ? 'Reserve' : 'Cancel'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
