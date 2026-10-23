import { render, screen } from '@testing-library/react';
import App from './App';

test('renders header and SOS button', () => {
  render(<App />);
  expect(screen.getByText('SafeSHEE')).toBeInTheDocument();
  expect(screen.getByText(/Send SOS/i)).toBeInTheDocument();
});
