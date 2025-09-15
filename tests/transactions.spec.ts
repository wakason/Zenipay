import { test, expect } from '@playwright/test';

test.describe('Employee Transaction Management', () => {
  test('should allow an employee to pre-validate and verify a pending transaction', async ({ page }) => {
    // 1. Log in as an employee
    await page.goto('/login');
    await page.fill('input[name="username"]', 'employee@example.com'); // Replace with actual employee credentials
    await page.fill('input[name="password"]', 'password123'); // Replace with actual employee credentials
    await page.click('button[type="submit"]');

    // Expect to be on the employee dashboard or transactions page
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText('Welcome, Employee!')).toBeVisible(); // Adjust based on actual welcome message

    // 2. Navigate to pending transactions if not already on the dashboard showing them
    // Assuming pending transactions are visible on the dashboard or accessible via a link
    // If there's a specific link to "View all transactions", click it:
    // await page.getByRole('button', { name: 'Pending Transactions' }).click();
    // await expect(page).toHaveURL(/.*employee\/transactions/);

    // 3. Find a pending transaction and trigger pre-validation
    // This assumes there's at least one pending transaction in the test environment.
    // You might need to seed your test database with a pending transaction.
    const firstPendingTransactionRow = page.locator('tbody tr').filter({ hasText: 'pending' }).first();
    await expect(firstPendingTransactionRow).toBeVisible();

    const preValidateButton = firstPendingTransactionRow.getByRole('button', { name: 'Pre-Validate & Verify' });
    await expect(preValidateButton).toBeEnabled();
    await preValidateButton.click();

    // 4. Assert that validation is in progress and then successful
    await expect(firstPendingTransactionRow.getByText('Validating...')).toBeVisible();
    // Wait for the validation to complete and display success message
    await expect(firstPendingTransactionRow.getByText('Account and SWIFT code validated successfully.')).toBeVisible({ timeout: 10000 });
    await expect(firstPendingTransactionRow.getByRole('button', { name: 'Pre-Validate & Verify' })).toBeDisabled();

    // 5. Submit to SWIFT (if the button appears after successful pre-validation)
    const submitToSwiftButton = firstPendingTransactionRow.getByRole('button', { name: 'Submit to SWIFT' });
    await expect(submitToSwiftButton).toBeEnabled();
    await submitToSwiftButton.click();

    // 6. Assert transaction status updates to completed
    await expect(firstPendingTransactionRow.getByText('completed')).toBeVisible({ timeout: 10000 });
    await expect(submitToSwiftButton).toBeDisabled(); // Should be disabled after submission

    // Optional: Log out
    // await page.getByRole('button', { name: 'Logout' }).click();
    // await expect(page).toHaveURL(/.*login/);
  });

  test('should show validation failure for an invalid transaction', async ({ page }) => {
    // This test would require setting up a transaction with invalid data in your backend/test data
    // For demonstration, let's assume a transaction with ID 999 is intentionally set to fail pre-validation

    // 1. Log in as an employee
    await page.goto('/login');
    await page.fill('input[name="username"]', 'employee@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // Navigate to transactions if needed, or locate on dashboard
    // await page.getByRole('button', { name: 'Pending Transactions' }).click();

    // Locate a transaction that is expected to fail validation (e.g., specific payee account/swift code)
    // For a real test, you'd need to ensure a transaction with invalid data exists.
    const invalidTransactionRow = page.locator('tbody tr').filter({ hasText: 'INVALIDACC123' }).first(); // Replace with a known invalid account
    await expect(invalidTransactionRow).toBeVisible();

    const preValidateButton = invalidTransactionRow.getByRole('button', { name: 'Pre-Validate & Verify' });
    await expect(preValidateButton).toBeEnabled();
    await preValidateButton.click();

    // Assert that validation is in progress and then fails
    await expect(invalidTransactionRow.getByText('Validating...')).toBeVisible();
    await expect(invalidTransactionRow.getByText(/Pre-validation failed/)).toBeVisible({ timeout: 10000 });
    // The verify button should still be enabled (or not disabled based on UI logic) if validation fails
    await expect(preValidateButton).toBeEnabled(); // Or check for a specific error state button

    // Submit to SWIFT button should be disabled
    const submitToSwiftButton = invalidTransactionRow.getByRole('button', { name: 'Submit to SWIFT' });
    await expect(submitToSwiftButton).toBeDisabled();
  });
});
