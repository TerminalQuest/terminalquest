import React from 'react';
import PropTypes from 'prop-types';
import { context, setContext, getContext } from '../../common/context';
import rank from '../../common/rank';
import MenuContainer from '../MenuContainer';
import Button from '../Button';
import levelLoader from '../../common/levelLoader';
import ga from '../../common/analytics';

// Calculate percent completion given a mission and a list of completed
// objectives
function calcPercentComplete(mission, completedObjectives) {
  let percentComplete = 0;
  let objCompleted = 0;
  let totalObjectives = 0;

  mission.objectives.forEach(obj => {
    if (!obj.hidden && obj.rewards && obj.rewards.xp > 0) {
      totalObjectives++;
      if (completedObjectives[`${mission.levelName}.${obj.objectiveName}`]) {
        objCompleted++;
      }
    }
  });

  if (totalObjectives > 0) {
    percentComplete = Math.floor((objCompleted / totalObjectives) * 100);
  }

  return {
    percentComplete,
    objCompleted,
    totalObjectives,
  };
}

function MissionListItem(props) {
  const {
    mission,
    selectedMission,
    completedObjectives,
    onSelectMission,
  } = props;

  // Set up CSS class for list item
  let classNameForParent = 'missionSelection';
  if (selectedMission && selectedMission.title === mission.title) {
    classNameForParent += ' active';
  }

  // Calculate percentage completion
  const { percentComplete } = calcPercentComplete(mission, completedObjectives);

  return (
    <div
      className={classNameForParent}
      onClick={() => onSelectMission(mission)}
    >
      <div className="icon">
        <img src={mission.icon} alt={mission.title} />
        {percentComplete === 0 ? (
          ''
        ) : (
          <div className="progress">{percentComplete}%</div>
        )}
      </div>
      <h2>{mission.title}</h2>
    </div>
  );
}

function WarpLink({
  levelName,
  playerEntryPoint,
  levelMapName,
  closeMissionComputer,
}) {
  return (
    <a
      href=""
      onClick={e => {
        e.preventDefault();

        setContext({
          currentLevel: {
            levelName,
            playerEntryPoint,
            levelMapName,
          },
        });
        closeMissionComputer();
      }}
    >
      Warp Here &gt;
    </a>
  );
}

function WarpPointListItem({
  name,
  description,
  levelName,
  levelMapName,
  playerEntryPoint,
  secret,
  prereqs,
  closeMissionComputer,
}) {
  const completedObjectives = getContext('completedObjectives');
  const areAnyPrereqsUnmet = prereqs.some(
    prereq => !completedObjectives[`${levelName}.${prereq}`]
  );

  return (
    <li className="mb4">
      <h4 style={{ fontSize: '14px' }}>{name}</h4>
      <p>{description}</p>
      {areAnyPrereqsUnmet ? (
        <p>
          <i className="fas fa-lock"></i> Locked
        </p>
      ) : (
        <WarpLink
          levelName={levelName}
          playerEntryPoint={playerEntryPoint}
          levelMapName={levelMapName}
          closeMissionComputer={closeMissionComputer}
        />
      )}
    </li>
  );
}

export default class MissionComputer extends React.Component {
  static propTypes = {
    close: PropTypes.func,
  };

  static contextType = context;

  state = {
    selectedMission: null,
    showWarpPoints: false,
    missions: [],
  };

  componentDidMount() {
    levelLoader.getFullMissionList().then(missions => {
      this.setState({ missions });
    });

    ga.pageview('/mission-computer', 'Mission Computer');
  }

  // Depending on the current state of prerequisites, render launch button
  // or prereq list
  renderLaunchOrPrereqs() {
    const { completedObjectives } = this.context;
    const { prereqList } = this.state.selectedMission;

    if (prereqList) {
      const foundUnmetPrereq = prereqList.some(prereq => {
        return !completedObjectives[prereq.key];
      });

      if (foundUnmetPrereq) {
        // Now, we render a list of unmet prereqs
        return (
          <div className="prereqs">
            <em>
              <span className="highlight">Hold up, Operator!</span>
            </em>
            <p>
              Before you can take on this mission, you must complete these
              mission objectives:
            </p>
            {prereqList.map(({ key, title }) => {
              return (
                <div className="item" key={key}>
                  {completedObjectives[key] ? (
                    <span className="checkbox">&#9745;</span>
                  ) : (
                    <span className="checkbox">&#9744;</span>
                  )}{' '}
                  <span>{title}</span>
                </div>
              );
            })}
          </div>
        );
      }
    }

    return (
      <>
        <Button
          onClick={() => {
            setContext({ currentLevel: this.state.selectedMission });
            this.props.close();
          }}
        >
          LAUNCH MISSION
        </Button>
        {this.getDisplayableWarpPoints().length > 0 && (
          <a
            className="mt3 db"
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();

              this.setState({ showWarpPoints: true });
            }}
            href=""
          >
            Warp Points &gt;
          </a>
        )}
      </>
    );
  }

  getDisplayableWarpPoints() {
    const { warpPoints, levelName } = this.state.selectedMission;

    if (!warpPoints) {
      return [];
    }

    // not disabled warp points
    const nonDisabledWarpPoints = warpPoints.filter(
      warpPoint => !warpPoint.disabled
    );

    // not secret warp points without met prereqs
    const displayableWarpPoints = nonDisabledWarpPoints.filter(warpPoint => {
      if (!warpPoint.secret) {
        return true;
      }

      const completedObjectives = getContext('completedObjectives');
      const areAnyPrereqsUnmet = warpPoint.prereqs.some(
        prereq => !completedObjectives[`${levelName}.${prereq}`]
      );

      return !areAnyPrereqsUnmet;
    });

    return displayableWarpPoints;
  }

  renderSidebar() {
    const { selectedMission, showWarpPoints } = this.state;
    const { completedObjectives } = this.context;
    let contents;

    if (showWarpPoints) {
      contents = (
        <>
          <img
            className="icon"
            src={selectedMission.icon}
            alt={selectedMission.title}
          />
          <h2>{selectedMission.title}</h2>
          <div className="progress">Warp Points</div>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              textAlign: 'left',
            }}
          >
            {this.getDisplayableWarpPoints().map(warpPoint => {
              return (
                <WarpPointListItem
                  {...warpPoint}
                  closeMissionComputer={this.props.close}
                  levelName={selectedMission.levelName}
                  key={`${warpPoint.levelMapName}_${warpPoint.playerEntryPoint}`}
                />
              );
            })}
          </ul>
          <Button
            onClick={() => {
              this.setState({ showWarpPoints: false });
            }}
          >
            {'< BACK'}
          </Button>
        </>
      );
    } else if (selectedMission) {
      // Calculate percentage completion
      const {
        percentComplete,
        objCompleted,
        totalObjectives,
      } = calcPercentComplete(selectedMission, completedObjectives);

      contents = (
        <>
          <img
            className="icon"
            src={selectedMission.icon}
            alt={selectedMission.title}
          />
          <h2>{selectedMission.title}</h2>
          <div className="progress">
            {percentComplete}% Complete
            <br />
            Rank:&nbsp;
            <span className="highlight">
              {rank(objCompleted, totalObjectives)}
            </span>
          </div>
          <p>{selectedMission.description}</p>
          {this.renderLaunchOrPrereqs()}
        </>
      );
    } else {
      contents = <h2 className="inactive">&lt; SELECT A MISSION</h2>;
    }

    return <div className="missionDescription">{contents}</div>;
  }

  render() {
    const missions = this.state.missions.sort((a, b) => {
      const priority = (a.priority || 9999) - (b.priority || 9999);
      return priority;
    });
    return (
      <div className="MissionComputer">
        <MenuContainer
          title="Select Training Mission"
          onClose={() => this.props.close()}
        >
          <div className="missions">
            {missions.map(mission => (
              <MissionListItem
                key={mission.title}
                mission={mission}
                selectedMission={this.state.selectedMission}
                completedObjectives={this.context.completedObjectives}
                onSelectMission={selectedMission => {
                  this.setState({ selectedMission, showWarpPoints: false });
                }}
              />
            ))}
          </div>
          {this.renderSidebar()}
        </MenuContainer>
      </div>
    );
  }
}
