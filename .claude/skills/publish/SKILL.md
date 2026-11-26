---
name: publish
description: Publie sur main tout ce qui est en attente sur la branche dev du dépôt c4-architecture, via une pull request dev → main fusionnée par merge commit. Skill de développement du dépôt, pas une skill du plugin.
disable-model-invocation: true
---

# publish — publier `dev` sur `main`

`main` est la version publiée : chaque commit sur `main` devient une nouvelle version du plugin (sa version est le hash Git) et redéploie le site de documentation. Cette skill fait passer sur `main` tout ce qui attend sur `dev` (voir « Branches et publication » dans `CLAUDE.md`).

## Étapes

1. **Vérifier l'état de `dev`.**
   - `git fetch origin`.
   - Des changements non commités ou des commits non poussés sur `dev` : proposer de lancer d'abord `/push`, et s'arrêter.
   - Lister ce qui est en attente : `git log --oneline origin/main..origin/dev`. Si la liste est vide, le dire et s'arrêter.
   - Si `origin/main` contient des commits absents de `dev` (`git log --oneline origin/dev..origin/main` non vide, hors merge commits de publications précédentes) : le signaler, fusionner `origin/main` dans `dev`, pousser `dev`, puis reprendre.

2. **Vérifier.** Sur `dev` à jour : `npm run typecheck`, `npm test`, `npm run check:plugin-version`. Si une vérification échoue, s'arrêter et montrer l'erreur.

3. **Ouvrir la pull request.** Réutiliser la PR ouverte `dev` → `main` s'il y en a une (`gh pr list --head dev --base main`), sinon :
   `gh pr create --base main --head dev --title "<titre>" --body-file <fichier>`
   - Titre au format Conventional Commits, en anglais, qui résume la publication.
   - Corps en anglais : la liste des commits publiés, regroupés par type (features, fixes, docs, chores).
   - Écrire le corps dans un fichier temporaire plutôt que dans la ligne de commande.

4. **Attendre les checks.** `gh pr checks <numéro> --watch`. Si un check échoue, s'arrêter et montrer l'erreur.

5. **Fusionner par merge commit.** `gh pr merge <numéro> --merge`.
   - Jamais `--squash` ni `--rebase` : `dev` et `main` divergeraient et la publication suivante entrerait en conflit.
   - Jamais `--delete-branch` : `dev` est permanente.
   - Si GitHub renvoie une erreur transitoire, vérifier l'état réel de la PR (`gh pr view <numéro> --json state,mergeCommit`) avant de réessayer.

6. **Resynchroniser les branches locales.**
   - `git fetch origin`, puis mettre `main` local à jour (`git switch main && git merge --ff-only origin/main`).
   - Revenir sur `dev` et l'avancer jusqu'à `main` (`git switch dev && git merge --ff-only origin/main && git push origin dev`), pour que la publication suivante parte du merge commit.

7. **Rendre compte.** Donner l'URL de la PR, le hash du merge commit sur `main` (la nouvelle version du plugin) et rappeler que les utilisateurs l'obtiennent avec `/plugin marketplace update c4-architecture` puis une mise à jour du plugin.
