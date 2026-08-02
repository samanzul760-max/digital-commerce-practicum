import { expect, test } from '@playwright/test'

test('[LOCAL-TUTORIAL-001] administrator and students can open a complete local tutorial document', async ({ page }) => {
  await page.goto('/practicum/tutorials')
  await expect(page.locator('[data-tutorial-library]')).toBeVisible()
  await expect(page.locator('[data-tutorial-card]')).toHaveCount(6)
  await page.locator('[data-tutorial-card]').filter({ hasText: '商品标题与详情页优化' }).getByRole('link', { name: '打开教程' }).click()
  await expect(page.locator('[data-tutorial-document]')).toBeVisible()
  await expect(page.locator('[data-tutorial-document]')).toContainText('学习目标')
  await expect(page.locator('[data-tutorial-document]')).toContainText('提交物')
  await expect(page.locator('[data-tutorial-document]')).toContainText('评分标准')
})
