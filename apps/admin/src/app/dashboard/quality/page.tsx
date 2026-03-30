'use client';

import {
  ShieldCheck,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const qualityTickets = [
  {
    id: 'QA-001',
    conversation: 'Cannot access billing portal',
    agent: 'Alice Martinez',
    type: 'Incorrect Response',
    status: 'open',
    severity: 'high',
    createdAt: '2 hours ago',
  },
  {
    id: 'QA-002',
    conversation: 'Integration setup help',
    agent: 'AI Agent',
    type: 'Hallucination',
    status: 'investigating',
    severity: 'critical',
    createdAt: '4 hours ago',
  },
  {
    id: 'QA-003',
    conversation: 'Pricing question',
    agent: 'Bob Wilson',
    type: 'Tone Issue',
    status: 'resolved',
    severity: 'low',
    createdAt: '1 day ago',
  },
  {
    id: 'QA-004',
    conversation: 'Data export request',
    agent: 'AI Agent',
    type: 'Incorrect Response',
    status: 'open',
    severity: 'medium',
    createdAt: '1 day ago',
  },
  {
    id: 'QA-005',
    conversation: 'Account deletion',
    agent: 'Carol Thompson',
    type: 'Process Violation',
    status: 'resolved',
    severity: 'high',
    createdAt: '3 days ago',
  },
];

const statusIcons: Record<string, typeof AlertCircle> = {
  open: AlertCircle,
  investigating: Eye,
  resolved: CheckCircle2,
};

const statusColors: Record<string, string> = {
  open: 'bg-red-50 text-red-700',
  investigating: 'bg-amber-50 text-amber-700',
  resolved: 'bg-green-50 text-green-700',
};

const severityColors: Record<string, string> = {
  critical: 'bg-purple-50 text-purple-700',
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-blue-50 text-blue-700',
};

export default function QualityPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Quality Assurance
          </h1>
          <p className="text-muted-foreground">
            Review and track quality issues in conversations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
            2 Open
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
            1 Investigating
          </span>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search quality tickets..."
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <button className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Quality tickets table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Conversation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {qualityTickets.map((ticket) => {
                const StatusIcon = statusIcons[ticket.status] || AlertCircle;
                return (
                  <tr
                    key={ticket.id}
                    className="hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-medium">
                      {ticket.id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {ticket.conversation}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {ticket.agent}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {ticket.type}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                          severityColors[ticket.severity]
                        )}
                      >
                        {ticket.severity}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                          statusColors[ticket.status]
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {ticket.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {ticket.createdAt}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
