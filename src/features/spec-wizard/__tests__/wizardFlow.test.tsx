import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import { Wizard } from "../components/Wizard";

function renderWizard() {
  return render(
    <I18nProvider>
      <Wizard />
    </I18nProvider>
  );
}

describe("Wizard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("walks from basic info to review and renders YAML", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText("功能名稱"), "會員登入錯誤提示優化");
    await user.type(screen.getByLabelText("負責人"), "PM Team");
    await user.click(screen.getByRole("button", { name: "下一步" }));

    await user.type(screen.getByLabelText("問題背景"), "登入錯誤訊息太籠統。");
    await user.type(screen.getByLabelText("期望成果"), "降低客服詢問。");
    await user.type(screen.getByLabelText("目標"), "讓使用者知道登入失敗後該怎麼做。");
    await user.click(screen.getByRole("button", { name: "下一步" }));

    await user.click(screen.getByRole("button", { name: "下一步" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));

    await user.type(screen.getByLabelText("故事標題"), "顯示安全的登入失敗提示");
    await user.type(screen.getByLabelText("使用者故事"), "作為會員，我想看到清楚提示，以便知道如何修正。");
    await user.click(screen.getByRole("button", { name: "下一步" }));

    await user.click(screen.getByRole("button", { name: "下一步" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));

    await user.type(screen.getByLabelText("限制"), "不可透露帳號是否存在");
    await user.type(screen.getByLabelText("非目標"), "不新增社群登入");
    await user.click(screen.getByRole("button", { name: "檢視與匯出" }));
    await user.click(screen.getByRole("button", { name: "YAML" }));

    expect(screen.getByText(/schemaVersion:/)).toBeInTheDocument();
    expect(screen.getByText(/會員登入錯誤提示優化/)).toBeInTheDocument();
  });

  it("can go back to edit a previous step", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText("功能名稱"), "Initial title");
    await user.click(screen.getByRole("button", { name: "下一步" }));
    await user.click(screen.getByRole("button", { name: "上一步" }));

    expect(screen.getByDisplayValue("Initial title")).toBeInTheDocument();
  });
});
