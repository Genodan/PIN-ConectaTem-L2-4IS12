import { expect, test } from '@playwright/test';

// Navegación básica: desde la pantalla de acceso se llega a los dos paneles.
test('desde el acceso se entra al panel de la familia', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('ConecTEM', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Perfil de tu hijo/a')).toBeVisible();
});

test('desde el acceso se entra al panel de la terapeuta', async ({ page }) => {
  await page.goto('/');
  await page.getByText('🩺 Soy terapeuta').click();
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Resumen del feedback con IA')).toBeVisible();
});

test('la familia abre un módulo desde el menú y ve el vídeo de demostración', async ({ page }) => {
  await page.goto('/familia');
  await page.getByText('Módulos de práctica').click();
  await page.getByText('El Espejo').click();
  await expect(page.getByText('🎬 Vídeo de demostración')).toBeVisible();
});
