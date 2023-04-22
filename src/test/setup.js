import path from 'path';
import jetpack from 'fs-jetpack';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

configure({ 
  adapter: new Adapter()
});

// Bootstrap browser window environment, as we do in our HTML wrapper
[
  path.resolve(
    __dirname, '..', '..', 'public', 'lib', 'phaser-2.13.2.min.js'
  ),
  path.resolve(
    __dirname, '..', '..', 'public', 'lib', 'firebase', 'firebase-app.js'
  ),
  path.resolve(
    __dirname, '..', '..', 'public', 'lib', 'firebase', 'firebase-firestore.js'
  ),
].forEach(path => {
  const code = jetpack.read(path);
  window.eval(code);
});
