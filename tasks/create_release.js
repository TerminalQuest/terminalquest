require('dotenv').config();

const fs = require('fs');
const path = require('path');
const branch = require('git-branch');
const jetpack = require('fs-jetpack');
const md5 = require('md5-file/promise');
const modclean = require('modclean');
const tar = require('tar');
const { db, bucket, firebaseAdmin } = require('./shared/firebase');
const pkgInfo = require('../public/package.json');

// Bundle name differs per platform
let tarballFileName = '';
switch (process.platform) {
  case 'darwin':
    tarballFileName = 'mac.tgz';
    break;
  case 'win32':
    tarballFileName = 'windows.tgz';
    break;
  default:
    tarballFileName = 'linux.tgz';
    break;
}

// Create bundle
(async () => {
  try {
    // Information about the eventual release for GCP
    const { version } = pkgInfo;
    let gitBranch = await branch();

    // Only cut release builds for git branches that have been configured in
    // The release channels collection
    const channelsRef = db.collection('releaseChannels');
    const channelsSnapshot = await channelsRef
      .where('name', '==', gitBranch)
      .get();

    if (channelsSnapshot.docs.length < 1) {
      // Don't create a build if there isn't a channel for this git branch
      return console.warn('No channel exists for this git branch, exiting...');
    }

    const channelData = channelsSnapshot.docs[0];
    console.log(`Creating new release build for ${channelData.get('name')}`);

    // Necessary paths for generating build
    const rootDir = path.resolve(__dirname, '..');
    const distDir = path.resolve(rootDir, 'dist');
    const publicDir = path.resolve(rootDir, 'public');
    const tarballFilePath = path.resolve(distDir, tarballFileName);

    // By this point, we assume a directory has been created which contains the
    // necessary node_modules and html/css/js to power the game in the public
    // folder create an empty dist directory where the release tarball will go
    await jetpack.dirAsync(distDir, { empty: true });

    // Prune all the files we can with modclean
    const cleaner = modclean({
      cwd: publicDir,
      // tolerate markdown files, since we will need them for extensions
      ignorePatterns: ['example.js', 'makefile*', '*.md', '*.MD', '*.markdown'],
    });
    console.log('Pruning node_modules...');
    // await cleaner.clean();

    // Create tarball with the current public folder
    console.log('Generating tarball...');
    await tar.c(
      {
        gzip: true,
        file: path.join('dist', tarballFileName),
        cwd: rootDir,
      },
      ['public']
    );

    // Generate checksum hash
    const hash = await md5(tarballFilePath);
    console.log(`${tarballFileName} created, checksum: ${hash}`);

    // Upload package to google cloud
    console.log('Uploading release tarball...');
    await bucket.upload(tarballFilePath, {
      destination: `releases/${gitBranch}/${version}/${tarballFileName}`,
      resumable: false,
    });
    console.log('New release uploaded.');

    // Check if this release version has been created in Firebase already
    const releasesRef = db.collection('releases');
    const snapshot = await releasesRef
      .where('channelName', '==', gitBranch)
      .where('name', '==', version)
      .get();

    if (snapshot.docs.length < 1) {
      // Create a new release with a single file/checksum
      const checksums = {};
      checksums[tarballFileName] = hash;
      await releasesRef.add({
        name: version,
        channelName: gitBranch,
        createdAt: firebaseAdmin.firestore.Timestamp.fromDate(new Date()),
        checksums,
      });
      console.log('New release created.');
    } else {
      // release exists - update it with the new file/checksum
      const doc = snapshot.docs[0];
      const checksums = doc.get('checksums');
      checksums[tarballFileName] = hash;
      await releasesRef.doc(doc.id).update({ checksums });
      console.log('New release file checksum added.');
    }

    // Hooray!
    console.log(`
********************************************************************************
Boom! A new TerminalQuest release has been uploaded:
Channel: ${channelData.get('displayName')} (branch: ${gitBranch})
Version: ${version}

File Info: 
${tarballFileName}
Size: ${fs.statSync(tarballFilePath).size / 1000000} MB
Checksum: ${hash}
********************************************************************************
    `);
  } catch (e) {
    console.error(`Application distribution has not been created.`);
    console.error(e);
  }
})();
