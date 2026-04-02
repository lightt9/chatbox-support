const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

interface GoogleCredentialResponse {
  credential: string;
}

interface GooglePayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

function decodeJwtPayload(token: string): GooglePayload {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

export function isGoogleConfigured(): boolean {
  return GOOGLE_CLIENT_ID.length > 0;
}

export function initGoogleOneTap(
  onSuccess: (profile: {
    provider: 'google';
    providerId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) => void,
): void {
  if (!isGoogleConfigured()) return;

  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = () => {
    window.google?.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: GoogleCredentialResponse) => {
        const payload = decodeJwtPayload(response.credential);
        onSuccess({
          provider: 'google',
          providerId: payload.sub,
          email: payload.email,
          name: payload.name,
          avatarUrl: payload.picture,
        });
      },
    });
  };
  document.head.appendChild(script);
}

export function triggerGoogleSignIn(): void {
  window.google?.accounts.id.prompt();
}

export function renderGoogleButton(elementId: string): void {
  window.google?.accounts.id.renderButton(
    document.getElementById(elementId)!,
    {
      type: 'standard',
      shape: 'rectangular',
      theme: 'outline',
      size: 'large',
      width: 400,
      text: 'continue_with',
    },
  );
}

// Type augmentation for google identity services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          prompt: () => void;
          renderButton: (
            element: HTMLElement,
            config: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}
