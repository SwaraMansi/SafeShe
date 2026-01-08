import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportForm from '../ReportForm';
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

test('submits report without location', async () => {
  api.post.mockResolvedValue({});
  render(<ReportForm />);

  fireEvent.change(screen.getByPlaceholderText(/Describe the incident/i), { target: { value: 'Test incident' } });
  fireEvent.click(screen.getByText(/Submit Report/i));

  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/report', { description: 'Test incident', location: null }));
});

test('submits report with location when checked', async () => {
  mockGeolocation.getCurrentPosition.mockImplementation((succ) => succ({ coords: { latitude: 1, longitude: 2 } }));
  api.post.mockResolvedValue({});

  render(<ReportForm />);
  fireEvent.change(screen.getByPlaceholderText(/Describe the incident/i), { target: { value: 'Test incident' } });
  fireEvent.click(screen.getByLabelText(/Share my location/));
  fireEvent.click(screen.getByText(/Submit Report/i));

  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/report', { description: 'Test incident', location: { lat: 1, lng: 2 } }));
});