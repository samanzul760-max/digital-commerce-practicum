import { expect, test } from '@playwright/test'

test('data center renders analytics returned by the server instead of local prototype state', async ({ page }) => {
  await page.route('**/api/practicum/analytics?roomId=room-001', async route => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        overview: { totalLearners: 9, completedLearners: 3, inactiveLearners: 2, overallCompletionPercent: 42 },
        plans: [{ planId: 'server-plan', title: '服务端计划', status: 'PUBLISHED', learnerCount: 9, percent: 42 }],
        activityFeed: [{ learnerLabel: '匿名学员', activityId: 'server-activity', activityTitle: '服务端活动', eventType: 'SUBMITTED', timestamp: '2026-07-29T08:00:00.000Z' }],
        ranking: [{ studentId: 'student-server', learnerLabel: '匿名学员', gradedCount: 2, avgScore: 88 }],
      }),
    })
  })

  await page.goto('/practicum/data-center')
  await expect(page.locator('[data-data-center]')).toBeVisible()
  await expect(page.locator('[data-overview-metrics]')).toContainText('42%')
  await expect(page.locator('[data-plan-comparison]')).toContainText('服务端计划')
  await expect(page.locator('[data-live-activity]')).toContainText('服务端活动')
  await expect(page.locator('[data-score-ranking]')).toContainText('88%')
})
