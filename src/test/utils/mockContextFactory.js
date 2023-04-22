import { getContext } from '../../js/app/common/context';

jest.mock('../../js/app/common/context');

function mockContextFactory(expectedKey, defaults) {
  function mockContext(overrides) {
    getContext.mockImplementation((key) => {
      if (key !== expectedKey) {
        throw new Error(`getContext mock not implemented for key: ${key}`)
      }
  
      // We're intentionally NOT deep merging here. We want to be able to
      // entirely replace deeper properties.
      return Object.assign({}, defaults, overrides);
    });
  }

  return mockContext;
}

export default mockContextFactory;