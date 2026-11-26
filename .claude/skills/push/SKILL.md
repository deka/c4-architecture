---
name: push
description: Commite les changements en cours du dépôt c4-architecture et les pousse sur la branche dev. Skill de développement du dépôt, pas une skill du plugin.
disable-model-invocation: true
argument-hint: "[précision sur le message de commit]"
---

# push — commiter et pousser sur `dev`

On développe toujours sur `dev` (voir « Branches et publication » dans `CLAUDE.md`). Cette skill enregistre le travail en cours sur `dev` ; elle ne touche jamais à `main`.

## Étapes

1. **Se placer sur `dev`.**
   - `git fetch origin`.
   - Si la branche courante est `dev` : continuer.
   - Si la branche courante est `main` (ou une autre) avec des changements non commités : `git switch dev` (les changements suivent ; en cas de conflit, `git stash`, `git switch dev`, `git stash pop` et résoudre).
   - Si des commits locaux non poussés existent sur `main` : s'arrêter et demander à l'utilisateur quoi en faire. Ne jamais pousser sur `main`.
   - Si `dev` n'existe pas en local : `git switch -c dev --track origin/dev` (ou la créer depuis `origin/main` si elle n'existe nulle part).
   - Si `origin/dev` a avancé : `git pull --rebase origin dev` avant de commiter.

2. **Choisir les fichiers.** Lire `git status` et `git diff`. Indexer les changements qui relèvent du travail en cours. Laisser de côté et signaler à l'utilisateur :
   - les fichiers qui semblent sans rapport avec ce travail ;
   - les fichiers générés ou temporaires ;
   - tout fichier qui pourrait contenir un secret (`.env`, identifiants, `.claude/settings.local.json`…).
   En cas de doute sur un fichier, demander plutôt que l'inclure.

3. **Vérifier.** Lancer `npm run typecheck` et `npm test`. Si une vérification échoue, s'arrêter et montrer l'erreur : ne pas commiter un état cassé sans l'accord explicite de l'utilisateur.

4. **Commiter.** Message au format Conventional Commits, en anglais (`feat:`, `fix:`, `docs:`, `chore:`…), sujet court, corps qui explique le pourquoi si ce n'est pas évident. Plusieurs sujets indépendants : plusieurs commits. Ne jamais utiliser `--no-verify` : le hook `pre-commit` doit passer. S'il refuse le commit (par exemple parce qu'un champ `version` a été ajouté au plugin), corriger la cause.

5. **Pousser.** `git push origin dev` (avec `-u` si la branche n'a pas encore d'amont). Jamais de `--force` sur `dev`.

6. **Rendre compte.** Lister les commits poussés (`git log --oneline origin/main..dev`) : c'est ce qui sera publié au prochain `/publish`.
