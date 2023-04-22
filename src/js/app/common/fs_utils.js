import path from 'path';
import * as jetpack from 'fs-jetpack';
import fileUrl from 'file-url';

/*
Relative paths are different after compilation to the public folder - these
utilities will create them relative to where the actual compiled files will sit
in the bundle.
*/

// Get local filesystem path
export function staticFilePath(relativePath) {
  return path.resolve(__dirname, '..', '..', relativePath);
}

// Get local file URL
export function staticFileUrl(relativePath) {
  const p = staticFilePath(relativePath);
  return fileUrl(p);
}

// Does a static file at the given URL actually exist?
export function sfExists(relativePath) {
  const p = staticFilePath(relativePath);
  return jetpack.exists(p);
}
