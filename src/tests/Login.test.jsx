import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';

// Avoid pulling in LoginForm (and firebase) — test only Login shell + click
jest.mock('../components/auth/login/LoginForm', () => function MockLoginForm() {
  return <div data-testid="login-form"><label htmlFor="email">Email</label><input id="email" aria-label="Email" /></div>;
});
jest.mock('../components/auth/login/LoginFormLinks', () => () => null);
jest.mock('../components/auth/login/AccountOptions', () => () => null);
jest.mock('../components/auth/login/FooterLinks', () => () => null);

import Login from '../components/auth/Login';

const theme = createTheme();
const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

function renderLogin() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter future={routerFuture}>
        <Login />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Login (auth UI)', () => {
  it('renders sign-in prompt and opens form on click', async () => {
    const user = userEvent.setup();
    renderLogin();

    expect(screen.getByText(/Already have an account\?/i)).toBeInTheDocument();
    const signInBtn = screen.getByRole('button', { name: /sign in/i });
    expect(signInBtn).toBeInTheDocument();

    await user.click(signInBtn);
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});
