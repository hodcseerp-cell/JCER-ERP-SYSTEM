let loggingOut = false;

export const forceLogout = (expired = false) => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  const currentPath = window.location.pathname;

  const isPublicPage =
    currentPath === '/' ||
    currentPath === '/login' ||
    currentPath === '/admission/login' ||
    currentPath === '/admission/register' ||
    currentPath === '/admission/type' ||
    currentPath === '/privacy-policy' ||
    currentPath === '/terms-of-use' ||
    currentPath === '/support' ||
    currentPath === '/module-unavailable' ||
    currentPath === '/unauthorized';

  if (isPublicPage) {
    loggingOut = false;
    return;
  }

  if (loggingOut) return;
  loggingOut = true;

  const isAdmissionPath = currentPath.startsWith('/admission');
  const targetLogin = isAdmissionPath ? '/admission/login' : '/login';

  const targetUrl = expired ? `${targetLogin}?expired=true` : targetLogin;
  window.location.replace(targetUrl);
};
