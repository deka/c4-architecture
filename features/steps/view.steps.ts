// Steps for computing a view and inspecting its logical content.
// Step phrases are in French to match the feature files.
import assert from "node:assert/strict";
import { Then, When, type DataTable } from "@cucumber/cucumber";
import { computeView, computeViewFromDefinition, type ViewRole } from "../../src/views.ts";
import { quoted, show, type C4World } from "./world.ts";

const roleByLabel: Record<string, ViewRole> = {
  "système principal": "scope",
  interne: "internal",
  voisin: "neighbour",
};

When("je calcule la vue {string}", function (this: C4World, key: string) {
  this.view = computeView(this.model(), key);
});

const elementIds = (world: C4World): string[] => world.currentView().elements.map((e) => e.id);

const relationshipPairs = (world: C4World): string[] =>
  world.currentView().relationships.map((r) => `${r.from} → ${r.to}`);

Then("la vue contient exactement les éléments :", function (this: C4World, table: DataTable) {
  const rows = table.hashes();
  assert.deepEqual(
    [...elementIds(this)].sort(),
    rows.map((row) => row.id!).sort(),
    "elements in the view",
  );
  for (const row of rows) {
    const element = this.currentView().elements.find((e) => e.id === row.id)!;
    if (row.type !== undefined) assert.equal(element.kind, row.type, `type of "${row.id}"`);
    if (row["rôle"] !== undefined) {
      const role = roleByLabel[row["rôle"]];
      assert.ok(role, `unknown role in scenario: "${row["rôle"]}"`);
      assert.equal(element.role, role, `role of "${row.id}"`);
    }
  }
});

Then("la vue contient l'élément {string}", function (this: C4World, id: string) {
  assert.ok(elementIds(this).includes(id), `"${id}" missing; view: ${show(elementIds(this))}`);
});

Then("la vue contient l'élément {string} de type {string}", function (this: C4World, id: string, kind: string) {
  const element = this.currentView().elements.find((e) => e.id === id);
  assert.ok(element, `"${id}" missing; view: ${show(elementIds(this))}`);
  assert.equal(element.kind, kind);
});

Then("la vue ne contient pas l'élément {string}", function (this: C4World, id: string) {
  assert.ok(!elementIds(this).includes(id), `"${id}" should not be in the view`);
});

Then("la vue ne contient aucun élément de type {string}", function (this: C4World, kind: string) {
  const found = this.currentView().elements.filter((e) => e.kind === kind);
  assert.deepEqual(found, [], `unexpected ${kind} elements`);
});

Then("la vue contient exactement les relations :", function (this: C4World, table: DataTable) {
  const rows = table.hashes();
  assert.deepEqual(
    [...relationshipPairs(this)].sort(),
    rows.map((row) => `${row.de} → ${row.vers}`).sort(),
    "relationships in the view",
  );
  for (const row of rows) {
    const relationship = this.currentView().relationships.find((r) => r.from === row.de && r.to === row.vers)!;
    if (row.description !== undefined) {
      assert.equal(relationship.description ?? "", row.description, `description of ${row.de} → ${row.vers}`);
    }
    if (row.technologie !== undefined) {
      assert.equal(relationship.technology ?? "", row.technologie, `technology of ${row.de} → ${row.vers}`);
    }
  }
});

Then("la vue contient exactement les étapes :", function (this: C4World, table: DataTable) {
  const columns = table.raw()[0] ?? [];
  const actual = this.currentView().relationships.map((r) => {
    const row: Record<string, string> = {
      ordre: String(r.order ?? ""),
      de: r.from,
      vers: r.to,
      description: r.description ?? "",
      technologie: r.technology ?? "",
    };
    return Object.fromEntries(columns.map((c) => [c, row[c] ?? `unknown column "${c}"`]));
  });
  assert.deepEqual(actual, table.hashes());
});

Then("la vue ne contient aucune frontière", function (this: C4World) {
  assert.deepEqual(this.currentView().boundaries, []);
});

Then("la vue contient la relation de {string} vers {string}", function (this: C4World, from: string, to: string) {
  assert.ok(relationshipPairs(this).includes(`${from} → ${to}`), `view: ${show(relationshipPairs(this))}`);
});

Then("la vue ne contient pas la relation de {string} vers {string}", function (this: C4World, from: string, to: string) {
  assert.ok(!relationshipPairs(this).includes(`${from} → ${to}`), `${from} → ${to} should not be in the view`);
});

Then("la vue ne contient aucune relation impliquant {string}", function (this: C4World, id: string) {
  const found = this.currentView().relationships.filter((r) => r.from === id || r.to === id);
  assert.deepEqual(found, []);
});

Then(/^la vue contient la frontière "([^"]+)" qui entoure (.+)$/, function (this: C4World, id: string, list: string) {
  const boundary = this.currentView().boundaries.find((b) => b.id === id);
  assert.ok(boundary, `no boundary "${id}"; boundaries: ${show(this.currentView().boundaries)}`);
  assert.deepEqual([...boundary.contains].sort(), quoted(list).sort());
});

Then("la frontière {string} n'entoure pas {string}", function (this: C4World, id: string, element: string) {
  const boundary = this.currentView().boundaries.find((b) => b.id === id);
  assert.ok(boundary, `no boundary "${id}"`);
  assert.ok(!boundary.contains.includes(element));
});

Then(/^la vue contient les mêmes éléments qu'avec "include": \["\*"\]$/, function (this: C4World) {
  const definition = this.currentView().definition;
  const reference = computeViewFromDefinition(this.model(), { ...definition, include: ["*"] });
  assert.deepEqual(this.currentView().elements, reference.elements);
});
