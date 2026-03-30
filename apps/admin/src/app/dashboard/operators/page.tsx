'use client';

import { Users, Plus, Search, MoreHorizontal, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const placeholderOperators = [
  {
    id: '1',
    name: 'Alice Martinez',
    email: 'alice@chatbox.io',
    role: 'Senior Agent',
    status: 'online',
    activeChats: 4,
    resolvedToday: 18,
    avgRating: 4.8,
  },
  {
    id: '2',
    name: 'Bob Wilson',
    email: 'bob@chatbox.io',
    role: 'Agent',
    status: 'online',
    activeChats: 3,
    resolvedToday: 12,
    avgRating: 4.5,
  },
  {
    id: '3',
    name: 'Carol Thompson',
    email: 'carol@chatbox.io',
    role: 'Team Lead',
    status: 'away',
    activeChats: 1,
    resolvedToday: 8,
    avgRating: 4.9,
  },
  {
    id: '4',
    name: 'David Lee',
    email: 'david@chatbox.io',
    role: 'Agent',
    status: 'offline',
    activeChats: 0,
    resolvedToday: 15,
    avgRating: 4.6,
  },
  {
    id: '5',
    name: 'Eva Nguyen',
    email: 'eva@chatbox.io',
    role: 'Agent',
    status: 'online',
    activeChats: 5,
    resolvedToday: 22,
    avgRating: 4.7,
  },
];

const statusColors: Record<string, string> = {
  online: 'text-green-500',
  away: 'text-amber-500',
  offline: 'text-gray-400',
};

export default function OperatorsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operators</h1>
          <p className="text-muted-foreground">
            Manage support agents and their assignments
          </p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Operator
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search operators..."
          className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {/* Operator cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {placeholderOperators.map((operator) => (
          <div
            key={operator.id}
            className="rounded-lg border bg-card p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {operator.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <Circle
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-current',
                      statusColors[operator.status]
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold">{operator.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {operator.role}
                  </p>
                </div>
              </div>
              <button className="rounded-md p-1 hover:bg-muted">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4">
              <div className="text-center">
                <p className="text-lg font-bold">{operator.activeChats}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{operator.resolvedToday}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{operator.avgRating}</p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
