import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SOSButton from '../SOSButton';
import api from '../api';

jest.mock('../api');


const mockGeolocation = {
  getCurrentPosition: jest.fn()
};

beforeAll(() => {
  global.navigator.geolocation = mockGeolocation;
});

afterEach(() => {
  jest.clearAllMocks();
});

test('sends SOS and shows response', async () => {
  mockGeolocation.getCurrentPosition.mockImplementation((succ) => succ({ coords: { latitude: 1, longitude: 2 } }));
  api.post.mockResolvedValue({ ok: true, report: { riskScore: 7, category: 'Stalking' } });

  render(<SOSButton />);
  fireEvent.click(screen.getByText(/Send SOS/i));

  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

  expect(screen.getByText(/Risk Score/i)).toBeInTheDocument();
});

test('handles geolocation failure gracefully', async () => {
  mockGeolocation.getCurrentPosition.mockImplementation((_, err) => err({ code: 1 }));
  api.post.mockResolvedValue({ ok: true, report: { riskScore: 3, category: 'Other' } });

  render(<SOSButton />);
  fireEvent.click(screen.getByText(/Send SOS/i));

  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

  expect(screen.getByText(/Risk Score/i)).toBeInTheDocument();
});