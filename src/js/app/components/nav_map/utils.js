function getByIndexWithWrapping(index, array) {
  let wrappedIndex = index % array.length;

  if (wrappedIndex < 0) {
    wrappedIndex += array.length;
  }

  return array[wrappedIndex];
}

function clamp(number, min, max) {
  return Math.min(Math.max(number, min), max);
}

function randIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export { getByIndexWithWrapping, clamp, randIntBetween };
