# Notes de conception

Notes internes du projet : objectifs, format d'entrée, règles de validation, exigences de rendu et périmètre. Pour une présentation rapide, voir le [README](../README.md).

## Objectif

Le runtime est destiné à être utilisé **par des agents** (skills d'agents) ou en autonome. À partir d'un fichier JSON qui décrit un modèle C4 (personnes, systèmes logiciels, conteneurs, composants et leurs relations), il doit :

1. **Charger et valider** le modèle (schéma puis règles sémantiques).
2. **Résoudre** les vues demandées (contexte système, conteneurs, composants…).
3. **Calculer la disposition** des éléments et des relations.
4. **Rendre** chaque vue en SVG, intégré dans une page HTML autonome que l'on peut ouvrir dans un navigateur sans outil externe.

## Philosophie

Devise : **« Agents read everything. Humans read what matters. »** Une architecture a deux lecteurs :

- **Les agents** reçoivent tout, en JSON strict et validé : c'est là que vit le détail.
- **Les humains** reçoivent le minimum à relire pour valider et décider : des diagrammes (un niveau de zoom à la fois) et des ADR aussi courts que possible. L'attention humaine est la ressource rare ; le volume de texte plausible et jamais relu (le *slop*) la gaspille.

Règle de conception : avant d'afficher une information à un humain, se demander s'il en a besoin pour relire ou décider ; sinon elle reste dans le JSON. `c4-drift` l'applique déjà (rapport complet pour l'agent, rapport réduit aux écarts pour le lecteur). Pour les ADR, c'est pour l'instant un objectif : seules les options ont une limite de longueur (une ou deux lignes).

## Pipeline prévu

```
 fichier JSON ──► Chargement + inclusions ──► Validation ──► Modèle C4 ──► Vues ──► Layout ──► Rendu SVG ──► HTML
```

| Étape       | Rôle                                                                                          |
|-------------|-----------------------------------------------------------------------------------------------|
| Chargement  | Lecture du fichier et fusion des fichiers inclus.                                             |
| Validation  | Schéma JSON puis règles sémantiques, avec des erreurs localisées par chemin JSON.             |
| Modèle      | Représentation typée des éléments C4 et des relations entre eux (dont relations implicites).  |
| Vues        | Sélection des éléments à afficher selon le niveau C4 (contexte, conteneurs, composants).      |
| Layout      | Positionnement automatique des nœuds et tracé des liens.                                      |
| Rendu       | Génération du SVG (formes, libellés, styles C4) et assemblage dans une page HTML.             |

## Langage d'entrée

Le format est un JSON décrit par [`schema/c4.schema.json`](../schema/c4.schema.json) (JSON Schema 2020-12). Il reprend les concepts du [Structurizr DSL](https://docs.structurizr.com/dsl) sans sa syntaxe. Pourquoi du JSON : les modèles sont écrits par des agents, qui peuvent produire un JSON valide par construction (structured outputs) et le valider sans parser dédié.

Choix de conception :

- **Identifiants globaux uniques** (`"id": "web"`) plutôt que des chemins hiérarchiques : une référence est toujours un simple id.
- **Tableaux d'objets avec `id`** plutôt que des objets indexés par clé : l'ordre est conservé et les doublons sont détectables (un `JSON.parse` écrase silencieusement les clés dupliquées).
- **Objets fermés** (`additionalProperties: false`) et énumérations pour les formes, directions et styles de trait, ce qui convient aux modes de sortie structurée.
- **URL en `http` ou `https` uniquement** (`url` des éléments et des relations) : l'élément devient un lien dans la page, un `javascript:` y serait exécuté au clic.
- **Relations déclarées à un seul endroit** (`model.relationships`), pas imbriquées dans les éléments.
- **Groupes** portés par un champ `group` sur l'élément, plutôt que par des blocs imbriqués.

Exemple ([`examples/basic.json`](../examples/basic.json)) :

```json
{
  "$schema": "../schema/c4.schema.json",
  "version": 1,
  "name": "Example",
  "model": {
    "people": [
      { "id": "user", "name": "User" }
    ],
    "softwareSystems": [
      {
        "id": "app",
        "name": "Application",
        "containers": [
          { "id": "web", "name": "Web App", "description": "User interface", "technology": "React" },
          { "id": "api", "name": "API", "description": "Business logic", "technology": "Node.js" }
        ]
      }
    ],
    "relationships": [
      { "from": "user", "to": "web", "description": "Uses" },
      { "from": "web", "to": "api", "description": "Calls", "technology": "HTTPS/JSON" }
    ]
  },
  "views": [
    { "type": "systemContext", "key": "context", "scope": "app", "title": "Context" },
    { "type": "container", "key": "containers", "scope": "app", "title": "Containers" }
  ]
}
```

Sortie : une page HTML contenant un diagramme SVG par vue déclarée.

### Repris du Structurizr DSL

- **Éléments :** `person`, `softwareSystem`, `container`, `component`, avec nom, description, technologie (conteneurs et composants), tags, URL, groupe, propriétés.
- **Relations :** source, destination, description, technologie, tags, URL, propriétés ; relations implicites (activées par défaut).
- **Vues :** `systemLandscape`, `systemContext`, `container`, `component`, avec `include`/`exclude` (`"*"`, id, tag, relation) et layout automatique (direction, espacements).
- **Vues dynamiques :** `dynamic`, une liste ordonnée d'étapes (`steps`) numérotées à partir de 1. Comme dans Structurizr, chaque étape est une instance d'une relation du modèle, déclarée ou implicite, dans le même sens : une vue dynamique ne peut pas montrer un lien absent des vues statiques. Sans `scope`, les étapes relient personnes et systèmes ; avec un système, ses conteneurs (dans sa frontière) ; avec un conteneur, ses composants. La description d'une étape remplace celle de la relation sur le dessin ; la technologie vient toujours de la relation. Quand plusieurs relations relient la même paire, l'étape prend celle de même description, sinon la première déclarée.
  Écarts assumés avec Structurizr : une étape sans description reprend celle de la relation (Structurizr affiche un libellé vide) ; pas de `technology` dans une étape (chez Structurizr, il ne sert qu'à choisir la relation) ; pas encore de séquences parallèles (`1.1`, `1.2`) ni d'étapes de réponse (relation parcourue à l'envers).
- **Styles par tag :** éléments (forme, couleurs, bordure, opacité, taille de police, icône) et relations (couleur, épaisseur, style de trait, routage, position du libellé).
  Formes retenues : `box`, `roundedBox`, `person`, `cylinder`, `pipe`, `component`, `webBrowser`, `mobileDevicePortrait`, `folder`. Les autres formes de Structurizr (`robot`, `hexagon`, `bucket`…) sont écartées : rares en C4, elles coûtent à dessiner et à maintenir.
- **Inclusions :** `include`, liste de chemins relatifs vers des fichiers au même format.

### Règles de validation hors schéma

Le schéma ne peut pas tout exprimer. Le runtime vérifiera en plus :

- les `id` sont uniques dans tout le workspace, inclusions comprises ; les `key` de vues aussi ;
- `from`, `to`, `scope` et les sélecteurs désignent des éléments ou relations existants ;
- le `scope` d'une vue `systemContext` ou `container` est un `softwareSystem`, celui d'une vue `component` est un `container` ; celui d'une vue `dynamic` est l'un ou l'autre, ou absent ;
- chaque étape d'une vue `dynamic` correspond à une relation du modèle, et ses éléments sont permis par le `scope` de la vue ;
- `version` est identique dans tous les fichiers inclus.

### Inclusions : règles de fusion (proposition)

- Les chemins sont relatifs au fichier qui les déclare ; pas d'URL distante.
- Les tableaux (`people`, `softwareSystems`, `relationships`, `views`, styles) sont concaténés ; un id en double est une erreur, pas un écrasement.
- `name` et `description` du fichier racine priment.
- Les inclusions circulaires sont une erreur.

## Exigences de rendu

- **HTML + SVG autonome :** un seul fichier HTML qui contient le SVG en ligne, sans ressource externe (ni CDN, ni police distante, ni script tiers). Les icônes ne sont acceptées qu'en data URI.
- **Pas d'ombres :** aucune ombre portée, aucun filtre de flou.
- **Couleurs C4 en pastel :** bleu pour ce qui fait partie des systèmes modélisés, un peu plus clair à chaque niveau (personne, système, conteneur, composant), gris pour les éléments marqués `external`. Comme dans Structurizr, la couleur appartient à l'élément et non à la vue. Un style par tag la remplace.
- **Mise en page automatique** avec elkjs (algorithme `layered`, liens orthogonaux à coins arrondis). Le texte est mesuré avec la police Inter embarquée (sous-ensemble latin, graisses 400 et 600, licence OFL) : le découpage des lignes ne dépend donc pas de la machine.
- **Page sans script :** une section par vue, dans l'ordre de déclaration, avec une navigation par ancres. Une `Content-Security-Policy` interdit toute ressource qui ne serait pas en data URI. La page se comporte en visualiseur : une seule vue est affichée, celle que désigne l'ancre de l'URL (la première vue déclarée par défaut), grâce à `:target` et `:has()` en CSS. À l'impression, toutes les vues s'affichent, une par page. Revers assumé : la recherche du navigateur ne porte que sur la vue affichée.
- **Navigation dans le modèle :** une barre latérale fixe liste d'abord une vue d'ensemble (paysages et vues dynamiques sans `scope`), puis chaque système logiciel qui a des vues, dans l'ordre du modèle. Un système ne déplie ses vues (contexte, conteneurs, composants par conteneur, vues dynamiques) que lorsque l'une d'elles est affichée, et la vue affichée est mise en évidence. Le regroupement par niveau a été écarté : avec une douzaine de systèmes, chaque colonne répétait la même liste de systèmes. Un clic sur un élément descend dans sa vue de détail : pour un système, sa première vue conteneurs, à défaut sa vue de contexte ; pour un conteneur, sa première vue composants. Ce lien interne remplace l'`url` de l'élément, qui ne sert plus que lorsque l'élément n'a pas de vue de détail. Pour remonter, on clique sur l'en-tête d'une frontière, qui mène à la vue d'un niveau au-dessus, ou sur le fil d'Ariane affiché au-dessus de chaque vue (paysage › contexte › conteneurs › vue courante). Ces liens ne sont produits que dans la page : un SVG rendu seul n'en a pas.
- **Pas de rendu façon Mermaid :** on ne passe pas par Mermaid et on ne reproduit pas son rendu générique. Le SVG est produit directement par le runtime et le style est soigné.

## Hors périmètre (pour l'instant)

- La syntaxe textuelle du Structurizr DSL.
- Les diagrammes de code (niveau 4), les vues de déploiement, filtrées, personnalisées et images.
- Dans les vues dynamiques : les séquences parallèles et les étapes de réponse.
- `!script`, `!plugin`, `!docs`, `!adrs`, les perspectives. Les ADR sont gérés par le skill `c4-adr`, hors du runtime (voir [Plugin Claude Code](#plugin-claude-code)).
- Les thèmes distants, le branding, la terminologie personnalisée.
- L'édition interactive des diagrammes.
- L'export vers d'autres formats (PNG, PDF…).

## Développement et ligne de commande

TypeScript sur Node 24 (exécuté sans étape de build). Les comportements attendus sont décrits en Gherkin dans [`features/`](../features/README.md) et exécutés avec cucumber-js : `npm install` puis `npm test`.

### Commandes

```sh
node src/cli.ts validate <model.json> [--json]     # schéma + règles sémantiques
node src/cli.ts inspect <model.json> [--json]      # contenu de chaque vue + avertissements de modélisation
node src/cli.ts render <model.json> [output.html]  # page HTML (sortie standard sans fichier)
```

- **Codes de retour :** 0 en cas de succès, 1 si le modèle est invalide, 2 pour une erreur d'utilisation. `--help` affiche l'aide.
- **Erreurs de validation :** écrites sur la sortie d'erreur sous la forme `fichier: chemin JSON Pointer: message`. Avec `--json`, elles vont sur la sortie standard au format `{ "ok": false, "errors": [{ "file", "path", "message" }] }`.
- **`inspect` :** permet à un agent de relire ses diagrammes sans voir le SVG. La commande liste les éléments et relations de chaque vue, puis des avertissements qui ne rejettent pas le modèle : élément sans description, conteneur sans technologie, relation entre conteneurs sans protocole, élément présent dans aucune vue, vue de plus de 20 éléments.

Raccourci : `npm run render -- examples/online-banking.json online-banking.html`.

Générer tous les exemples de [`examples/`](../examples/) dans `output/` (un fichier `<nom>.html` par exemple) : `npm run examples`.

## Site de documentation

Le site public (en anglais) est construit avec [Eleventy](https://www.11ty.dev/) 3 depuis `site/` et publié sur GitHub Pages par `.github/workflows/pages.yml` à chaque push sur `main`. Eleventy a été retenu comme le générateur le plus léger (environ 23 Mo de dépendances, en `devDependencies`) : il produit du HTML sans script et sa config, un module Node, importe directement le runtime TypeScript.

- **Diagrammes :** rendus par le runtime au moment de la construction (`eleventy.config.js`, shortcode `diagram`), à partir de `examples/*.json` et `site/models/*.json`. Un modèle invalide fait échouer la construction : la doc ne peut pas montrer un rendu périmé.
- **Référence du schéma :** générée depuis les `description` de `schema/c4.schema.json` (`site/_lib/schema-reference.js`). Une propriété ajoutée au schéma doit donc avoir une description.
- **Commandes :** `npm run docs` (sortie dans `_site/`), `npm run docs:serve` pour un aperçu local sous `/c4-architecture/`.

## Plugin Claude Code

Le dépôt est aussi un plugin Claude Code (`c4-architecture`) et sa propre marketplace (`.claude-plugin/`). Il fournit le skill `c4-design` (`skills/c4-design/`) : un atelier pour concevoir une architecture **avant d'écrire le code**. L'agent pose une question à la fois et monte les niveaux dans l'ordre : contexte système, puis conteneurs, puis relations. Après chaque modification, il valide, inspecte et rend le modèle.

Il fournit aussi le skill `c4-drift` (`skills/c4-drift/`) : il compare le modèle au code du dépôt et liste les écarts. Le skill ne s'appuie que sur l'agent, sans commande du runtime dédiée ; le choix d'un `diff` déterministe entre deux modèles a été écarté.

- **Source de vérité :** le modèle JSON. Le rapport donne l'écart, sans justification ni hypothèse sur l'intention (cible ou défaut).
- **Granularité :** le niveau le plus détaillé que le modèle décrit pour chaque élément. Pour un conteneur sans composants, seuls les liens qui en sortent ou y entrent comptent. Seules les relations déclarées sont comparées, pas les relations implicites. Le code interne partagé qui n'est pas un élément du modèle (utilitaires, serveur HTTP commun, propriété `code.transverse`) et l'outillage de test ou de développement sont ignorés.
- **Évaluation d'une relation :** depuis l'extrémité qui a du code dans le dépôt (l'appelant pour Docker Engine, l'écrivain pour un volume). Un conteneur est classé `code` (UI, service : sans code trouvé, il donne une ligne « aucun code »), `infrastructure` (moteur, base, volume : jamais « aucun code ») ou `none` (code hors du dépôt, par exemple généré à l'exécution). Règle issue d'un essai sur un vrai dépôt : sans elle, l'infrastructure apparaissait « sans code » et masquait les relations vers elle.
- **Périmètre :** tout le modèle par défaut, ou une partie désignée par un id d'élément, une clé de vue ou du texte libre. On garde les liens qui touchent le périmètre, entrants comme sortants. Les relations dont aucune extrémité n'a de code dans le dépôt (une personne, deux systèmes externes) ne sont pas évaluées : elles sont listées dans le fichier pour les agents, pas dans le rapport pour le lecteur.
- **Sorties :** à côté du fichier racine du modèle, nommées d'après lui : `<nom>.drift.json` et `<nom>.drift.md` pour `<nom>.json` (`docs/architecture/workspace.drift.json` pour le modèle par défaut). Chaque modèle d'un dossier, par exemple chaque option, garde ainsi ses propres écarts ; un nouveau passage écrase les fichiers précédents du même modèle. Le choix initial de `tmp/` ou `temp/` a été abandonné : les écarts accompagnent le modèle qu'ils décrivent. `<nom>.drift.json`, complet, avec les localisations dans le code et le modèle et les relations conformes, est destiné aux agents. `<nom>.drift.md`, très court et sans localisation, est destiné au lecteur.
- **Ordre du rapport :** non modélisé, puis écart (technologie, sens ou cible différents), puis reste à faire, puis décisions. Dans chaque section, les systèmes externes passent en premier.
- **Décisions :** les ADR acceptés du dossier `decisions/` sont comparés au modèle (id inconnu, contradiction), et tous les ADR sont contrôlés pour leurs liens de remplacement. Le modèle n'est la référence que face au code : entre un ADR et le modèle, le rapport signale l'écart sans désigner le fautif, car l'erreur peut venir d'un ADR non remplacé comme d'un modèle non mis à jour. Ce contrôle est dans `c4-drift` et non dans `c4-adr`, pour n'avoir qu'un rapport « ce qui ne colle plus ».

Il fournit enfin le skill `c4-adr` (`skills/c4-adr/`) : il rédige les décisions d'architecture (ADR) liées aux éléments du modèle et les remplace quand elles changent. `c4-design` propose d'en rédiger un, en une ligne et sans rien écrire sans accord, quand une décision structurante est prise pendant l'atelier.

- **Pas de changement du schéma ni du runtime :** les ADR sont des fichiers Markdown qui citent les ids du modèle dans un front matter YAML. Le lien n'est donc pas vérifié par `validate`, mais par `c4-drift`. Un champ du schéma qui référencerait les ADR a été écarté pour l'instant, pour garder le runtime simple.
- **Format :** MADR allégé, dans `decisions/` à côté du fichier racine du modèle, nommé `NNNN-slug.md`. Front matter : `status` (`proposed`, `accepted`, `rejected`, `superseded`), `date`, `elements` (ids, jamais vide), `supersedes`, `superseded-by` (numéros entre guillemets pour garder les zéros), `models` facultatif (les modèles du dossier concernés, par exemple une seule option). Sections : contexte, options considérées, décision, conséquences. Les clés restent en anglais, le texte est dans la langue de l'utilisateur.
- **Remplacement :** un ADR accepté n'est jamais modifié. Le nouvel ADR porte `supersedes`, et seul le front matter de l'ancien change (`superseded`, `superseded-by`). Un ADR resté `proposed` se modifie sur place ; jamais accepté, il devient `rejected`.
- **Modèle :** après avoir écrit un ADR, l'agent compare la décision au modèle et propose de mettre à jour le modèle s'il ne la montre pas. Il ne le modifie jamais sans accord.

- **Prérequis :** Node 24 ou plus récent chez l'utilisateur.
- **Appel du runtime :** le skill l'exécute via `${CLAUDE_PLUGIN_ROOT}/src/cli.ts`.
- **Dépendances (non vérifié) :** d'après la documentation de Claude Code, une installation depuis la marketplace installe les dépendances npm grâce à `package.json` et `package-lock.json`. Ce mécanisme n'a pas encore été testé, et on ne sait pas si les `devDependencies` sont exclues.
- **Essai en local :** lancer `claude --plugin-dir .` après `npm install`, puis demander par exemple « concevons l'architecture d'une boutique en ligne » ou invoquer `/c4-architecture:c4-design`.
- **Vérification du manifest :** `claude plugin validate .`.

Les modèles produits sont écrits par défaut dans `docs/architecture/workspace.json` du projet de l'utilisateur, avec la page `workspace.html` à côté.

