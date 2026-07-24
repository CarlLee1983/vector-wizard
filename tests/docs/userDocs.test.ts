import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, normalize, resolve } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * 落地頁防腐測試。
 *
 * 這些頁面過去腐爛過：元件名被憑空發明、色票與產品脫節、CLI 範例指向 gitignored
 * 的空目錄、兩份語言版本結構漂移。它們之所以能爛掉半年，是因為沒有任何東西會去看
 * 一眼。以下四組檢查就是那雙眼睛——凡是機器驗證得了的事實，就不該再靠人工紀律。
 *
 * 決策脈絡見 docs/adr/0001-public-release-and-mit-license.md 與 CONTEXT.md。
 */

const REPO_ROOT = resolve(__dirname, "../..")
const PAGES = {
  en: join(REPO_ROOT, "docs/user/index.html"),
  "zh-TW": join(REPO_ROOT, "docs/user/zh-TW/index.html")
} as const

type PageKey = keyof typeof PAGES

const pageEntries = Object.entries(PAGES) as [PageKey, string][]

function read(path: string): string {
  return readFileSync(path, "utf8")
}

function idsIn(html: string): string[] {
  return [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
}

function internalAnchorsIn(html: string): string[] {
  return [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1])
}

function localAssetsIn(html: string): string[] {
  return [...html.matchAll(/(?:src|href)="((?!https?:|#|mailto:)[^"]+)"/g)].map((m) => m[1])
}

/** 頁面正文（去掉 <style>）中出現的六位色碼，用來確認沒有硬編色偷渡進內容。 */
function cssColorTokensIn(html: string): Record<string, string> {
  const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? ""
  const tokens: Record<string, string> = {}
  for (const [, name, value] of style.matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6});/g)) {
    tokens[name] = value.toUpperCase()
  }
  return tokens
}

describe("landing page: internal anchors resolve", () => {
  it.each(pageEntries)("%s has no dead in-page links", (_locale, path) => {
    const html = read(path)
    const ids = new Set(idsIn(html))
    const dead = internalAnchorsIn(html).filter((anchor) => !ids.has(anchor))
    expect(dead).toEqual([])
  })
})

describe("landing page: the two locales stay structurally aligned", () => {
  it("exposes the same set of section ids", () => {
    const en = new Set(idsIn(read(PAGES.en)))
    const zh = new Set(idsIn(read(PAGES["zh-TW"])))
    expect([...zh].sort()).toEqual([...en].sort())
  })

  it("links to each other so a reader can switch language", () => {
    expect(read(PAGES.en)).toContain('href="zh-TW/"')
    expect(read(PAGES["zh-TW"])).toContain('href="../"')
  })
})

describe("landing page: design tokens match the product", () => {
  // 落地頁是產品的樣品。它一旦跟 app/globals.css 漂開，訪客按下 CTA 就會看到
  // 另一個長相的東西——這正是 2026-07 那次腐爛的成因。
  const globals = read(join(REPO_ROOT, "app/globals.css"))
  const productTokens = Object.fromEntries(
    [...globals.matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6});/g)].map(([, name, value]) => [name, value.toUpperCase()])
  )

  it.each(pageEntries)("%s reuses the Vector palette verbatim", (_locale, path) => {
    const pageTokens = cssColorTokensIn(read(path))
    expect(Object.keys(pageTokens).length).toBeGreaterThan(0)

    for (const [name, value] of Object.entries(pageTokens)) {
      expect(productTokens, `page defines --${name}, which app/globals.css does not`).toHaveProperty(name)
      expect(value, `--${name} drifted from app/globals.css`).toBe(productTokens[name])
    }
  })

  it.each(pageEntries)("%s declares the product font stack", (_locale, path) => {
    const html = read(path)
    expect(html).toContain('"Outfit"')
    expect(html).toContain('"JetBrains Mono"')
  })
})

describe("landing page: referenced assets and repo paths exist", () => {
  it.each(pageEntries)("%s ships every local asset it references", (_locale, path) => {
    const missing = localAssetsIn(read(path)).filter(
      (rel) => !existsSync(resolve(dirname(path), rel.replace(/\/$/, "/index.html")))
    )
    expect(missing).toEqual([])
  })

  it.each(pageEntries)("%s only points at repo paths that a fresh clone actually has", (_locale, path) => {
    // 舊版教人 `npx vector-wizard import ./docs/methodology/artifacts/seeds/`，
    // 但那個目錄在 .gitignore 裡——clone 下來是空的。
    const html = read(path)
    const repoPaths = [...html.matchAll(/(?:^|[\s"'>(])((?:docs|src|app|bin|tests)\/[\w./-]*)/gm)]
      .map((m) => m[1].replace(/[.,)]+$/, ""))
      .filter((p) => !p.includes("*"))

    expect(repoPaths.length, "expected the page to reference at least one repo path").toBeGreaterThan(0)

    const offenders = repoPaths.filter((rel) => {
      const abs = normalize(join(REPO_ROOT, rel))
      if (!existsSync(abs)) return true
      try {
        // git check-ignore exits 0 when the path IS ignored.
        execFileSync("git", ["check-ignore", "-q", rel], { cwd: REPO_ROOT, stdio: "ignore" })
        return true
      } catch {
        return false
      }
    })

    expect(offenders).toEqual([])
  })
})

describe("landing page: no unsupported or stale claims", () => {
  // 每一條都對應一個真的發生過的錯誤，別在沒查證前放行。
  const banned: [RegExp, string][] = [
    [/antigravity/i, "查無實據的相容性宣稱（見 ADR 0001 的拷問紀錄）"],
    [/gravito/i, "repo 中不存在的組織署名"],
    [/SpecWizard|PreviewPanel|AiAssistant|DraftManager/, "被發明出來、程式碼中不存在的元件名"],
    [/glassmorphism|毛玻璃/i, "與 DESIGN.md 的紙感設計系統相牴觸"],
    [/unpkg\.com|cdn\.jsdelivr|fonts\.googleapis/, "外部 CDN 依賴——落地頁必須自給自足"]
  ]

  it.each(pageEntries)("%s stays clean", (_locale, path) => {
    const html = read(path)
    const hits = banned.filter(([pattern]) => pattern.test(html)).map(([pattern, why]) => `${pattern} — ${why}`)
    expect(hits).toEqual([])
  })
})
