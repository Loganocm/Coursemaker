import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CourseCreator from "../components/CourseCreator";

// Mock the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    text: () => Promise.resolve("This is a test course."),
  })
) as jest.Mock;

it("uploads a PDF and generates a course", async () => {
  const mockOnCourseCreate = jest.fn();
  render(<CourseCreator onCourseCreate={mockOnCourseCreate} />);

  const file = new File(["hello"], "hello.pdf", { type: "application/pdf" });
  const input = screen.getByLabelText("Generate from PDF");

  fireEvent.change(input, { target: { files: [file] } });

  const uploadButton = screen.getByText("Upload and Generate");

  fireEvent.click(uploadButton);

  // Since we are mocking the fetch call, the UI should update based on the mocked response.
  // It calls the onCourseCreate prop with the raw markdown text.

  expect(global.fetch).toHaveBeenCalledWith(
    "http://localhost:3000/generate-course",
    expect.any(Object)
  );

  // Wait for the async operation to complete and onCourseCreate to be called
  await screen.findByText("Upload and Generate"); // Re-find to ensure re-render
  expect(mockOnCourseCreate).toHaveBeenCalledWith("This is a test course.");
});
