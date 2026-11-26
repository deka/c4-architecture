# Spécifications de comportement

Scénarios Gherkin (en français, `# language: fr`) qui décrivent ce que le runtime doit faire. Ils servent de contrat lisible par un humain : si un besoin C4 n'apparaît dans aucun scénario, il n'est pas couvert.

## Lancer les scénarios

```sh
npm install
npm test            # exécute les scénarios avec cucumber-js
npm run typecheck   # vérifie les types (steps et src)
```

- Les steps sont dans `features/steps/` (TypeScript exécuté directement par Node 24, sans build). Ils ne font que traduire le Gherkin en appels au code de `src/`.
- Seuls les dossiers listés dans `cucumber.json` (`paths`) sont exécutés.

## Organisation

| Dossier   | Ce qui est vérifié                                               | Entrée                                          | Sortie observée                    |
|-----------|------------------------------------------------------------------|-------------------------------------------------|------------------------------------|
| `model/`  | Ce que le format accepte et refuse (schéma + règles sémantiques) | JSON en docstring                               | Accepté / rejeté + chemin d'erreur |
| `views/`  | Quels éléments et relations apparaissent dans chaque vue         | `examples/online-banking.json`                  | Contenu logique de la vue          |
| `cli/`    | Ligne de commande et inspection d'un modèle (avertissements)      | JSON en docstring ou fichier d'exemple          | Code de retour, sorties, avertissements |
| `rendering/` | À quoi ressemble le SVG et la page HTML                       | Petit workspace en docstring                    | Dessin approuvé par un humain      |

Les noms de dossiers et de fichiers sont en anglais ; seul le texte des scénarios est en français. Les données citées (ids, noms, descriptions) sont celles, en anglais, des fichiers JSON.

Les scénarios `views/` ne regardent pas le dessin : ils vérifient la sélection (quoi afficher). Les scénarios `rendering/` vérifient le dessin (comment l'afficher). Une régression de layout ne casse donc pas les tests de vues.

## Approbation des dessins

Un dessin ne se vérifie pas bien par assertions : on le regarde. Les scénarios de rendu sont donc des *approval tests*. Chacun part d'un petit workspace qui isole un comportement, dessine une vue et compare le SVG à une référence approuvée :

```gherkin
Quand je dessine la vue "context"
Alors le dessin correspond à la référence "colors/internal-and-external-system", sur laquelle on voit :
  | « Internet banking » a un fond bleu pastel et un contour bleu |
  | « Email system » a un fond gris pastel et un contour gris     |
```

- La clé (`colors/internal-and-external-system`) nomme le fichier de référence : `features/rendering/approved/<clé>.svg`, versionné.
- Le tableau dit à l'humain ce qu'il doit voir sur le dessin ; il n'est pas vérifié automatiquement.
- Sans référence, ou si le SVG diffère de la référence, le scénario échoue.
- `npm test` écrit la page de revue `output/review/index.html` : chaque dessin y figure avec le titre du scénario, la liste « à vérifier » et son statut (nouveau, modifié, approuvé). Un dessin modifié est affiché à côté de sa référence.
- Après revue, `npm run approve` copie les dessins nouveaux ou modifiés sur leurs références ; `npm run approve -- <clé>…` n'approuve que ceux-là.

Seuls les fichiers de `features/rendering/` listés dans `cucumber.json` sont exécutés ; les autres sont encore `@to-validate`.

## Contrat d'observation du SVG

Pour que les scénarios de rendu soient vérifiables sans comparer des pixels, chaque élément dessiné porte des attributs :

- `data-c4-id` : id de l'élément ou de la relation ;
- `data-c4-kind` : `person`, `softwareSystem`, `container`, `component`, `relationship`, `boundary`, `group`, `legend`.

Attributs complémentaires :

- éléments : `data-c4-shape` (forme dessinée) ;
- relations : `data-c4-from` et `data-c4-to`. Sans `id` déclaré, `data-c4-id` vaut `source->destination`, suffixé `#2`, `#3`… quand la paire se répète ;
- étapes d'une vue dynamique : en plus des attributs des relations, `data-c4-order` (numéro de l'étape, à partir de 1) ;
- groupes : `data-c4-id` vaut le nom du groupe et `data-c4-boundary` l'id de la frontière qui le contient, s'il y en a une. Un groupe se sélectionne donc par `data-c4-kind="group"` et son nom, sans collision avec un id d'élément ;
- légende : chaque entrée porte `data-c4-legend` (nom du tag ou `External`).

Les couleurs, formes et libellés sont lus sur le groupe SVG portant ces attributs.

## Tags des scénarios

- `@to-validate` : comportement proposé, à confirmer avant implémentation.
