import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { __resetForTests, createDraft } from "../persistence/draftStore"
import { I18nProvider } from "../i18n/I18nContext"
import { Wizard } from "../components/Wizard"
import { BasicStep } from "../components/steps/BasicStep"
import type { FeatureDraft } from "../model/specTypes"
import { minimalValidDraft } from "../test/fixtures"

function renderWizard() {
  return render(
    <I18nProvider>
      <Wizard />
    </I18nProvider>
  )
}

describe("Wizard", () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
    createDraft()
  })

  it("walks from basic info to review and renders YAML", async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(screen.getByLabelText("功能標題（一句話說明要做什麼）"), "會員登入錯誤提示優化")
    await user.type(screen.getByLabelText("負責人"), "PM Team")
    await user.click(screen.getByRole("button", { name: "下一步" }))

    await user.type(screen.getByLabelText("問題背景"), "登入錯誤訊息太籠統。")
    await user.type(screen.getByLabelText("期望成果"), "降低客服詢問。")
    await user.type(screen.getByLabelText("目標"), "讓使用者知道登入失敗後該怎麼做。")
    await user.click(screen.getByRole("button", { name: "下一步" }))

    await user.click(screen.getByRole("button", { name: "下一步" }))
    await user.click(screen.getByRole("button", { name: "下一步" }))

    await user.type(screen.getByLabelText("使用者故事標題（一句話描述情境）"), "顯示安全的登入失敗提示")
    await user.type(screen.getByLabelText("使用者故事"), "作為會員，我想看到清楚提示，以便知道如何修正。")
    await user.click(screen.getByRole("button", { name: "下一步" }))

    await user.click(screen.getByRole("button", { name: "下一步" }))
    await user.click(screen.getByRole("button", { name: "下一步" }))

    await user.type(screen.getByLabelText("限制"), "不可透露帳號是否存在")
    await user.type(screen.getByLabelText("非目標"), "不新增社群登入")
    await user.click(screen.getByRole("button", { name: "前往檢視與匯出" }))
    await user.click(screen.getByRole("button", { name: "YAML" }))

    expect(screen.getByText(/schemaVersion:/)).toBeInTheDocument()
    expect(screen.getByText(/會員登入錯誤提示優化/)).toBeInTheDocument()
  })

  it("lets users fill handoff details before export", async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(screen.getByLabelText("功能標題（一句話說明要做什麼）"), "CNC 刀具管理")
    await user.click(screen.getByRole("button", { name: "下一步" }))

    await user.type(screen.getByLabelText("目標"), "追蹤每一個刀具的生命週期。")
    await user.type(screen.getByLabelText("成功訊號 1"), "每支刀具皆可查詢購入、使用與停用紀錄")
    await user.click(screen.getByRole("button", { name: "下一步" }))

    await user.type(screen.getByLabelText("受影響角色"), "機台管理人員")
    await user.type(screen.getByLabelText("影響"), "能掌握刀具狀態與責任歸屬")
    await user.type(screen.getByLabelText("使用者活動角色"), "機台管理人員")
    await user.type(screen.getByLabelText("使用者活動"), "登錄刀具採購、領用、停用流程")
    await user.click(screen.getByRole("button", { name: "下一步" }))

    await user.type(screen.getByLabelText("交付項目名稱"), "刀具生命週期管理")
    await user.type(screen.getByLabelText("交付項目描述"), "建立刀具資料、狀態追蹤與紀錄查詢")
    await user.click(screen.getByRole("button", { name: "下一步" }))

    await user.type(screen.getByLabelText("Epic 標題"), "刀具資產管理")
    await user.type(screen.getByLabelText("使用者故事標題（一句話描述情境）"), "採購刀具後轉入系統管理")
    await user.type(
      screen.getByLabelText("使用者故事"),
      "作為機台管理人員，我想在採購刀具後建立刀具資料，以便追蹤每支刀具。"
    )
    await user.click(screen.getByRole("button", { name: "下一步" }))

    await user.type(screen.getByLabelText("驗收條件 1"), "每支刀具必須有唯一財產編號")
    await user.click(screen.getByRole("button", { name: "下一步" }))

    await user.type(screen.getByLabelText("範例情境"), "當管理人員新增刀具並輸入財產編號後，系統會顯示該刀具為可使用。")
    await user.click(screen.getByRole("button", { name: "下一步" }))

    await user.type(screen.getByLabelText("限制"), "每個刀具要有獨立財產編號")
    await user.type(screen.getByLabelText("非目標"), "不串接 ERP 採購流程")
    await user.click(screen.getByRole("button", { name: "前往檢視與匯出" }))
    await user.click(screen.getByRole("button", { name: "YAML" }))

    expect(screen.getByText(/刀具資產管理/)).toBeInTheDocument()
    expect(screen.getByText(/acceptanceCriteria:/)).toBeInTheDocument()
    expect(screen.getByText(/每支刀具必須有唯一財產編號/)).toBeInTheDocument()
    expect(screen.getByText(/examples:/)).toBeInTheDocument()
    expect(screen.queryByText("故事缺少驗收條件。")).not.toBeInTheDocument()
    expect(screen.queryByText("故事缺少範例。")).not.toBeInTheDocument()
  })

  it("prevents YAML download when blocking errors remain", async () => {
    const user = userEvent.setup()
    renderWizard()

    for (let i = 0; i < 8; i += 1) {
      await user.click(screen.getByRole("button", { name: i === 7 ? "前往檢視與匯出" : "下一步" }))
    }

    expect(screen.getByText("下載 YAML")).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByText("下載 YAML")).not.toHaveAttribute("href")
    expect(screen.getByRole("button", { name: "複製 YAML" })).toBeDisabled()
  })

  it("can go back to edit a previous step", async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(screen.getByLabelText("功能標題（一句話說明要做什麼）"), "Initial title")
    await user.click(screen.getByRole("button", { name: "下一步" }))
    await user.click(screen.getByRole("button", { name: "上一步" }))

    expect(screen.getByDisplayValue("Initial title")).toBeInTheDocument()
  })

  it("explains what the feature and story titles should contain", async () => {
    const user = userEvent.setup()
    renderWizard()

    expect(screen.getByText(/不是專案名稱/)).toBeInTheDocument()
    expect(screen.getByText(/主要決策或驗收窗口/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText("例：客戶退貨流程自動化優化")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("例：PM Team、產品負責人 Annie")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "下一步" }))

    expect(screen.getByText(/現在卡在哪裡/)).toBeInTheDocument()
    expect(screen.getByText(/完成後希望使用者或業務狀態/)).toBeInTheDocument()
    expect(screen.getByText(/一句可驗收的目標/)).toBeInTheDocument()
    expect(screen.getByText(/可觀察的成功跡象/)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "下一步" }))
    await user.click(screen.getByRole("button", { name: "下一步" }))
    await user.click(screen.getByRole("button", { name: "下一步" }))

    expect(screen.getByText(/這則故事要解決的使用者情境/)).toBeInTheDocument()
    expect(screen.getByText(/作為⋯我想要⋯以便⋯/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText("例：自動產生退貨標籤")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "下一步" }))
    await user.click(screen.getByRole("button", { name: "下一步" }))
    await user.click(screen.getByRole("button", { name: "下一步" }))

    expect(screen.getByText(/不能違反的規則/)).toBeInTheDocument()
    expect(screen.getByText(/避免需求範圍擴大/)).toBeInTheDocument()
  })
})

describe("BasicStep roadmap fields", () => {
  function StatefulBasicStep({
    initial,
    onChange
  }: {
    initial?: FeatureDraft
    onChange?: (draft: FeatureDraft) => void
  }) {
    const [draft, setDraft] = useState<FeatureDraft>(initial ?? minimalValidDraft())
    return (
      <BasicStep
        draft={draft}
        setDraft={(next) => {
          setDraft(next)
          onChange?.(next)
        }}
      />
    )
  }

  it("renders id / horizon / priority / dependsOn inputs", () => {
    render(
      <I18nProvider initialLocale="en">
        <StatefulBasicStep />
      </I18nProvider>
    )

    expect(screen.getByLabelText(/Feature ID/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Roadmap horizon/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/MoSCoW priority/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Depends on/i)).toBeInTheDocument()
  })

  it("updates metadata.dependsOn from comma-separated input", async () => {
    const user = userEvent.setup()
    let lastDraft: FeatureDraft = minimalValidDraft()

    render(
      <I18nProvider initialLocale="en">
        <StatefulBasicStep onChange={(next) => (lastDraft = next)} />
      </I18nProvider>
    )

    await user.type(screen.getByLabelText(/Depends on/i), "FT-002, FT-005")
    expect(lastDraft.metadata.dependsOn).toEqual(["FT-002", "FT-005"])
  })
})
