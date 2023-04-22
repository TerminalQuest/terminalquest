import { useEffect, useState } from 'react';
import levelLoader from '../../../common/levelLoader';

const useMissions = () => {
  const [missions, setMissions] = useState();

  useEffect(() => {
    const fetchMissions = async () => {
      const newMissions = await levelLoader.getFullDestinationList();
      setMissions(newMissions);
    };

    fetchMissions();
  }, []);

  return {
    isLoaded: Boolean(missions),
    missions,
  };
};

export default useMissions;
