import Jimp from 'jimp';
import { staticFilePath } from './fs_utils';

const avatarColors = {
  body: [
    { r: 123, g: 67, b: 2 },
    { r: 196, g: 145, b: 53 },
    { r: 230, g: 198, b: 131 },
    { r: 255, g: 214, b: 92 },
    { r: 255, g: 228, b: 172 },
  ],
  eyes: [
    { r: 33, g: 33, b: 33 },
    { r: 5, g: 132, b: 255 },
    { r: 4, g: 150, b: 255 },
    { r: 71, g: 35, b: 1 },
    { r: 123, g: 143, b: 168 },
    { r: 2, g: 152, b: 2 },
  ],
  hair: [
    { r: 33, g: 33, b: 33 },
    { r: 88, g: 47, b: 1 },
    { r: 173, g: 133, b: 86 },
    { r: 6, g: 2, b: 255 },
    { r: 255, g: 64, b: 255 },
    { r: 255, g: 250, b: 165 },
    { r: 39, g: 17, b: 1 },
  ],
};

function overlayColor(image, rgb) {
  image.color([{ apply: 'mix', params: [rgb, 100] }]);
}

export const NUM_FEATURES = {
  sc: avatarColors.body.length,
  ec: avatarColors.eyes.length + 1, // extra for glasses option
  hc: avatarColors.hair.length,
  hs: 6 + 1, // extra for no hair option
};

export function generateDataURI({ ec, hs, sc, hc }, callback) {
  const imagePromises = [
    Jimp.read(staticFilePath('avatars/parts/body.png')),
    Jimp.read(staticFilePath('avatars/parts/face.png')),
    Jimp.read(staticFilePath('avatars/parts/onesie.png')),
  ];

  // Grab the appropriate eye image
  if (ec !== NUM_FEATURES.ec - 1) {
    imagePromises.push(Jimp.read(staticFilePath('avatars/parts/eyes.png')));
  } else {
    imagePromises.push(Jimp.read(staticFilePath('avatars/parts/glasses.png')));
  }

  // Only grab hair stuff if "no hair" option isn't selected (it's the last one)
  if (hs !== NUM_FEATURES.hs - 1) {
    imagePromises.push(
      Jimp.read(staticFilePath(`avatars/parts/hair${hs}.png`))
    );

    // Only grab hair overlays for styles have one
    if ([2, 3, 4, 5].includes(hs)) {
      imagePromises.push(
        Jimp.read(staticFilePath(`avatars/parts/hair${hs}_overlay.png`))
      );
    }
  }

  // Wait until all files are loaded before compositing
  Promise.all(imagePromises).then(values => {
    const [body, face, onesie, eyes, hair, hairOverlay] = values;

    overlayColor(body, avatarColors.body[sc]);

    // Only color hair if "no hair" is not selected (the last hair option)
    if (hs !== NUM_FEATURES.hs - 1) {
      overlayColor(hair, avatarColors.hair[hc]);
    }

    // Only color eyes if glasses are not selected (the last eye option)
    if (ec !== NUM_FEATURES.ec - 1) {
      overlayColor(eyes, avatarColors.eyes[ec]);
    }

    body
      .composite(face, 0, 0)
      .composite(onesie, 0, 0)
      .composite(eyes, 0, 0);

    // Only add hair and overlay if "no hair" is not selected (the last hair option)
    if (hs !== NUM_FEATURES.hs - 1) {
      body.composite(hair, 0, 0);
      if (hairOverlay) {
        body.composite(hairOverlay, 0, 0);
      }
    }

    // TODO(nirav) somehow return a Promise?
    body.getBase64Async(Jimp.MIME_PNG).then(uri => callback(uri));
  });
}
