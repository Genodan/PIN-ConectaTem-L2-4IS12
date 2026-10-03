import { expect, test } from '@playwright/test';

// Navegación básica: desde el inicio se llega a los dos paneles.
test('desde el inicio se entra al panel de la familia', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('ConecTEM', { exact: true }).first()).toBeVisible();
  await page.getByText('Entrar como familia').click();
  await expect(page.getByText('Panel principal de la familia')).toBeVisible();
});

test('desde el inicio se entra al panel de la terapeuta', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Entrar como terapeuta').click();
  await expect(page.getByText('Panel principal de la terapeuta')).toBeVisible();
});
