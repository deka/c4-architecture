# language: fr
Fonctionnalité: Détecter les modèles incohérents
  En tant qu'agent qui génère un modèle
  Je veux des erreurs précises, localisées par chemin JSON
  Afin de corriger mon modèle sans intervention humaine

  # Ces règles ne sont pas exprimables en JSON Schema : elles relèvent du runtime.

  Scénario: Deux éléments avec le même identifiant
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "people": [{ "id": "api", "name": "User" }],
          "softwareSystems": [{ "id": "app", "name": "App", "containers": [{ "id": "api", "name": "API" }] }]
        }
      }
      """
    Quand je valide le workspace
    Alors il est rejeté avec une erreur sur "/model/softwareSystems/0/containers/0/id"
    Et le message d'erreur mentionne "api" et "/model/people/0"

  Scénario: Une relation vers un élément inexistant
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "people": [{ "id": "user", "name": "User" }],
          "relationships": [{ "from": "user", "to": "wbe" }]
        }
      }
      """
    Quand je valide le workspace
    Alors il est rejeté avec une erreur sur "/model/relationships/0/to"
    Et le message d'erreur mentionne "wbe"

  Plan du scénario: Le périmètre d'une vue doit avoir le bon type (<type> sur <scope>)
    Étant donné le modèle "examples/online-banking.json"
    Et la vue suivante remplace les vues existantes :
      """json
      { "type": "<type>", "key": "view", "scope": "<scope>" }
      """
    Quand je valide le workspace
    Alors il est <résultat>

    Exemples:
      | type          | scope    | résultat |
      | systemContext | banking  | accepté  |
      | systemContext | api      | rejeté   |
      | container     | banking  | accepté  |
      | container     | customer | rejeté   |
      | component     | api      | accepté  |
      | component     | banking  | rejeté   |
      | component     | unknown  | rejeté   |

  Scénario: Deux vues avec la même clé
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": { "softwareSystems": [{ "id": "app", "name": "App" }] },
        "views": [
          { "type": "systemContext", "key": "view", "scope": "app" },
          { "type": "container", "key": "view", "scope": "app" }
        ]
      }
      """
    Quand je valide le workspace
    Alors il est rejeté avec une erreur sur "/views/1/key"

  Scénario: Un sélecteur de vue qui désigne un élément inexistant
    Étant donné le modèle "examples/online-banking.json"
    Et la vue suivante remplace les vues existantes :
      """json
      { "type": "container", "key": "view", "scope": "banking", "exclude": ["mainframee"] }
      """
    Quand je valide le workspace
    Alors il est rejeté avec une erreur sur "/views/0/exclude/0"

  Scénario: Toutes les erreurs sont rapportées en une fois
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "people": [{ "id": "user", "name": "User" }],
          "relationships": [{ "from": "x", "to": "user" }, { "from": "user", "to": "y" }]
        }
      }
      """
    Quand je valide le workspace
    Alors il est rejeté avec 2 erreurs
