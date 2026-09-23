import { test, expect } from '@playwright/test'

test('admin creates, edits, persists, filters, and deletes an event', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/login')
  await page.getByRole('button', { name: 'Open admin demo' }).click()
  await expect(
    page.getByRole('heading', { name: 'Office calendar' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Add event', exact: true }).click()
  await page.getByLabel('Event title').fill('E2E planning meeting')
  await page
    .getByLabel('Category', { exact: false })
    .selectOption({ label: 'Meeting' })
  await page
    .locator('.participant-list label', { hasText: 'Juan Dela Cruz' })
    .getByRole('checkbox')
    .check()
  await page
    .locator('.participant-list label', { hasText: 'Maria Santos' })
    .getByRole('checkbox')
    .check()
  await page.getByLabel('Location').fill('Test room')
  await page.getByRole('button', { name: 'Save event' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page
    .getByRole('textbox', { name: 'Search calendar…' })
    .fill('E2E planning')
  await page.locator('.search-results .event-card').click()
  await expect(page.getByRole('dialog')).toContainText('Test room')
  await expect(page.getByRole('dialog')).toContainText(
    'Juan Dela Cruz, Maria Santos',
  )
  await page.getByRole('button', { name: 'Edit event' }).click()
  await page.getByLabel('Event title').fill('E2E updated meeting')
  await page.getByRole('button', { name: 'Save event' }).click()
  await page.reload()
  await page
    .getByRole('textbox', { name: 'Search calendar…' })
    .fill('E2E updated')
  await expect(page.locator('.search-results .event-card')).toHaveCount(1)
  await page.getByLabel('Meeting', { exact: true }).uncheck()
  await expect(
    page.getByRole('heading', { name: 'No events found' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Show all' }).click()
  await page.locator('.search-results .event-card').click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('button', { name: 'Delete event', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'No events found' }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('leave and holiday forms, employee and category management, and calendar views', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Open admin demo' }).click()
  await page.getByRole('button', { name: 'Add event', exact: true }).click()
  await page.getByLabel('Event title').fill('Test leave')
  await page
    .getByLabel('Category', { exact: false })
    .selectOption({ label: 'Employee Leave' })
  await page
    .getByRole('combobox', { name: 'Employee', exact: true })
    .selectOption({ label: 'Juan Dela Cruz' })
  await page.getByLabel('Leave type').selectOption('Sick Leave')
  await page.getByRole('button', { name: 'Save event' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Add event', exact: true }).click()
  await page.getByLabel('Event title').fill('Test holiday')
  await page
    .getByLabel('Category', { exact: false })
    .selectOption({ label: 'Holiday' })
  await expect(page.getByLabel('All-day event')).toBeChecked()
  await expect(page.getByLabel('All-day event')).toBeDisabled()
  await page.getByLabel('Holiday type').selectOption('Local Holiday')
  await page.getByRole('button', { name: 'Save event' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Week', exact: true }).click()
  await expect(page.locator('.fc-timeGridWeek-view')).toBeVisible()
  await page.getByRole('button', { name: 'Day', exact: true }).click()
  await expect(page.locator('.fc-timeGridDay-view')).toBeVisible()
  await page.getByRole('button', { name: 'Next period' }).click()
  const selectedDate = await page
    .locator('.calendar-navigation h2')
    .textContent()
  await page.getByRole('textbox', { name: 'Search calendar…' }).fill('Test')
  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect(page.locator('.fc-timeGridDay-view')).toBeVisible()
  await expect(page.locator('.calendar-navigation h2')).toHaveText(
    selectedDate!,
  )
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await page.getByRole('link', { name: 'Employees', exact: true }).click()
  await page.getByRole('button', { name: 'Add employee' }).click()
  await page.getByLabel('Employee number').fill('CIAS-TEST')
  await page.getByLabel('First name').fill('Test')
  await page.getByLabel('Last name').fill('Person')
  await page.getByRole('button', { name: 'Save employee' }).click()
  await page.getByRole('button', { name: 'Edit Test Person' }).click()
  await page.getByLabel('Active employee').uncheck()
  await page.getByRole('button', { name: 'Save employee' }).click()
  await expect(
    page.getByRole('row').filter({ hasText: 'Test Person' }),
  ).toContainText('Inactive')
  await page.getByRole('link', { name: 'Categories', exact: true }).click()
  await page.getByRole('button', { name: 'Add category' }).click()
  await page.getByLabel('Name', { exact: false }).fill('Test category')
  await page.getByRole('button', { name: 'Save category' }).click()
  await expect(
    page.locator('.category-tile').filter({ hasText: 'Test category' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page.locator('.activity-list')).toContainText('Test category')
})

test('staff has read-only routes and the mobile layout fits the screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Office calendar' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Add event', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Preview as read-only staff' }).click()
  await expect(
    page.getByRole('heading', { name: 'Office calendar' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Add event', exact: true }),
  ).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.locator('.fc-event').first().click()
  await expect(page.getByRole('button', { name: 'Edit event' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Employees', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Add employee' })).toHaveCount(
    0,
  )
  await page.goto('/categories')
  await expect(page).toHaveURL(/\/calendar$/)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/calendar$/)
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
})
