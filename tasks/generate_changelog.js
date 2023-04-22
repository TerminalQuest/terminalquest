const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const { spawn } = require('child_process');
const versionSort = require('version-sort');
const { format, formatRelative } = require('date-fns');

const isMac = process.platform === 'darwin';

// Copy to clipboard on MacOS
function pbcopy(data) {
  const proc = spawn('pbcopy');
  proc.stdin.write(data);
  proc.stdin.end();
}

async function listVersionMergesIntoMaster() {
  const COMMIT_SEPARATOR = '><><><';
  const BODY_DATE_SEPARATOR = '<<>>';

  // https://git-scm.com/docs/git-log
  const RAW_BODY_PLACEHOLDER = '%B';
  const COMMIT_DATE_PLACEHOLDER = '%ct';

  const { stdout, stderr } = await exec(
    `git log origin/master --merges --first-parent --pretty="format:${RAW_BODY_PLACEHOLDER}${BODY_DATE_SEPARATOR}${COMMIT_DATE_PLACEHOLDER}${COMMIT_SEPARATOR}"`
  );

  if (stderr) {
    console.error(stderr);
  }

  const commits = stdout
    .split(COMMIT_SEPARATOR)
    .map(commit => {
      const [body, date] = commit.split(BODY_DATE_SEPARATOR);

      const RELEASE_VERSION_REGEX = /release\/([\d\.a-z]*)/i;
      const match = body.match(RELEASE_VERSION_REGEX);

      let version = '';
      if (match) {
        [, version] = match;
      }

      return {
        version,
        date,
      };
    })
    .filter(({ version }) => version !== '');

  return commits;
}

async function listPackageVersions() {
  // list all commit hashes that touched public/package.json
  const { stdout, stderr } = await exec(
    'git --no-pager branch -r --list "origin/release*"'
  );

  if (stderr) {
    console.error(stderr);
  }

  // get package file contents per commit hash
  const branches = stdout
    .trim()
    .split('\n')
    .map(branch => branch.trim());
  const showPackagePromises = branches.map(branch =>
    exec(`git show ${branch}:public/package.json`)
  );
  const packageFiles = await Promise.all(showPackagePromises);

  // pair version number and commit hash for each git commit listed
  const versions = packageFiles.map((packageFile, index) => {
    if (packageFile.stderr) {
      console.error(packageFile.stderr);
    }

    const { version } = JSON.parse(packageFile.stdout);

    let sortableVersion = version;

    if (sortableVersion.includes('-')) {
      sortableVersion = version.replace('-', '');

      const alphaVersionDotIndex = sortableVersion.lastIndexOf('.');
      sortableVersion =
        sortableVersion.substring(0, alphaVersionDotIndex) +
        sortableVersion.substring(alphaVersionDotIndex + 1);
    }

    return {
      version,
      // replace hyphens because version sort cannot handle them
      sortableVersion,
      commit: branches[index],
    };
  });

  const sortedVersions = versionSort(versions, {
    nested: 'sortableVersion',
  }).reverse();

  return sortedVersions;
}

async function getNewCommits(a, b) {
  const COMMIT_SEPARATOR = '><><><';
  const SUBJECT_BODY_SEPARATOR = '<<>>';

  // https://git-scm.com/docs/git-log
  const BODY_PLACEHOLDER = '%b';
  const SUBJECT_PLACEHOLDER = '%s';

  const { stdout, stderr } = await exec(
    `git --no-pager log "${a}"..."${b}" --first-parent --merges --pretty=format:"${SUBJECT_PLACEHOLDER}${SUBJECT_BODY_SEPARATOR}${BODY_PLACEHOLDER}${COMMIT_SEPARATOR}"`
  );

  if (stderr) {
    console.error(stderr);
  }

  const commits = stdout
    .split(COMMIT_SEPARATOR)
    .filter(commitLine => commitLine !== '')
    .map(commit => {
      const [subject, body] = commit.split(SUBJECT_BODY_SEPARATOR);

      const PR_BRANCH_REGEX = /.*#(\d+).*from (.*)$/;
      const match = subject.match(PR_BRANCH_REGEX);

      let pr = '';
      let branch = '';
      if (match) {
        [, pr, branch] = match;
      }

      return {
        pr,
        branch,
        subject: subject.trim(),
        body: body && body.trim(),
      };
    });

  return commits;
}

async function generate() {
  const versions = await listPackageVersions();

  const versionsMergedIntoMaster = await listVersionMergesIntoMaster();

  const versionBodies = await Promise.all(
    versions.map(async (currentVersion, index) => {
      const versionMergedDate = versionsMergedIntoMaster.find(
        versionMerged => versionMerged.version === currentVersion.version
      );

      const versionTitle = `### ${currentVersion.version}\n${
        versionMergedDate
          ? format(
              new Date(parseInt(versionMergedDate.date) * 1000),
              'MMMM, do y'
            )
          : 'Date not found...'
      }`;

      if (index === versions.length - 1) {
        // special case to stick all remaining changes under the last version since there is no previous version to refer to

        return `${versionTitle}\n\nInitial Version`;
      }

      const previousVersion = versions[index + 1];

      const commits = await getNewCommits(
        currentVersion.commit,
        previousVersion.commit
      );

      const versionBody = commits
        .map(commit => {
          if (commit.body) {
            return `- [${commit.body}](https://github.com/twilio/twilioquest/pull/${commit.pr}) - _${commit.branch}_
        `;
          } else {
            return `- ${commit.subject}`;
          }
        })
        .join('\n');

      return `${versionTitle}\n\n${versionBody}`;
    })
  );

  const changelog = `# TerminalQuest Changelog\n\n${versionBodies.join('\n\n')}`;

  if (isMac) {
    pbcopy(changelog);
    console.log('Copied changelog to clipboard!');
  } else {
    console.log(changelog);
  }
}

generate();
