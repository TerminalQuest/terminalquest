import config from '../../js/app/config/config';

jest.mock('../../js/app/config/config');

function mockConfigFactory(defaults) {
  function mockConfig(overrides) {
    // We're intentionally NOT deep merging here. We want to be able to
    // entirely replace deeper properties.
    const mockedProps = Object.assign({}, defaults, overrides);

    Object.entries(mockedProps).forEach(([key, value]) => {
      Object.defineProperty(
        config,
        key,
        { get: () => value }
      );
    })
  }

  return mockConfig;
}

export default mockConfigFactory;