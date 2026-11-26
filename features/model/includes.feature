# language: fr
Fonctionnalité: Découper un workspace en plusieurs fichiers
  En tant qu'agent qui maintient un gros modèle
  Je veux inclure des fichiers au même format
  Afin de partager des éléments communs entre plusieurs workspaces

  Contexte:
    Étant donné le fichier "shared/people.json" :
      """json
      { "version": 1, "model": { "people": [{ "id": "customer", "name": "Customer", "external": true }] } }
      """

  Scénario: Les éléments d'un fichier inclus sont disponibles
    Étant donné le fichier "workspace.json" :
      """json
      {
        "version": 1,
        "include": ["shared/people.json"],
        "model": {
          "softwareSystems": [{ "id": "app", "name": "Application" }],
          "relationships": [{ "from": "customer", "to": "app" }]
        }
      }
      """
    Quand je valide le fichier "workspace.json"
    Alors il est accepté
    Et le modèle contient la personne "customer"

  Scénario: Un identifiant défini deux fois entre fichiers est une erreur
    Étant donné le fichier "workspace.json" :
      """json
      {
        "version": 1,
        "include": ["shared/people.json"],
        "model": { "people": [{ "id": "customer", "name": "Another customer" }] }
      }
      """
    Quand je valide le fichier "workspace.json"
    Alors il est rejeté
    Et le message d'erreur mentionne "customer", "workspace.json" et "shared/people.json"

  Scénario: Les chemins sont relatifs au fichier qui inclut
    Étant donné le fichier "shared/index.json" :
      """json
      { "version": 1, "include": ["people.json"] }
      """
    Et le fichier "workspace.json" :
      """json
      { "version": 1, "include": ["shared/index.json"] }
      """
    Quand je valide le fichier "workspace.json"
    Alors le modèle contient la personne "customer"

  Plan du scénario: Les inclusions interdites sont refusées (<cas>)
    Étant donné le fichier "workspace.json" :
      """json
      { "version": 1, "include": ["<chemin>"] }
      """
    Quand je valide le fichier "workspace.json"
    Alors il est rejeté avec une erreur sur "/include/0"

    Exemples:
      | cas            | chemin                         |
      | URL distante   | https://example.com/model.json |
      | chemin absolu  | /etc/model.json                |
      | fichier absent | missing.json                   |

  Scénario: Une inclusion circulaire est détectée
    Étant donné le fichier "a.json" :
      """json
      { "version": 1, "include": ["b.json"] }
      """
    Et le fichier "b.json" :
      """json
      { "version": 1, "include": ["a.json"] }
      """
    Quand je valide le fichier "a.json"
    Alors il est rejeté
    Et le message d'erreur mentionne "a.json → b.json → a.json"
