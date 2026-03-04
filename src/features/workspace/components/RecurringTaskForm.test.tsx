import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecurringTaskForm } from "./RecurringTaskForm";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { translations } from "@/lib/i18n";
import userEvent from "@testing-library/user-event";

describe("RecurringTaskForm", () => {
  const mockT = translations.ko;
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(<RecurringTaskForm t={mockT} onSubmit={mockOnSubmit} />);

    expect(screen.getByText(mockT.workspace_routine.title_label)).toBeInTheDocument();
    expect(screen.getByText(mockT.workspace_routine.duration_label)).toBeInTheDocument();
    expect(screen.getByText(mockT.workspace_routine.days_label)).toBeInTheDocument();
    expect(screen.getByText(mockT.workspace_routine.planning_label)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(mockT.main.task_placeholder)).toBeInTheDocument();
  });

  it("submits the form with correct data", async () => {
    const user = userEvent.setup();
    render(<RecurringTaskForm t={mockT} onSubmit={mockOnSubmit} />);

    // Fill in title
    const titleInput = screen.getByPlaceholderText(mockT.main.task_placeholder);
    await user.type(titleInput, "Daily Standup");

    // Select a day (Monday = 1)
    const mondayBtn = screen.getByText(mockT.workspace_routine.days[1]);
    await user.click(mondayBtn);

    // Click submit
    const submitBtn = screen.getByText(mockT.workspace_routine.add_btn);
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: "Daily Standup",
        duration: 30, // default 0h 30m
        planningMemo: null,
        daysOfWeek: [1],
      });
    });
  });

  it("does not submit if no days are selected", async () => {
    const user = userEvent.setup();
    render(<RecurringTaskForm t={mockT} onSubmit={mockOnSubmit} />);

    const titleInput = screen.getByPlaceholderText(mockT.main.task_placeholder);
    await user.type(titleInput, "Test Task");

    const submitBtn = screen.getByText(mockT.workspace_routine.add_btn);
    expect(submitBtn).toBeDisabled();

    await user.click(submitBtn);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("prevents page refresh on submit (implicit check by using div and type='button')", async () => {
    // In our refactored version, we use a <div> and a button type="button",
    // so a page refresh is physically impossible as there is no <form> element.
    // We verify this by ensuring no form element exists.
    const { container } = render(<RecurringTaskForm t={mockT} onSubmit={mockOnSubmit} />);
    const formElement = container.querySelector("form");
    expect(formElement).toBeNull();
  });

  it("submits on Enter key in title input", async () => {
    const user = userEvent.setup();
    render(<RecurringTaskForm t={mockT} onSubmit={mockOnSubmit} />);

    const titleInput = screen.getByPlaceholderText(mockT.main.task_placeholder);
    await user.type(titleInput, "Enter Key Test");

    const mondayBtn = screen.getByText(mockT.workspace_routine.days[1]);
    await user.click(mondayBtn);

    // Press Enter
    fireEvent.keyDown(titleInput, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });
});
