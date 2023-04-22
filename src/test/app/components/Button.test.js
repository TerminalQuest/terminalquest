import React from 'react';
import { shallow } from 'enzyme';
import Button from '../../../js/app/components/Button';

test('Button component', async () => {
  const btn = shallow(<Button>Testing!</Button>);
  expect(btn.is('.Button')).toBe(true);
});
