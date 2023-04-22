export default function rank(progress, total) {
  const fraction = progress / total;
  if (fraction >= 0.95) {
    return 'S';
  } else if (fraction >= 0.8) {
    return 'A';
  } else if (fraction >= 0.6) {
    return 'B';
  } else if (fraction >= 0.4) {
    return 'C';
  } else if (fraction >= 0.2) {
    return 'D';
  } else if (fraction > 0) {
    return 'E';
  } else {
    return 'None';
  }
}

export function achievedNewRank(numCompletedObjectives, numTotalObjectives) {
  const oldRank = rank(numCompletedObjectives - 1, numTotalObjectives);
  const newRank = rank(numCompletedObjectives, numTotalObjectives);
  return oldRank !== newRank ? newRank : false;
}
