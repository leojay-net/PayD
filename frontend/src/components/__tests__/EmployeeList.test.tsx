import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { EmployeeList } from '../EmployeeList';

vi.mock('../Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}));

vi.mock('../AvatarUpload', () => ({
  AvatarUpload: () => null,
}));

vi.mock('../CSVUploader', () => ({
  CSVUploader: () => null,
}));

vi.mock('../EmployeeRemovalConfirmModal', () => ({
  EmployeeRemovalConfirmModal: () => null,
}));

const employee = {
  id: 'emp-1',
  name: 'Alexandria Catherine Johnson-Smith With A Very Long Name',
  email: 'alexandria.catherine.johnson-smith.with.a.very.long.email@example.com',
  position: 'Senior Finance Operations Specialist',
  wallet: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12',
  salary: 1500,
  status: 'Active' as const,
};

describe('EmployeeList', () => {
  test('renders employee name and email with truncation metadata for narrow columns', () => {
    render(<EmployeeList employees={[employee]} onAddEmployee={vi.fn()} />);

    const name = screen.getByLabelText(`Employee name: ${employee.name}`);
    const email = screen.getByLabelText(`Employee email: ${employee.email}`);

    expect(name).toHaveAttribute('title', employee.name);
    expect(name.className).toContain('truncate');
    expect(email).toHaveAttribute('title', employee.email);
    expect(email.className).toContain('truncate');
  });
});
