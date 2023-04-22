import React, { Component } from 'react';
import { emitter, setContext } from '../common/context';
import NavMap from './nav_map/components/NavMap';
import FogOwlFlying from './FogOwlFlying';
import IFrameOverlay from './IFrameOverlay';
import DevFundamentalsElevator from './DevFundamentalsElevator';
import FSM from './game/entities/FSM';

const Center = ({ children }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {children}
    </div>
  );
};

const DEFAULT_STATE = 'hidden';
export default class Overlay extends Component {
  state = {
    displayFsm: createDisplayFsm(
      displayFsmState =>
        this.setState({
          displayFsmState,
        }),
      DEFAULT_STATE
    ),
    displayFsmState: DEFAULT_STATE,
    componentKey: 'navMap',
    componentProps: {},
    components: {
      navMap: NavMap,
      fogOwlFlying: FogOwlFlying,
      devFundamentalsElevator: DevFundamentalsElevator,
      iframe: IFrameOverlay,
    },
  };

  componentDidMount() {
    emitter.on('contextUpdate:overlayComponent', component => {
      // Assume component is a componentKey by default and reset props
      let componentKey = component;
      let componentProps = [];

      // If component is type object, look for a key prop instead
      if (typeof component === 'object') {
        componentKey = component.key;
        componentProps = component.props || {};
      }

      if (componentKey) {
        if (!this.state.components[componentKey]) {
          console.error(
            `Provided overlayComponent key "${componentKey}" does not exist!`
          );
        }

        emitter.emit('levelLifecycle', {
          name: 'overlayComponentDidShow',
          componentKey,
        });

        this.state.displayFsm.action('show');
        this.setState({ componentKey, componentProps });
      } else {
        this.state.displayFsm.action('hide');
      }
    });
  }

  hide() {
    emitter.emit('levelLifecycle', {
      name: 'overlayComponentDidHide',
      componentKey: this.state.componentKey,
    });
    setContext({
      overlayComponent: '',
    });
  }

  render() {
    const {
      displayFsm,
      displayFsmState,
      componentKey,
      componentProps,
      components,
    } = this.state;

    const Component = components[componentKey];

    const shouldShowComponent =
      displayFsmState === 'showing' ||
      displayFsmState === 'shown' ||
      displayFsmState === 'hiding';

    return (
      shouldShowComponent && (
        <div className={`MenuContainer h100`}>
          <Center>
            <Component
              hide={this.hide.bind(this)}
              displayFsmState={displayFsmState}
              finishTransition={() => displayFsm.action('finishTransition')}
              {...componentProps}
            />
          </Center>
        </div>
      )
    );
  }
}

function createDisplayFsm(setState, defaultState) {
  const displayFsm = new FSM(
    {
      hidden: {
        actions: {
          show: () => displayFsm.transition('showing'),
        },
        onEnter: () => {
          setState('hidden');
        },
      },
      showing: {
        actions: {
          finishTransition: () => displayFsm.transition('shown'),
        },
        onEnter: () => {
          setState('showing');
        },
      },
      shown: {
        actions: {
          hide: () => displayFsm.transition('hiding'),
        },
        onEnter: () => {
          setState('shown');
        },
      },
      hiding: {
        actions: {
          finishTransition: () => displayFsm.transition('hidden'),
        },
        onEnter: () => {
          setState('hiding');
        },
      },
    },
    defaultState
  );

  return displayFsm;
}
