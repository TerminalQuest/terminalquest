import * as jetpack from 'fs-jetpack';
import { staticFilePath } from '../../common/fs_utils';
import TiledService from '../../common/tiled';
import levelLoader from '../../common/levelLoader';

class InteractionTextService {
  defaultTextList = [];
  tiledIdMaps = {};
  currentLevelTextList = [];

  load(interactionDirPath) {
    const flavorTextFilePath = `${interactionDirPath}/flavorText.json`;
    const staticPath = staticFilePath(flavorTextFilePath);
    const flavorTextFile = jetpack.read(staticPath, 'json');

    this.defaultTextList = flavorTextFile.text;
    this.tiledIdMaps = flavorTextFile.tiledIdMaps;
  }

  loadLevelOverrides(levelName) {
    const levelInfo = levelLoader.getLevel(levelName);

    this.currentLevelTextList = levelInfo.flavorTextOverrides || {};
  }

  convertGidToKey(gid) {
    const ts = TiledService.getTilesetFromGid(gid);
    const name = (ts && ts.name) ? ts.name : '';

    return (
      this.tiledIdMaps[name] &&
      this.tiledIdMaps[name][TiledService.convertPhaserGidToTiledId(gid)]
    );
  }

  getText({ key, gid }) {
    if (!key) {
      key = this.convertGidToKey(gid);
    }

    if (!key) {
      // This object's id doesn't have a mapping in flavorText.tiledIdMaps and cannot
      // have its flavor text looked up.
      return undefined;
    }

    const levelText = this.currentLevelTextList[key];

    if (levelText) {
      return levelText;
    }

    const defaultText = this.defaultTextList[key];
    if (!defaultText) {
      return;
    }

    return defaultText;
  }
}

export default new InteractionTextService();
