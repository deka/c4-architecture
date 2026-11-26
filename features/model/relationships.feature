# language: fr
Fonctionnalité: Déclarer les relations
  En tant qu'agent qui décrit une architecture
  Je veux relier les éléments entre eux avec une description et une technologie
  Afin que les diagrammes montrent qui utilise quoi et comment

  Scénario: Une relation entre deux conteneurs avec tous ses attributs
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [{
            "id": "app", "name": "Application",
            "containers": [
              { "id": "web", "name": "Web" },
              { "id": "api", "name": "API" }
            ]
          }],
          "relationships": [{
            "id": "webToApi", "from": "web", "to": "api",
            "description": "Calls", "technology": "HTTPS/JSON",
            "tags": ["Synchronous"], "url": "https://docs.example/api",
            "properties": [{ "name": "latency", "value": "50ms" }]
          }]
        }
      }
      """
    Quand je valide le workspace
    Alors il est accepté
    Et le modèle contient la relation "webToApi" avec :
      | attribut    | valeur                    |
      | de          | web                       |
      | vers        | api                       |
      | description | Calls                     |
      | technologie | HTTPS/JSON                |
      | tags        | Relationship, Synchronous |

  Scénario: Plusieurs relations entre les mêmes éléments sont conservées
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [{ "id": "shop", "name": "Shop" }, { "id": "billing", "name": "Billing" }],
          "relationships": [
            { "from": "shop", "to": "billing", "description": "Sends orders" },
            { "from": "shop", "to": "billing", "description": "Sends invoices" }
          ]
        }
      }
      """
    Quand je valide le workspace
    Alors le modèle contient 2 relations de "shop" vers "billing"

  Scénario: Les relations implicites sont déduites des relations entre enfants
    Étant donné le modèle "examples/online-banking.json"
    Quand je valide le workspace
    Alors le modèle contient une relation implicite de "customer" vers "banking" avec la description "Views accounts"
    Et le modèle contient une relation implicite de "api" vers "database"
    Et le modèle contient une relation implicite de "banking" vers "mainframe"

  Scénario: Les relations implicites peuvent être désactivées
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "impliedRelationships": false,
          "people": [{ "id": "user", "name": "User" }],
          "softwareSystems": [{ "id": "app", "name": "App", "containers": [{ "id": "web", "name": "Web" }] }],
          "relationships": [{ "from": "user", "to": "web" }]
        }
      }
      """
    Quand je valide le workspace
    Alors le modèle ne contient aucune relation de "user" vers "app"

  Scénario: Pas de relation implicite entre un élément et son propre parent
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [{ "id": "app", "name": "App", "containers": [
            { "id": "web", "name": "Web" }, { "id": "api", "name": "API" }
          ] }],
          "relationships": [{ "from": "web", "to": "api" }]
        }
      }
      """
    Quand je valide le workspace
    Alors le modèle ne contient aucune relation de "app" vers "app"
    Et le modèle ne contient aucune relation de "web" vers "app"

  Scénario: Une relation sans source ni destination est refusée
    Étant donné le workspace suivant :
      """json
      { "version": 1, "model": { "relationships": [{ "description": "Calls" }] } }
      """
    Quand je valide le workspace
    Alors il est rejeté avec une erreur sur "/model/relationships/0"
