---
status: accepted
date: 2026-07-24
---

# 正式公開 Vector 並採用 MIT 授權

Vector 的文件長期寫著「private, intended for internal use」，但實際行為早已是公開專案：repo 公開、README 教陌生人 shallow-clone 安裝 `.agents/skills/`、`package.json` 是 `"private": false`，現在又要架 GitHub Pages 落地頁。一個沒有 LICENSE 的公開 repo 法律預設是「保留全部權利」，照著 README 指示取用 skills 的人全都處在灰色地帶，這會直接扼殺我們想要的採用。因此正式公開，並採用 MIT。

## Considered Options

- **MIT**（採用）— 這個專案的主要資產是 `docs/methodology/` 的方法論與 `.agents/skills/` 的兩個 skill，而它們的預期使用方式就是「被複製到別人的 agent 目錄」。授權要服務的是「最大化被抄」，MIT 是全世界不用讀就知道意思的那一份。
- **Apache-2.0** — 明示專利授權與商標條款對企業法務較友善，但一個產生 YAML 規格的精靈沒有專利可主張，換來的只是 `NOTICE` 檔的長期維護義務。
- **MIT + CC BY 4.0 雙授權**（程式碼／方法論分開）— 最貼合「方法論是主資產」的事實，但 skills 目錄同時含 Markdown 與腳本，邊界難以講清楚，讀者容易誤解。
- **公開瀏覽但保留全部權利** — 保住控制權，但與落地頁「請人來裝來用」的邀請直接矛盾。

## Consequences

- 著作權人為 **Carl Lee** 個人。此決定的前提是 Vector 屬於個人專案、與任何雇主或客戶無僱傭／委任關係；此前提已於 2026-07-24 確認。
- **授權一旦推上 GitHub 就無法收回**。既有版本永遠可依 MIT 使用，日後即使改授權也只對新版本生效。
- README、README.zh-TW、`AGENTS.md` 中「internal / 私有」的敘述一併移除，以免文件與授權再次不一致。
