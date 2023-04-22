import config from '../config/config';
import {
  getContext,
  setContext
} from './context';


async function getTeamFromBackend(joinCode) {
  try {
    const response = await fetch(config.apiBaseUrl + `api/v1/teams/joinCode/${joinCode}`);
  
    if (response.status === 404) {
      return {
        success: false,
        message: "This team does not exist!",
      };
    }
    
    const team = await response.json();

    if (team.errors) {
      console.error(team.errors);

      return {
        success: false,
        message: "Something went wrong!",
      };
    }

    return {
      success: true,
      team
    };
  } catch (err) {
    console.error(err);

    return {
      success: false,
      message: "Something went wrong!",
    };
  }
}

function getJoinedTeams() {
  const teams = getContext('teams');

  if (teams.joined.length === 0) {
    return false;
  }

  return teams.joined;
}

function isTeamAlreadyJoined(joinCode) {
  const teams = getContext('teams');

  return teams.joined.some(team => team.joinCode === joinCode);
}

function connectTeam(team) {
  const teams = getContext('teams');

  const newTeam = {
    id: team.id,
    joinCode: team.data.joinCode,
    displayName: team.data.displayName
  }

  setContext({
    teams: {
      ...teams,
      joined: [
        ...teams.joined,
        newTeam
      ]
    }
  });
}

function disconnectTeam(team) {
  const teams = getContext('teams');

  // Filter out team being disconnected
  const joined = teams.joined.filter(joinedTeam => joinedTeam.id !== team.id);

  setContext({
    teams: {
      ...teams,
      joined
    }
  })
}

function joinTeam(id) {
  return new Promise(async resolve => {
    if (id === '') {
      return resolve({
        success: false,
        message: 'You need to enter a code!',
      });
    }

    if (isTeamAlreadyJoined(id)) {
      return resolve({
        success: false,
        message: "You're already on this team!",
      });
    }

    const teamResult = await getTeamFromBackend(id);

    if (!teamResult.success) {
      return resolve({
        success: teamResult.success,
        message: teamResult.message
      });
    }

    const { team } = teamResult;

    connectTeam(team);

    return resolve({
      success: true,
      message: `Joined: "${team.data.displayName}"!`,
    });
  });
}


export {
  getJoinedTeams,
  isTeamAlreadyJoined,
  connectTeam,
  disconnectTeam,
  joinTeam
}