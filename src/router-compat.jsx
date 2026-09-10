import { useLocation, useNavigate as useTanStackNavigate, useParams as useTanStackParams } from '@tanstack/react-router';

export function useNavigate() {
  const navigate = useTanStackNavigate();

  return (to, options = {}) => {
    if (typeof to === 'number') {
      if (typeof window !== 'undefined') window.history.go(to);
      return undefined;
    }

    if (typeof to === 'string') {
      try {
        return navigate({ to, replace: Boolean(options?.replace) });
      } catch (e) {
        if (typeof window !== 'undefined') {
          if (options?.replace) {
            window.location.replace(to);
          } else {
            window.location.href = to;
          }
        }
        return undefined;
      }
    }

    return navigate(to);
  };
}

export function useParams() {
  const params = useTanStackParams({ strict: false });
  const pathname = useLocation({ select: (location) => location.pathname });
  const sessionMatch = pathname.match(/^\/teacher\/session\/([^/?#]+)/);

  return {
    ...params,
    ...(sessionMatch ? { id: decodeURIComponent(sessionMatch[1]) } : null),
  };
}