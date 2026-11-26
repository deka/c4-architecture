# language: fr
Fonctionnalité: Piloter le runtime en ligne de commande
  En tant qu'agent qui écrit un modèle C4
  Je veux des commandes aux sorties et codes de retour stables
  Afin d'enchaîner écrire, valider, inspecter et dessiner sans intervention humaine

  # Codes de retour : 0 succès, 1 modèle invalide, 2 erreur d'utilisation.

  Scénario: Un modèle valide est accepté
    Étant donné le modèle "examples/basic.json"
    Quand je lance "validate" sur le workspace
    Alors la commande se termine avec le code 0
    Et la sortie d'erreur est vide

  Scénario: Les erreurs de validation sont lisibles par un humain
    Étant donné le workspace suivant :
      """json
      { "version": 1, "model": { "relationships": [{ "from": "user", "to": "app" }] } }
      """
    Quand je lance "validate" sur le workspace
    Alors la commande se termine avec le code 1
    Et la sortie d'erreur contient "/model/relationships/0/from"

  Scénario: Les erreurs de validation sont disponibles en JSON
    Étant donné le workspace suivant :
      """json
      { "version": 1, "model": { "relationships": [{ "from": "user", "to": "app" }] } }
      """
    Quand je lance "validate --json" sur le workspace
    Alors la commande se termine avec le code 1
    Et la sortie JSON indique une erreur sur "/model/relationships/0/to"

  Scénario: Un fichier introuvable est une erreur de validation
    Quand je lance "validate --json" sur le fichier "examples/missing.json"
    Alors la commande se termine avec le code 1
    Et la sortie JSON indique une erreur sur "/"

  Scénario: L'inspection résume les vues
    Quand je lance "inspect" sur le fichier "examples/online-banking.json"
    Alors la commande se termine avec le code 0
    Et la sortie standard contient "View \"containers\" (container, scope banking)"
    Et la sortie standard contient "No warnings."

  Scénario: L'inspection est disponible en JSON
    Étant donné le workspace suivant :
      """json
      { "version": 1, "model": { "people": [{ "id": "user", "name": "User" }] } }
      """
    Quand je lance "inspect --json" sur le workspace
    Alors la commande se termine avec le code 0
    Et la sortie JSON indique un modèle valide
    Et la sortie JSON signale "missing-description"

  Scénario: Le rendu écrit la page HTML sur la sortie standard
    Quand je lance "render" sur le fichier "examples/basic.json"
    Alors la commande se termine avec le code 0
    Et la sortie standard contient "<!DOCTYPE html>"

  Scénario: Une commande inconnue est une erreur d'utilisation
    Quand je lance "draw examples/basic.json"
    Alors la commande se termine avec le code 2
    Et la sortie d'erreur contient "unknown command: draw"

  Scénario: L'aide décrit les commandes
    Quand je lance "--help"
    Alors la commande se termine avec le code 0
    Et la sortie standard contient "validate <model.json> [--json]"
