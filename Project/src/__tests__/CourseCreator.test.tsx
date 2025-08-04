
import React from 'react';
import { render, screen } from '@testing-library/react';
import CourseCreator from '../components/CourseCreator';

it('disables upload button when no file is selected', () => {
  render(<CourseCreator onCourseCreate={() => {}} />);
  
  const uploadButton = screen.getByText('Upload and Generate');
  
  expect(uploadButton).toBeDisabled();
});
