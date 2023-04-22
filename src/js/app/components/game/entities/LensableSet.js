export default class LensableSet {
  constructor(lens = value => value, values = []) {
    if (!Array.isArray(values)) {
      throw new Error(
        `Invalid type of values for LensableSet. Expected an Array.`
      );
    }
    this._values = values;
    this.lens = lens;
  }

  get size() {
    return this._values.length;
  }

  find(target) {
    return this._values.find(value => this.lens(value) === this.lens(target));
  }

  add(target) {
    if (!this.has(target)) {
      this._values.push(target);
    }
  }

  has(target) {
    return this._values.some(value => this.lens(value) === this.lens(target));
  }

  clone() {
    return new LensableSet(this.lens, [...this._values]);
  }

  delete(target) {
    const index = this._values.findIndex(
      value => this.lens(value) === this.lens(target)
    );

    if (index === -1) {
      return undefined;
    }

    return this._values.splice(index, 1);
  }

  clear() {
    this._values = [];
  }

  values() {
    return this._values;
  }

  [Symbol.iterator]() {
    return this._values.values();
  }
}
