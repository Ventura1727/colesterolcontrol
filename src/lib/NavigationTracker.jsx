import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { pagesConfig } from '@/pages.config';

export default function NavigationTracker() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { Pages, mainPage } = pagesConfig;
  const mainPageKey = mainPage ?? Object.keys(Pages)[0];

  // Post navigation changes to parent window
  useEffect(() => {
    window.parent?.postMessage(
      {
        type: "app_changed_url",
        url: window.location.href,
      },
      "*"
    );
  }, [location]);

  // Track navigation (Base44 removido)
  useEffect(() => {
    const pathname = location.pathname;
    let pageName;

    if (pathname === "/" || pathname === "") {
      pageName = mainPageKey;
    } else {
      const pathSegment = pathname.replace(/^\//, "").split("/")[0];
      const pageKeys = Object.keys(Pages);
      const matchedKey = pageKeys.find(
        (key) => key.toLowerCase() === pathSegment.toLowerCase()
      );
      pageName = matchedKey || null;
    }

    if (isAuthenticated && pageName) {
      // Aqui você pode integrar com Supabase ou outro serviço de logs futuramente
      console.log("[NavigationTracker] User navigated to:", pageName);
    }
  }, [location, isAuthenticated, Pages, mainPageKey]);

  return null;
}
