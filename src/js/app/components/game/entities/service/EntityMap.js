import Flame from '../Flame';
import FloatingArrow from '../FloatingArrow';
import HackableBarrier from '../HackableBarrier';
import HackableChest from '../HackableChest';
import HighlightTile from '../HighlightTile';
import InteractableObject from '../InteractableObject';
import NonPlayerCharacter from '../NonPlayerCharacter';
import Player from '../Player';
import TileObject from '../TileObject';
import TransitionArea from '../TransitionArea';
import TriggerArea from '../TriggerArea';
import Laser from '../Laser';
import Collider from '../Collider';
import MapObject from '../base/MapObject';

const EntityMap = {
  npc: {
    type: NonPlayerCharacter,
    collections: ['npcs'],
    group: 'objects',
  },
  interactable: {
    type: InteractableObject,
    collections: ['interactables'],
    group: '',
  },
  levelChange: {
    type: TransitionArea,
    collections: ['transitions'],
    group: '',
  },
  chest: {
    type: HackableChest,
    collections: ['interactables'],
    group: 'objects',
  },
  barrier: {
    type: HackableBarrier,
    collections: ['interactables'],
    group: 'objects',
  },
  player: {
    type: Player,
    collections: ['player'],
    group: 'objects',
  },
  'highlight-tile': {
    type: HighlightTile,
    collections: [],
    group: 'objects',
  },
  arrow: {
    type: FloatingArrow,
    collections: [],
    group: 'ui',
  },
  'tile-object': {
    type: TileObject,
    collections: ['interactables'],
    group: 'objects',
  },
  flame: {
    type: Flame,
    collections: [],
    group: 'objects',
  },
  triggerArea: {
    type: TriggerArea,
    collections: ['triggerAreas'],
    group: '',
  },
  laser: {
    type: Laser,
    collections: [],
    group: '',
  },
  collider: {
    type: Collider,
    collections: [],
    group: 'objects',
  },
  point: {
    type: MapObject,
    collections: ['points'],
    group: '',
  },
};

export default EntityMap;
