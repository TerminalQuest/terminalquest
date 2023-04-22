import { useEffect, useState } from 'react';

const useMediaQuery = handler => {
  const viewportWidth = Math.max(
    document.documentElement.clientWidth || 0,
    window.innerWidth || 0
  );

  const [value, setValue] = useState(handler(viewportWidth));

  useEffect(() => {
    const updateValue = () => {
      const viewportWidth = Math.max(
        document.documentElement.clientWidth || 0,
        window.innerWidth || 0
      );
      const viewportHeight = Math.max(
        document.documentElement.clientHeight || 0,
        window.innerHeight || 0
      );

      const newValue = handler(viewportWidth);

      setValue(newValue);
    };

    window.addEventListener('resize', updateValue);

    return () => window.removeEventListener('resize', updateValue);
  }, []);

  return value;
};

export default useMediaQuery;
