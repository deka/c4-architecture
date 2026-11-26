// Steps for loading and validating a workspace and inspecting the resulting model.
// Step phrases are in French to match the feature files.
import assert from "node:assert/strict";
import { Given, Then, When, type DataTable } from "@cucumber/cucumber";
import type { Element, ElementKind, Relationship } from "../../src/model.ts";
import { quoted, show, type C4World } from "./world.ts";

// --- Inputs ----------------------------------------------------------------

Given("le workspace suivant :", function (this: C4World, json: string) {
  this.setInput(JSON.parse(json));
});

Given("le modèle {string}", function (this: C4World, path: string) {
  this.readExample(path);
});

Given("le fichier {string} :", function (this: C4World, path: string, json: string) {
  this.files.set(path, json);
});

Given("la vue suivante remplace les vues existantes :", function (this: C4World, json: string) {
  this.setInput({ ...(this.input as object), views: [JSON.parse(json)] }, this.inputFile);
});

// --- Actions ---------------------------------------------------------------

When("je valide le workspace", function (this: C4World) {
  this.loadInput();
});

When("je valide le fichier {string}", function (this: C4World, file: string) {
  this.loadFile(file);
});

// --- Validation outcome ----------------------------------------------------

Then("il est accepté", function (this: C4World) {
  this.model();
});

Then("il est rejeté", function (this: C4World) {
  this.errors();
});

Then("il est rejeté avec une erreur sur {string}", function (this: C4World, path: string) {
  const errors = this.errors();
  assert.ok(errors.some((e) => e.path === path), `no error at ${path}; errors: ${show(errors)}`);
});

Then("il est rejeté avec {int} erreurs", function (this: C4World, count: number) {
  const errors = this.errors();
  assert.equal(errors.length, count, `errors: ${show(errors)}`);
});

// `"a"`, `"a" et "b"`, `"a", "b" et "c"`: a single error message must contain every string.
Then(/^le message d'erreur mentionne (.+)$/, function (this: C4World, list: string) {
  const expected = quoted(list);
  const errors = this.errors();
  assert.ok(
    errors.some((e) => expected.every((s) => e.message.includes(s))),
    `no message contains ${show(expected)}; errors: ${show(errors)}`,
  );
});

// --- Model content ---------------------------------------------------------

const kindByLabel: Record<string, ElementKind> = {
  personne: "person",
  système: "softwareSystem",
  conteneur: "container",
  composant: "component",
};

const yesNo = (value: boolean): string => (value ? "oui" : "non");

const elementAttributes: Record<string, (e: Element) => string> = {
  nom: (e) => e.name,
  description: (e) => e.description ?? "",
  externe: (e) => yesNo(e.external),
  groupe: (e) => e.group ?? "",
  technologie: (e) => e.technology ?? "",
  tags: (e) => e.tags.join(", "),
};

function findElement(world: C4World, label: string, id: string): Element {
  const element = world.model().elements.get(id);
  assert.ok(element, `element "${id}" is not in the model`);
  assert.equal(element.kind, kindByLabel[label], `"${id}" is not a ${kindByLabel[label]}`);
  return element;
}

function checkAttributes<T>(target: T, table: DataTable, readers: Record<string, (t: T) => string>, what: string): void {
  for (const { attribut, valeur } of table.hashes()) {
    const read = readers[attribut!];
    assert.ok(read, `unknown attribute in scenario: "${attribut}"`);
    assert.equal(read(target), valeur, `attribute "${attribut}" of ${what}`);
  }
}

Then(
  /^le modèle contient (?:la|le) (personne|système|conteneur|composant) "([^"]+)" avec :$/,
  function (this: C4World, label: string, id: string, table: DataTable) {
    checkAttributes(findElement(this, label, id), table, elementAttributes, `"${id}"`);
  },
);

Then(
  /^le modèle contient (?:la|le) (personne|système|conteneur|composant) "([^"]+)"$/,
  function (this: C4World, label: string, id: string) {
    findElement(this, label, id);
  },
);

Then("le parent de {string} est {string}", function (this: C4World, child: string, parent: string) {
  assert.equal(this.model().elements.get(child)?.parent, parent);
});

const relationshipAttributes: Record<string, (r: Relationship) => string> = {
  de: (r) => r.from,
  vers: (r) => r.to,
  description: (r) => r.description ?? "",
  technologie: (r) => r.technology ?? "",
  tags: (r) => r.tags.join(", "),
};

Then("le modèle contient la relation {string} avec :", function (this: C4World, id: string, table: DataTable) {
  const relationship = this.model().relationships.find((r) => r.id === id);
  assert.ok(relationship, `relationship "${id}" is not in the model`);
  checkAttributes(relationship, table, relationshipAttributes, `relationship "${id}"`);
});

const between = (world: C4World, from: string, to: string): Relationship[] =>
  world.model().relationships.filter((r) => r.from === from && r.to === to);

Then(
  "le modèle contient {int} relations de {string} vers {string}",
  function (this: C4World, count: number, from: string, to: string) {
    assert.equal(between(this, from, to).length, count);
  },
);

Then(
  "le modèle contient une relation implicite de {string} vers {string}",
  function (this: C4World, from: string, to: string) {
    assert.ok(between(this, from, to).some((r) => r.implied), `no implied relationship ${from} → ${to}`);
  },
);

Then(
  "le modèle contient une relation implicite de {string} vers {string} avec la description {string}",
  function (this: C4World, from: string, to: string, description: string) {
    const relationship = between(this, from, to).find((r) => r.implied);
    assert.ok(relationship, `no implied relationship ${from} → ${to}`);
    assert.equal(relationship.description, description);
  },
);

Then(
  "le modèle ne contient aucune relation de {string} vers {string}",
  function (this: C4World, from: string, to: string) {
    assert.deepEqual(between(this, from, to), []);
  },
);
