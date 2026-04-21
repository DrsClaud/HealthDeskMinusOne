import { test, expect } from '@playwright/test';

/**
 * ChartMind Visualization E2E Test
 * 
 * Tests the D3 visualization component renders and handles selection.
 * Run: npx playwright test chartmind-visualization
 */

test.describe('ChartMind Visualization', () => {
  
  test('renders and handles diagnosis selection', async ({ page }) => {
    // Navigate to Interactive Demo story
    await page.goto('/?path=/story/chartmind-visualization--interactive-demo');
    await page.waitForSelector('iframe#storybook-preview-iframe');
    
    const frame = page.frameLocator('#storybook-preview-iframe');
    
    // SVG renders with nodes (5 diagnoses + 1 center = 6 circles)
    const svg = frame.locator('svg');
    await expect(svg).toBeVisible();
    
    const circles = frame.locator('svg circle');
    await expect(circles).toHaveCount(6);
    
    // Click a diagnosis node → selection appears
    const diagnosisNode = frame.locator('svg circle').nth(1);
    await diagnosisNode.click();
    
    const selectedSection = frame.locator('text=Selected Diagnosis');
    await expect(selectedSection).toBeVisible();
    
    // Click again → deselects
    await diagnosisNode.click();
    await expect(selectedSection).not.toBeVisible();
  });

});
