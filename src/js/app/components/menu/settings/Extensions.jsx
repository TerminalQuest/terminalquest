import React, { useEffect, useState } from 'react';
import {
  getBundledExtensionDirectories,
  getExternalExtensionDirectories,
  areExtensionsEnabled,
  getExtensionDirectory,
} from '../../../common/extensions';
import Button from '../../Button';
import InlineButton from './InlineButton';
import InputTextField from './InputTextField';
import { remote } from 'electron';

async function getDirectoryPath({ defaultPath, buttonLabel, title }) {
  const dialogueOptions = {
    title,
    message: title,
    buttonLabel,
    properties: ['openDirectory'],
  };

  if (defaultPath) {
    dialogueOptions.defaultPath = defaultPath;
  }

  const result = await remote.dialog.showOpenDialog(dialogueOptions);
  return result.filePaths[0];
}
function ExtensionsList({ extensions }) {
  return extensions.length > 0 ? (
    <ul>
      {extensions.map(({ name, absolutePath, isValid }) => (
        <li key={absolutePath}>
          {name} -{' '}
          <span
            style={{
              color: isValid ? '#00ff00' : '#ff0000',
            }}
          >
            {isValid ? 'loaded' : 'failed'}
          </span>
        </li>
      ))}
    </ul>
  ) : (
    <span>None</span>
  );
}

function AllExtensionsList() {
  const [bundledExtensions, setBundledExtensions] = useState([]);
  const [externalExtensions, setExternalExtensions] = useState([]);

  const loadExtensions = async () => {
    const extensionQueries = [
      getBundledExtensionDirectories(),
      getExternalExtensionDirectories(),
    ];

    const [bundled, external] = await Promise.all(extensionQueries);

    setBundledExtensions(bundled);
    setExternalExtensions(external);
  };

  useEffect(() => {
    loadExtensions();
  }, []);

  return (
    <>
      <h4>External Extensions</h4>
      <p>These extensions are being loaded from the directory above.</p>
      <ExtensionsList extensions={externalExtensions} />
      <br />
      <h4>Bundled Extensions</h4>
      <p>
        These extensions come bundled by default when you download TerminalQuest.
      </p>
      <ExtensionsList extensions={bundledExtensions} />
    </>
  );
}

function EnabledExtensions({ onFocus, onBlur, save }) {
  const directory = getExtensionDirectory();

  return (
    <>
      <p>
        TerminalQuest will attempt to load extensions from the folder below. Note
        that some extensions may{' '}
        <span className="highlight">require you to restart the game</span>{' '}
        before they are available (e.g. new missions in the mission computer).
      </p>
      <br />
      <br />
      <Button
        onClick={() =>
          save(
            'extensions',
            {
              enabled: false,
            },
            'context'
          )
        }
      >
        Disable Extensions
      </Button>
      <br />
      <br />
      <h4>Extension Directory</h4>
      <div>
        <InputTextField
          value={directory || 'No directory chosen'}
          disabled
        ></InputTextField>
        <InlineButton
          label="Choose Directory"
          onClick={async () => {
            const directoryPath = await getDirectoryPath({
              defaultPath: directory,
              buttonLabel: 'Choose',
              title: 'Choose a directory to load your extensions from',
            });

            if (!directoryPath) {
              return;
            }

            save(
              'extensions',
              {
                directory: directoryPath,
              },
              'context'
            );
          }}
        />
      </div>
      <br />
      <h3>Loaded Extensions</h3>
      <AllExtensionsList />
      <br />
    </>
  );
}

function DisabledExtensions({ save }) {
  return (
    <>
      <p>
        Click the button below to enable extensions. Extensions can contain new
        levels, items, or features for TerminalQuest.
      </p>
      <p>
        <span className="highlight">Be careful</span>! If you install extensions
        in TerminalQuest, those extensions will be able to execute code on your
        computer. Ensure that you trust the extension author before using this
        feature. Broken extensions can also cause the TerminalQuest game to become
        unstable, possibly even requiring you to reinstall the game.
      </p>
      <Button
        onClick={() =>
          save(
            'extensions',
            {
              enabled: true,
            },
            'context'
          )
        }
      >
        Enable Extensions
      </Button>
    </>
  );
}

export default function Extensions({ onFocus, onBlur, save }) {
  const enabled = areExtensionsEnabled();

  return (
    <>
      <h3>Extensions</h3>
      {enabled ? (
        <EnabledExtensions onFocus={onFocus} onBlur={onBlur} save={save} />
      ) : (
        <DisabledExtensions save={save} />
      )}
    </>
  );
}
