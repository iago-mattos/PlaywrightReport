import { expect, test } from "@playwright/test";

test("gera relatório com steps e attachments", async ({ page }, testInfo) => {
  await test.step("abrir a página sintética", async () => {
    await page.setContent(`
      <main>
        <h1>Exemplo Prognum</h1>
        <button type="button">Continuar</button>
      </main>
    `);
  });

  await test.step("validar o conteúdo principal", async () => {
    await expect(
      page.getByRole("heading", { name: "Exemplo Prognum" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  await testInfo.attach("screenshot do exemplo", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  await testInfo.attach("contexto do exemplo", {
    body: Buffer.from(JSON.stringify({ scenario: "minimal" })),
    contentType: "application/json",
  });
});
