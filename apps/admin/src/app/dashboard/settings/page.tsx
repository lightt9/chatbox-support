'use client';

import { useState } from 'react';
import { Settings, Save, Globe, Bell, Shield, Palette } from 'lucide-react';

const settingsSections = [
  { id: 'general', name: 'General', icon: Globe },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'appearance', name: 'Appearance', icon: Palette },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your platform configuration and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Settings navigation */}
        <div className="space-y-1">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <section.icon className="h-4 w-4" />
              {section.name}
            </button>
          ))}
        </div>

        {/* Settings content */}
        <div className="lg:col-span-3">
          {activeSection === 'general' && (
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">General Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure your platform-wide settings
              </p>

              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform Name</label>
                  <input
                    type="text"
                    defaultValue="ChatBox Support"
                    className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Support Email</label>
                  <input
                    type="email"
                    defaultValue="support@chatbox.io"
                    className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Language</label>
                  <select className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Timezone</label>
                  <select className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option>UTC</option>
                    <option>America/New_York</option>
                    <option>America/Chicago</option>
                    <option>America/Los_Angeles</option>
                    <option>Europe/London</option>
                    <option>Europe/Berlin</option>
                  </select>
                </div>

                <button className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Notification Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure how you receive notifications
              </p>

              <div className="mt-6 space-y-4">
                {[
                  'Email notifications for new conversations',
                  'Email notifications for escalations',
                  'Browser push notifications',
                  'Daily summary email',
                  'Weekly reports email',
                ].map((label) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-md border px-4 py-3"
                  >
                    <span className="text-sm">{label}</span>
                    <button className="relative h-6 w-11 rounded-full bg-primary transition-colors">
                      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform translate-x-5" />
                    </button>
                  </div>
                ))}

                <button className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Security Settings</h3>
              <p className="text-sm text-muted-foreground">
                Manage authentication and security options
              </p>

              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    defaultValue={30}
                    className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border px-4 py-3 max-w-md">
                  <span className="text-sm">Require 2FA for all users</span>
                  <button className="relative h-6 w-11 rounded-full bg-muted transition-colors">
                    <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-md border px-4 py-3 max-w-md">
                  <span className="text-sm">Enable SSO</span>
                  <button className="relative h-6 w-11 rounded-full bg-muted transition-colors">
                    <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" />
                  </button>
                </div>

                <button className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Appearance Settings</h3>
              <p className="text-sm text-muted-foreground">
                Customize the look and feel of your admin panel
              </p>

              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme</label>
                  <div className="flex gap-3">
                    <button className="rounded-md border-2 border-primary px-4 py-2 text-sm font-medium">
                      Light
                    </button>
                    <button className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:border-primary">
                      Dark
                    </button>
                    <button className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:border-primary">
                      System
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Primary Color</label>
                  <div className="flex gap-2">
                    {[
                      'bg-blue-600',
                      'bg-purple-600',
                      'bg-green-600',
                      'bg-orange-600',
                      'bg-red-600',
                      'bg-pink-600',
                    ].map((color) => (
                      <button
                        key={color}
                        className={`h-8 w-8 rounded-full ${color} ring-2 ring-offset-2 ${
                          color === 'bg-blue-600'
                            ? 'ring-primary'
                            : 'ring-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
