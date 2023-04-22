import React, { useState, useEffect, useContext, createContext } from 'react';
import fileUrl from 'file-url';
import { resolveAbsolutePath } from '../../../common/assetLoader';

const AssetLoaderContext = createContext({
  isLoaded: false,
});

const AssetLoaderProvider = ({ assetPaths = [[]], children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [assets, setAssets] = useState({});

  const set = (object, key, value) => {
    return {
      ...object,
      [key]: value,
    };
  };

  const addAsset = async path => {
    const assetPath = await resolveAbsolutePath(path);
    const asset = fileUrl(assetPath);

    // We use the path as the key for this asset
    setAssets(set(assets, path, asset));
  };

  const addAssets = async paths => {
    const assetPromises = paths.map(async path =>  {
      const assetPath = await resolveAbsolutePath(path);
      return fileUrl(assetPath);
    });
    const absolutePaths = await Promise.all(assetPromises);

    const newAssets = {};

    absolutePaths.forEach((absolutePath, index) => {
      const assetPath = paths[index];

      newAssets[assetPath] = absolutePath;
    });

    setAssets({ ...assets, ...newAssets });
  };

  useEffect(() => {
    const resolveAssetPaths = async () => {
      let initialAssets = {};

      const assetResolutionPromises = assetPaths.map(async ([key, path]) => {
        const assetPath = await resolveAbsolutePath(path);
        const asset = fileUrl(assetPath);

        initialAssets[key] = asset;
      });

      await Promise.all(assetResolutionPromises);

      setAssets(initialAssets);
      setIsLoaded(true);
    };

    setIsLoaded(false);
    resolveAssetPaths();
  }, [assetPaths, setAssets, setIsLoaded]);

  // return { isLoaded, assets, addAsset };
  return (
    <AssetLoaderContext.Provider
      value={{ isLoaded, assets, addAsset, addAssets }}
    >
      {children}
    </AssetLoaderContext.Provider>
  );
};

const useAssetLoader = () => useContext(AssetLoaderContext);

export { AssetLoaderProvider };
export default useAssetLoader;
