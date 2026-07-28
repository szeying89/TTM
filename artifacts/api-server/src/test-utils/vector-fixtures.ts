// Distinct, non-degenerate embedding vectors for tests that exercise pgvector
// cosine-similarity retrieval. Using the same all-zero vector across multiple
// test files makes cosine distance (0/0 => NaN) undefined and ranking
// unreliable once technique_chunks accumulates rows seeded by other test
// files sharing the same database - each test file should pick its own
// index here so its rows are the unambiguous nearest match for its own
// queries regardless of what else is in the table.
export function oneHotVector(index: number, dimensions = 1024): number[] {
  const vector = new Array(dimensions).fill(0);
  vector[index % dimensions] = 1;
  return vector;
}
