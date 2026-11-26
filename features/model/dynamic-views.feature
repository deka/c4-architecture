# language: fr
Fonctionnalité: Valider les vues dynamiques
  En tant qu'agent qui décrit un scénario d'exécution
  Je veux que chaque étape corresponde à une relation du modèle
  Afin que le diagramme dynamique ne contredise jamais les vues statiques

  # Comme dans Structurizr, une étape est une instance d'une relation existante, déclarée ou implicite,
  # dans le même sens. Les éléments permis dépendent du périmètre de la vue.

  Contexte:
    Étant donné le modèle "examples/online-banking.json"

  Scénario: Des étapes qui reprennent des relations déclarées et implicites sont acceptées
    Et la vue suivante remplace les vues existantes :
      """json
      {
        "type": "dynamic", "key": "transfer", "scope": "banking",
        "steps": [
          { "from": "customer", "to": "web", "description": "Submits a transfer" },
          { "from": "web", "to": "api" },
          { "from": "api", "to": "mainframe" }
        ]
      }
      """
    Quand je valide le workspace
    Alors il est accepté

  Scénario: Une étape sans relation correspondante est rejetée
    Et la vue suivante remplace les vues existantes :
      """json
      {
        "type": "dynamic", "key": "transfer", "scope": "banking",
        "steps": [
          { "from": "customer", "to": "web" },
          { "from": "web", "to": "database", "description": "Reads the balance" }
        ]
      }
      """
    Quand je valide le workspace
    Alors il est rejeté avec une erreur sur "/views/0/steps/1"
    Et le message d'erreur mentionne "web" et "database"

  Scénario: Une relation existante dans l'autre sens ne suffit pas
    Et la vue suivante remplace les vues existantes :
      """json
      { "type": "dynamic", "key": "reply", "scope": "banking", "steps": [{ "from": "web", "to": "customer" }] }
      """
    Quand je valide le workspace
    Alors il est rejeté avec une erreur sur "/views/0/steps/0"

  Scénario: Sans relations implicites, une étape entre conteneurs exige une relation déclarée
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "impliedRelationships": false,
          "softwareSystems": [{ "id": "app", "name": "App", "containers": [
            { "id": "web", "name": "Web", "components": [{ "id": "page", "name": "Page" }] },
            { "id": "api", "name": "API" }
          ] }],
          "relationships": [{ "from": "page", "to": "api", "description": "Calls" }]
        },
        "views": [{ "type": "dynamic", "key": "flow", "scope": "app", "steps": [{ "from": "web", "to": "api" }] }]
      }
      """
    Quand je valide le workspace
    Alors il est rejeté avec une erreur sur "/views/0/steps/0"

  Scénario: Une étape vers un élément inexistant
    Et la vue suivante remplace les vues existantes :
      """json
      { "type": "dynamic", "key": "transfer", "steps": [{ "from": "customer", "to": "bnaking" }] }
      """
    Quand je valide le workspace
    Alors il est rejeté avec une erreur sur "/views/0/steps/0/to"
    Et le message d'erreur mentionne "bnaking"

  Scénario: Une vue dynamique sans étape est rejetée
    Et la vue suivante remplace les vues existantes :
      """json
      { "type": "dynamic", "key": "empty", "steps": [] }
      """
    Quand je valide le workspace
    Alors il est rejeté

  Plan du scénario: Le périmètre d'une vue dynamique est un système ou un conteneur (<scope>)
    Et la vue suivante remplace les vues existantes :
      """json
      { "type": "dynamic", "key": "flow", "scope": "<scope>", "steps": [{ "from": "<de>", "to": "<vers>" }] }
      """
    Quand je valide le workspace
    Alors il est <résultat>

    Exemples:
      | scope    | de         | vers     | résultat |
      | banking  | customer   | web      | accepté  |
      | api      | controller | service  | accepté  |
      | customer | customer   | web      | rejeté   |
      | unknown  | customer   | web      | rejeté   |

  Plan du scénario: Les éléments permis dépendent du périmètre (<cas>)
    Et la vue suivante remplace les vues existantes :
      """json
      <vue>
      """
    Quand je valide le workspace
    Alors il est rejeté avec une erreur sur "<chemin>"

    Exemples:
      | cas                                          | vue                                                                                                          | chemin                 |
      | conteneur sans périmètre                     | { "type": "dynamic", "key": "flow", "steps": [{ "from": "customer", "to": "web" }] }                         | /views/0/steps/0/to    |
      | composant dans le périmètre d'un système     | { "type": "dynamic", "key": "flow", "scope": "banking", "steps": [{ "from": "web", "to": "controller" }] }    | /views/0/steps/0/to    |
      | le système du périmètre lui-même             | { "type": "dynamic", "key": "flow", "scope": "banking", "steps": [{ "from": "customer", "to": "banking" }] }  | /views/0/steps/0/to    |
      | le conteneur du périmètre lui-même           | { "type": "dynamic", "key": "flow", "scope": "api", "steps": [{ "from": "web", "to": "api" }] }               | /views/0/steps/0/to    |
      | le système parent du conteneur du périmètre  | { "type": "dynamic", "key": "flow", "scope": "api", "steps": [{ "from": "customer", "to": "banking" }] }      | /views/0/steps/0/to    |
