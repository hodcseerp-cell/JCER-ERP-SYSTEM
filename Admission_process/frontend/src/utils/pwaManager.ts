import toast from 'react-hot-toast';

type PwaStateListener = () => void;

class PwaManager {
  private deferredPrompt: any = null;
  private isInstalled: boolean = false;
  private listeners: Set<PwaStateListener> = new Set();
  private updateSwFn: ((reloadPage?: boolean) => Promise<void>) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.checkDisplayMode();
      this.initEventListeners();
    }
  }

  private checkDisplayMode() {
    if (typeof window === 'undefined') return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    
    this.isInstalled = isStandalone;
  }

  private initEventListeners() {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.notifyListeners();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.isInstalled = true;
      this.notifyListeners();
      toast.success('🎉 JCER ERP App installed successfully!');
    });

    if (window.matchMedia) {
      window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
        this.isInstalled = e.matches;
        this.notifyListeners();
      });
    }
  }

  public registerServiceWorkerUpdater(updater: (reloadPage?: boolean) => Promise<void>) {
    this.updateSwFn = updater;
  }

  public onPwaStateChange(listener: PwaStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('PWA listener error:', err);
      }
    });
  }

  public canInstallApp(): boolean {
    if (this.isInstalled) return false;
    return !!this.deferredPrompt;
  }

  public isAppInstalled(): boolean {
    return this.isInstalled;
  }

  public async installApp(): Promise<boolean> {
    if (this.isInstalled) {
      toast('JCER ERP App is already installed on this device and running in standalone mode.', { icon: 'ℹ️', duration: 4000 });
      return false;
    }

    if (!this.deferredPrompt) {
      // Diagnostic checks for why prompt is not immediately available
      const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const hasServiceWorker = 'serviceWorker' in navigator;

      if (!isSecureContext) {
        toast('PWA installation requires a secure HTTPS connection or localhost.', { icon: '⚠️', duration: 5000 });
        return false;
      }

      if (!hasServiceWorker) {
        toast('Native PWA installation is not supported by this browser.', { icon: 'ℹ️', duration: 5000 });
        return false;
      }

      toast('Installation is not currently available. Please try again after the app has finished loading.', {
        icon: 'ℹ️',
        duration: 5000,
      });
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        toast.success('🎉 JCER ERP App installed successfully!');
        this.deferredPrompt = null;
        this.isInstalled = true;
        this.notifyListeners();
        return true;
      } else {
        toast('App installation prompt was dismissed.', { icon: 'ℹ️', duration: 3000 });
        return false;
      }
    } catch (error) {
      console.error('Error triggering PWA install prompt:', error);
      toast.error('Failed to open installation prompt.');
      return false;
    }
  }

  public clearAppSession(): void {
    if (typeof window === 'undefined') return;

    // Targeted removal of Auth Tokens & Session state
    const authKeys = [
      'token',
      'user',
      'refreshToken',
      'jcer_auth_state',
      'jcer_user_role',
      'jcer_session_token',
      'jcer_forgot_password_requests',
    ];

    authKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Clear sessionStorage
    sessionStorage.clear();
  }

  public async refreshApp(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // 1. Clear targeted client session
      this.clearAppSession();

      // 2. Safely clear Cache Storage (without deleting IndexedDB or server data)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // 3. Invoke Service Worker update if available
      if (this.updateSwFn) {
        await this.updateSwFn(true);
      } else if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
        }
      }
    } catch (error) {
      console.error('Error during app refresh:', error);
    } finally {
      // 4. Redirect to login page for re-authentication
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/student') || currentPath.startsWith('/admission')) {
        window.location.href = '/admission/login';
      } else {
        window.location.href = '/login';
      }
    }
  }
}

export const pwaManager = new PwaManager();
export default pwaManager;
