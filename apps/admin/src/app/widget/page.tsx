'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function WidgetLoader() {
  const searchParams = useSearchParams();
  const publicKey = searchParams.get('key') ?? '';
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) { setError('Missing key'); return; }

    fetch(`${API_URL}/chat/init/${encodeURIComponent(publicKey)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setCompanyId(data.companyId);

        // Send config back to parent window for button styling
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'chatbox:config', headerColor: data.config?.headerColor, position: data.config?.widgetPosition }, '*');
        }
      })
      .catch(() => setError('Failed to load'));
  }, [publicKey]);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui', color: '#666', fontSize: '14px' }}>
        {error}
      </div>
    );
  }

  if (!companyId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Dynamically import and render the chat widget with the resolved company ID
  return <EmbeddedWidget companyId={companyId} />;
}

function EmbeddedWidget({ companyId }: { companyId: string }) {
  const [Widget, setWidget] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    // Set env-like globals for the widget component
    (window as any).__CHATBOX_COMPANY_ID = companyId;
    (window as any).__CHATBOX_EMBEDDED = true;

    // Dynamic import of the chat widget
    import('../demo/chat-widget').then((mod) => {
      setWidget(() => mod.ChatWidget);
    });
  }, [companyId]);

  if (!Widget) return null;

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <EmbeddedWidgetWrapper companyId={companyId} WidgetComponent={Widget} />
    </div>
  );
}

function EmbeddedWidgetWrapper({ companyId, WidgetComponent }: { companyId: string; WidgetComponent: React.ComponentType }) {
  // Force the widget to be open in embedded mode (no floating button)
  useEffect(() => {
    // Override the company ID for the widget
    const style = document.createElement('style');
    style.textContent = `
      body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
    `;
    document.head.appendChild(style);

    // Notify parent of close events
    const handleClose = () => {
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'chatbox:close' }, '*');
      }
    };

    // Listen for widget close attempts
    window.addEventListener('chatbox:close', handleClose);
    return () => window.removeEventListener('chatbox:close', handleClose);
  }, []);

  return <WidgetComponent />;
}

export default function WidgetPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <WidgetLoader />
    </Suspense>
  );
}
