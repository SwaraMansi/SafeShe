import { render, screen } from '@testing-library/react';
import App from './App';

test('renders header and SOS button', () => {
  render(<App />);
  expect(screen.getByText(/SafeShe – Women Safety Platform/i)).toBeInTheDocument();
  expect(screen.getByText(/Send SOS/i)).toBeInTheDocument();
});
