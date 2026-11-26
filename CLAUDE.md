# CLAUDE.md

## Façon de travailler

- **Poser les questions une par une.** Une seule question par message, attendre la réponse avant la suivante. Ne jamais envoyer une liste de questions d'un coup.
- **Être sincère.** Dire ce que l'on pense vraiment, y compris « je ne sais pas », « je me suis trompé » ou « cette idée me paraît mauvaise ». Ne pas enjoliver un résultat, ne pas valider par complaisance.
- **Toujours challenger.** Questionner les choix proposés (périmètre, architecture, DSL, dépendances…) : demander le pourquoi, signaler les risques et proposer une alternative quand elle existe. Un challenge doit être argumenté ; s'il n'y a rien à redire, le dire franchement plutôt qu'inventer une objection.

## Branches et publication

- **On développe toujours sur `dev`.** Ne jamais commiter directement sur `main`. Si des changements se trouvent sur `main`, les déplacer sur `dev` avant de commiter.
- **`main` est la version publiée.** Chaque commit sur `main` est une nouvelle version du plugin : sa version est le hash Git, le champ `version` ne doit jamais être déclaré (le hook `.githooks/pre-commit` le refuse). Un push sur `main` redéploie aussi le site de documentation.
- **Deux skills du dépôt** (dans `.claude/skills/`, à ne pas confondre avec les skills du plugin dans `skills/`, qui sont livrées aux utilisateurs) :
  - `/push` : commite les changements en cours et les pousse sur `dev`.
  - `/publish` : publie sur `main`, via une pull request `dev` → `main`, tout ce qui est en attente sur `dev`.
- **Fusion `dev` → `main` par merge commit**, jamais en squash ni en rebase, et sans supprimer `dev` : sinon `dev` et `main` divergent et la publication suivante entre en conflit.

## Langue

- **En anglais :** le code (identifiants, commentaires, messages d'erreur), le schéma JSON, tous les fichiers JSON (y compris les valeurs des exemples) et les noms de fichiers.
- **En anglais aussi :** la documentation publique, destinée à un lecteur externe : `README.md` et le site de documentation (`site/`).
- **En français :** la documentation interne (`docs/design.md`…) et les fichiers `.feature` des tests. Les données citées dans les features (ids, noms) restent celles, en anglais, des fichiers JSON.

## Contexte du projet

Runtime qui lit un modèle C4 décrit en JSON (schéma : `schema/c4.schema.json`, concepts repris du Structurizr DSL) et produit des diagrammes SVG intégrés dans une page HTML autonome. Les modèles sont écrits par des agents. Pipeline : JSON → Chargement + inclusions → Validation → Modèle → Vues → Layout → Rendu SVG → HTML.

Le projet est en cours d'initialisation. Stack : TypeScript exécuté directement par Node 24 (pas de build), validation JSON Schema avec Ajv, tests de comportement en Gherkin français avec cucumber-js (`npm test`), site de documentation généré avec Eleventy (`npm run docs`, publié sur GitHub Pages). Les autres outils ne sont pas encore choisis — ne pas les supposer, les décider avec l'utilisateur. Le périmètre et les choix de conception sont décrits dans `docs/design.md` ; le `README.md` reste une présentation courte pour un lecteur externe.
