import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskForm } from "./TaskForm";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { translations } from "@/lib/i18n";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";

const TestWrapper = ({ onSubmit, onError }: any) => {
  const taskForm = useForm({
    defaultValues: {
      title: "",
      hours: 0,
      minutes: 30,
      planningMemo: "",
      isUrgent: false,
    },
  });
  return (
    <TaskForm
      t={translations.ko}
      taskForm={taskForm}
      onSubmit={onSubmit}
      onError={onError}
    />
  );
};

describe("TaskForm", () => {
  const mockT = translations.ko;
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders only compact view initially", () => {
    render(<TestWrapper onSubmit={mockOnSubmit} onError={mockOnError} />);

    // Compact input should be visible
    expect(screen.getByPlaceholderText("새로운 업무를 입력하세요...")).toBeInTheDocument();

    // Expanded elements should NOT be visible
    expect(screen.queryByPlaceholderText(mockT.main.task_placeholder)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(mockT.main.planning_placeholder)).not.toBeInTheDocument();
  });

  it("expands when compact input is focused", async () => {
    const user = userEvent.setup();
    render(<TestWrapper onSubmit={mockOnSubmit} onError={mockOnError} />);

    const compactInput = screen.getByPlaceholderText("새로운 업무를 입력하세요...");
    await user.click(compactInput);

    // Expanded elements should now be visible
    expect(screen.getByPlaceholderText(mockT.main.task_placeholder)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(mockT.main.planning_placeholder)).toBeInTheDocument();
    expect(screen.getByText(mockT.main.add_task)).toBeInTheDocument();
  });

  it("auto-focuses title input when expanded", async () => {
    const user = userEvent.setup();
    render(<TestWrapper onSubmit={mockOnSubmit} onError={mockOnError} />);

    const compactInput = screen.getByPlaceholderText("새로운 업무를 입력하세요...");
    await user.click(compactInput);

    // Title input in expanded view should have focus
    const titleInput = screen.getByPlaceholderText(mockT.main.task_placeholder);
    expect(titleInput).toHaveFocus();
  });

  it("preserves input value when closing and reopening", async () => {
    const user = userEvent.setup();
    render(<TestWrapper onSubmit={mockOnSubmit} onError={mockOnError} />);

    // Open and type
    const compactInput = screen.getByPlaceholderText("새로운 업무를 입력하세요...");
    await user.click(compactInput);
    const titleInput = screen.getByPlaceholderText(mockT.main.task_placeholder);
    await user.type(titleInput, "Persistent Task");

    // Close by clicking outside (simulated by firing a mousedown event on document)
    fireEvent.mouseDown(document.body);

    // Verify it's closed (compact view shown, expanded elements gone from DOM because of AnimatePresence)
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(mockT.main.task_placeholder)).not.toBeInTheDocument();
    });

    // Reopen
    await user.click(screen.getByPlaceholderText("새로운 업무를 입력하세요..."));

    // Verify value is preserved
    expect(screen.getByPlaceholderText(mockT.main.task_placeholder)).toHaveValue("Persistent Task");
  });

  it("submits the form with correct data", async () => {
    const user = userEvent.setup();
    render(<TestWrapper onSubmit={mockOnSubmit} onError={mockOnError} />);

    // Expand
    await user.click(screen.getByPlaceholderText("새로운 업무를 입력하세요..."));

    // Fill in data
    const titleInput = screen.getByPlaceholderText(mockT.main.task_placeholder);
    await user.type(titleInput, "Test Submission");

    const memoInput = screen.getByPlaceholderText(mockT.main.planning_placeholder);
    await user.type(memoInput, "Test Memo Content");

    // Submit
    const submitBtn = screen.getByText(mockT.main.add_task);
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: "Test Submission",
        planningMemo: "Test Memo Content",
        hours: 0,
        minutes: 30,
        isUrgent: false
      }), undefined);
    });

    // Form should be closed after submission
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(mockT.main.task_placeholder)).not.toBeInTheDocument();
    });
  });

  it("handles inbox submission", async () => {
    const user = userEvent.setup();
    render(<TestWrapper onSubmit={mockOnSubmit} onError={mockOnError} />);

    // Expand
    await user.click(screen.getByPlaceholderText("새로운 업무를 입력하세요..."));

    // Fill title
    await user.type(screen.getByPlaceholderText(mockT.main.task_placeholder), "Inbox Task");

    // Click Inbox button
    const inboxBtn = screen.getByText(mockT.main.add_task_inbox);
    await user.click(inboxBtn);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: "Inbox Task"
      }), true); // second arg is isInbox = true
    });
  });
});
