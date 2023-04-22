/**
 * @typedef {Object} WeightedMapConfig
 * Describes values and weights in the map. A weight is an integer describing
 * the percentage likelihood of a value occuring.
 */

export default class WeightedMap {
  /**
   * WeightedMap is a data structure that allows some values to be selected
   * more often than other values. If the map structure needs to change, a
   * new WeightedMap must be constructed.
   *
   * @param {WeightedMapConfig} map - Describes values and weights in the map.
   * @example
   * const map = new WeightedMap({
   *    commonValue: 70,
   *    lessCommonValue: 25,
   *    leastCommonValue: 5
   * });
   */
  constructor(map) {
    if (!WeightedMap.isMapValid(map)) {
      console.warn(
        'WeightedMap is not valid! Weights must total 100 percent! Out of range values will not get picked.'
      );
    }

    this.map = Object.entries(map);
  }

  static isMapValid(map) {
    const totalWeight = Object.entries(map).reduce((total, [, weight]) => {
      return total + weight;
    }, 0);

    return totalWeight === 100;
  }

  pickRandom() {
    const targetWeight = Phaser.Math.between(0, 99);

    return this.pick(targetWeight);
  }

  pick(targetWeight) {
    if (!Number.isInteger(targetWeight)) {
      console.warn(
        'WeightedMap.pick must take an Integer: [0 - 99]. Rounding targetWeight to nearest Integer.'
      );
      targetWeight = Math.round(targetWeight);
    }

    if (targetWeight > 99) {
      console.warn(
        'WeightedMap.pick must take an Integer: [0 - 99]. Rounding targetWeight down to 99.'
      );
      targetWeight = 99;
    }

    if (targetWeight < 0) {
      console.warn(
        'WeightedMap.pick must take an Integer: [0 - 99]. Rounding targetWeight up to 0.'
      );
      targetWeight = 0;
    }

    let previousWeights = 0;

    const [choice] = this.map.find(([, weight]) => {
      // Each consecutive weightedValue should be compared against the targetedWeight with
      // all previousWeights so we can advance through the array
      if (previousWeights + weight > targetWeight) {
        return true;
      } else {
        // By the time of the final comparison previousWeights + weight is 100
        previousWeights += weight;
      }
    });

    return choice;
  }
}
