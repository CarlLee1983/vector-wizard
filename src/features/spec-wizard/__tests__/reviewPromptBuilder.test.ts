import { describe, expect, it } from "vitest";
import { buildReviewPrompt } from "../services/reviewPromptBuilder";

describe("buildReviewPrompt", () => {
  const sampleYaml = 'schemaVersion: "0.1"\nmetadata:\n  title: "Demo"\n';
  const sampleSummary = "# Demo\n\nGoal: do the thing.";

  it("substitutes summary and yaml placeholders for zh-TW", () => {
    const prompt = buildReviewPrompt({
      yaml: sampleYaml,
      summary: sampleSummary,
      locale: "zh-TW"
    });

    expect(prompt).toContain("# 規格審閱請求");
    expect(prompt).toContain("目標清晰度");
    expect(prompt).toContain(sampleYaml);
    expect(prompt).toContain(sampleSummary);
    expect(prompt).not.toContain("{{summary_markdown}}");
    expect(prompt).not.toContain("{{yaml_content}}");
  });

  it("substitutes summary and yaml placeholders for en", () => {
    const prompt = buildReviewPrompt({
      yaml: sampleYaml,
      summary: sampleSummary,
      locale: "en"
    });

    expect(prompt).toContain("# Spec Review Request");
    expect(prompt).toContain("Goal clarity");
    expect(prompt).toContain(sampleYaml);
    expect(prompt).toContain(sampleSummary);
    expect(prompt).not.toContain("{{summary_markdown}}");
    expect(prompt).not.toContain("{{yaml_content}}");
  });

  it("preserves structure when summary and yaml are empty strings", () => {
    const prompt = buildReviewPrompt({ yaml: "", summary: "", locale: "zh-TW" });

    expect(prompt).toContain("# 規格審閱請求");
    expect(prompt).toContain("區段間一致性");
    expect(prompt).not.toContain("{{summary_markdown}}");
    expect(prompt).not.toContain("{{yaml_content}}");
  });

  it("does not escape special characters in yaml content (raw passthrough)", () => {
    const yaml = 'title: "value with $pecial & <chars>"';
    const prompt = buildReviewPrompt({ yaml, summary: "ok", locale: "en" });

    expect(prompt).toContain(yaml);
  });
});
