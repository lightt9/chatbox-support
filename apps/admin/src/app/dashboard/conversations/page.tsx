'use client';

import { Search, Filter, MessageSquare, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const placeholderConversations = [
  {
    id: '1',
    customer: 'John Smith',
    company: 'Acme Corp',
    subject: 'Cannot access billing portal',
    status: 'active',
    priority: 'high',
    lastMessage: '2 minutes ago',
    messages: 12,
  },
  {
    id: '2',
    customer: 'Sarah Johnson',
    company: 'TechStart Inc',
    subject: 'Integration setup help',
    status: 'waiting',
    priority: 'medium',
    lastMessage: '15 minutes ago',
    messages: 5,
  },
  {
    id: '3',
    customer: 'Mike Chen',
    company: 'GlobalRetail',
    subject: 'Bulk import not working',
    status: 'active',
    priority: 'high',
    lastMessage: '1 hour ago',
    messages: 8,
  },
  {
    id: '4',
    customer: 'Emily Davis',
    company: 'HealthPlus',
    subject: 'Feature request: custom fields',
    status: 'resolved',
    priority: 'low',
    lastMessage: '3 hours ago',
    messages: 3,
  },
  {
    id: '5',
    customer: 'Alex Turner',
    company: 'EduLearn',
    subject: 'SSO configuration question',
    status: 'escalated',
    priority: 'high',
    lastMessage: '30 minutes ago',
    messages: 15,
  },
  {
    id: '6',
    customer: 'Lisa Wang',
    company: 'Acme Corp',
    subject: 'API rate limiting issue',
    status: 'active',
    priority: 'medium',
    lastMessage: '45 minutes ago',
    messages: 6,
  },
];

const statusColors: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  waiting: 'bg-amber-50 text-amber-700',
  resolved: 'bg-gray-100 text-gray-700',
  escalated: 'bg-red-50 text-red-700',
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-blue-50 text-blue-700',
};

export default function ConversationsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
        <p className="text-muted-foreground">
          Monitor and manage all support conversations
        </p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <button className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Conversation list */}
      <div className="space-y-3">
        {placeholderConversations.map((conversation) => (
          <div
            key={conversation.id}
            className="rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30 cursor-pointer"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">
                    {conversation.subject}
                  </h3>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      statusColors[conversation.status]
                    )}
                  >
                    {conversation.status}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      priorityColors[conversation.priority]
                    )}
                  >
                    {conversation.priority}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {conversation.customer}
                  </span>
                  <span>{conversation.company}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {conversation.messages}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {conversation.lastMessage}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
