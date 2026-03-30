'use client';

import {
  BookOpen,
  FolderTree,
  Plus,
  Search,
  FileText,
  ChevronRight,
} from 'lucide-react';

const categories = [
  {
    name: 'Getting Started',
    count: 12,
    children: ['Installation', 'Quick Start', 'Configuration'],
  },
  {
    name: 'Account & Billing',
    count: 8,
    children: ['Plans', 'Invoices', 'Payment Methods'],
  },
  {
    name: 'Integrations',
    count: 15,
    children: ['REST API', 'Webhooks', 'Third-party'],
  },
  {
    name: 'Troubleshooting',
    count: 22,
    children: ['Common Issues', 'Error Codes', 'Performance'],
  },
];

const recentEntries = [
  {
    id: '1',
    title: 'How to set up SSO with SAML',
    category: 'Integrations',
    updatedAt: '2 hours ago',
    status: 'published',
  },
  {
    id: '2',
    title: 'Billing FAQ',
    category: 'Account & Billing',
    updatedAt: '1 day ago',
    status: 'published',
  },
  {
    id: '3',
    title: 'Webhook event reference',
    category: 'Integrations',
    updatedAt: '3 days ago',
    status: 'draft',
  },
  {
    id: '4',
    title: 'Troubleshooting connection timeouts',
    category: 'Troubleshooting',
    updatedAt: '1 week ago',
    status: 'published',
  },
  {
    id: '5',
    title: 'Getting started with the widget',
    category: 'Getting Started',
    updatedAt: '2 weeks ago',
    status: 'published',
  },
];

export default function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Manage articles and training data for AI agents
          </p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          New Article
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Category tree */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Categories</h3>
          </div>
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.name}>
                <button className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted">
                  <span className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    {category.name}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {category.count}
                  </span>
                </button>
                <div className="ml-6 space-y-1">
                  {category.children.map((child) => (
                    <button
                      key={child}
                      className="flex w-full items-center rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {child}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Entries list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search articles..."
              className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {/* Entries */}
          <div className="rounded-lg border bg-card shadow-sm">
            <div className="divide-y">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.category} &middot; Updated {entry.updatedAt}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      entry.status === 'published'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
