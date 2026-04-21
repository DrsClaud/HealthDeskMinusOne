import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CloseButton from '../components/styled/CloseButton';

describe('CloseButton', () => {
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(<CloseButton onClick={handleClick} />);

    await user.click(screen.getByText('×'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
