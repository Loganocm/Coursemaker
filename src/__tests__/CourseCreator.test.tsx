import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CourseCreator from '../components/CourseCreator';

global.fetch = jest.fn();

describe('CourseCreator', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders the mode toggle button', () => {
    render(<CourseCreator onCourseCreate={() => {}} />);
    expect(screen.getByText('Standard AI Mode')).toBeInTheDocument();
    expect(screen.getByText('Agent Mode')).toBeInTheDocument();
  });

  it('toggles between Standard AI Mode and Agent Mode', () => {
    render(<CourseCreator onCourseCreate={() => {}} />);
    const standardModeButton = screen.getByText('Standard AI Mode');
    const agentModeButton = screen.getByText('Agent Mode');

    fireEvent.click(agentModeButton);
    expect(agentModeButton).toHaveStyle('background-color: #3b82f6');
    expect(standardModeButton).toHaveStyle('background-color: #e5e7eb');

    fireEvent.click(standardModeButton);
    expect(standardModeButton).toHaveStyle('background-color: #3b82f6');
    expect(agentModeButton).toHaveStyle('background-color: #e5e7eb');
  });

  it('calls the correct endpoint for Standard AI Mode', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ course: 'Standard AI course content' }),
    });

    render(<CourseCreator onCourseCreate={() => {}} />);
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });

    const input = screen.getByLabelText('Generate from PDF');
    fireEvent.change(input, { target: { files: [file] } });

    const generateButton = screen.getByText('Upload and Generate');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/generate-course',
        expect.any(Object)
      );
    });
  });

  it('calls the correct endpoint for Agent Mode', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ course: 'Agent Mode course content' }),
    });

    render(<CourseCreator onCourseCreate={() => {}} />);
    const agentModeButton = screen.getByText('Agent Mode');
    fireEvent.click(agentModeButton);

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });

    const input = screen.getByLabelText('Generate from PDF');
    fireEvent.change(input, { target: { files: [file] } });

    const generateButton = screen.getByText('Upload and Generate');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/create-course-agent',
        expect.any(Object)
      );
    });
  });
});