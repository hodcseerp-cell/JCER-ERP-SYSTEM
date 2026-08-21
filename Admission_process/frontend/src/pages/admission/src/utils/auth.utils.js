import { activityHeartbeat } from '../../../../services/activityHeartbeat';

let loggingOut = false;

export const forceLogout = (expired = false, reason = '') => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  try {
    activityHeartbeat.stop();
  } catch {
    // ignore
  }

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

  let query = '';
  if (expired) {
    query = reason ? `?expired=true&reason=${encodeURIComponent(reason)}` : '?expired=true';
  }
  window.location.replace(`${targetLogin}${query}`);
};
