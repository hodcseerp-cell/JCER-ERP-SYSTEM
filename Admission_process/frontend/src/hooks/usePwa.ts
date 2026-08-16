import { useState, useEffect } from 'react';
import pwaManager from '../utils/pwaManager';

export function usePwa() {
  const [canInstall, setCanInstall] = useState(pwaManager.canInstallApp());
  const [isInstalled, setIsInstalled] = useState(pwaManager.isAppInstalled());
  const [showRefreshModal, setShowRefreshModal] = useState(false);

  useEffect(() => {
    setCanInstall(pwaManager.canInstallApp());
    setIsInstalled(pwaManager.isAppInstalled());

    const unsubscribe = pwaManager.onPwaStateChange(() => {
      setCanInstall(pwaManager.canInstallApp());
      setIsInstalled(pwaManager.isAppInstalled());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleInstall = async () => {
    await pwaManager.installApp();
  };

  const triggerRefresh = () => {
    setShowRefreshModal(true);
  };

  const confirmRefresh = async () => {
    setShowRefreshModal(false);
    await pwaManager.refreshApp();
  };

  return {
    canInstall,
    isInstalled,
    handleInstall,
    triggerRefresh,
    confirmRefresh,
    showRefreshModal,
    setShowRefreshModal,
  };
}

export default usePwa;
