// Steps for drawing a view and comparing the drawing with its approved reference.
// Step phrases are in French to match the feature files.
import { After, AfterAll, Before, Then, When, type DataTable } from "@cucumber/cucumber";
import { renderViewSvg } from "../../src/render-svg.ts";
import { computeView } from "../../src/views.ts";
import { compareWithApproved, writeReview, type ReviewEntry, type ReviewStep } from "./review.ts";
import type { C4World } from "./world.ts";

const entries: ReviewEntry[] = [];

Before(function (this: C4World, { pickle, gherkinDocument }) {
  // Keywords ("Étant donné", "Quand"…) are only in the Gherkin document, indexed by AST node id.
  const keywords = new Map<string, string>();
  const collect = (steps: readonly { id: string; keyword: string }[] | undefined): void =>
    steps?.forEach((s) => keywords.set(s.id, s.keyword));
  for (const child of gherkinDocument.feature?.children ?? []) {
    collect(child.background?.steps);
    collect(child.scenario?.steps);
    for (const ruleChild of child.rule?.children ?? []) {
      collect(ruleChild.background?.steps);
      collect(ruleChild.scenario?.steps);
    }
  }
  const steps: ReviewStep[] = pickle.steps.map((step) => ({
    keyword: keywords.get(step.astNodeIds[0] ?? "") ?? "",
    text: step.text,
    ...(step.argument?.docString === undefined ? {} : { docString: step.argument.docString.content }),
  }));
  this.scenario = { feature: gherkinDocument.feature?.name ?? "", name: pickle.name, steps };
});

When("je dessine la vue {string}", async function (this: C4World, key: string) {
  this.svg = (await renderViewSvg(this.model(), computeView(this.model(), key))).svg;
});

Then(
  "le dessin correspond à la référence {string}, sur laquelle on voit :",
  function (this: C4World, key: string, table: DataTable) {
    if (this.svg === undefined) throw new Error("no view was drawn");
    if (this.scenario === undefined) throw new Error("scenario information missing");
    const checks = table.raw().map((row) => row[0] ?? "");
    const { status, approved } = compareWithApproved(key, this.svg);
    entries.push({
      key,
      feature: this.scenario.feature,
      scenario: this.scenario.name,
      steps: this.scenario.steps,
      checks,
      status,
      received: this.svg,
      approved,
    });
    if (status !== "approved") this.unapproved.push(`${key} (${status})`);
  },
);

// Failing at the end of the scenario rather than in the step, so that every drawing of the scenario is
// produced and shown on the review page.
After(function (this: C4World) {
  if (this.unapproved.length === 0) return;
  throw new Error(
    `drawings not approved: ${this.unapproved.join(", ")}. ` +
      "Review output/review/index.html, then run npm run approve",
  );
});

AfterAll(function () {
  writeReview(entries);
});
