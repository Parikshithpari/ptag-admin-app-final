import { useEffect } from 'react';

export default function usePageTitle(title) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) document.title = `${title} | PTag`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
