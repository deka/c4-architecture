# language: fr
Fonctionnalité: Vue dynamique
  En tant que lecteur d'un diagramme
  Je veux voir l'enchaînement numéroté des interactions d'un scénario
  Afin de comprendre comment les éléments collaborent pour le réaliser

  Contexte:
    Étant donné le modèle "examples/online-banking.json"

  Scénario: La vue montre uniquement les éléments cités par les étapes
    Quand je calcule la vue "transfer"
    Alors la vue contient exactement les éléments :
      | id        | type           | rôle    |
      | customer  | person         | voisin  |
      | web       | container      | interne |
      | api       | container      | interne |
      | database  | container      | interne |
      | mainframe | softwareSystem | voisin  |
      | email     | softwareSystem | voisin  |

  Scénario: Le système du périmètre est représenté par sa frontière
    Quand je calcule la vue "transfer"
    Alors la vue contient la frontière "banking" qui entoure "web", "api" et "database"

  Scénario: Les étapes sont numérotées dans l'ordre et reprennent la technologie de leur relation
    Quand je calcule la vue "transfer"
    Alors la vue contient exactement les étapes :
      | ordre | de       | vers      | description                 | technologie |
      | 1     | customer | web       | Submits a transfer          | HTTPS       |
      | 2     | web      | api       | Sends the transfer          | HTTPS/JSON  |
      | 3     | api      | database  | Records the transfer        | SQL         |
      | 4     | api      | mainframe | Syncs the transfer          | MQ          |
      | 5     | api      | email     | Requests a confirmation     | SMTP        |
      | 6     | email    | customer  | Sends the confirmation      |             |

  Scénario: Sans description, une étape reprend celle de sa relation
    Et la vue suivante remplace les vues existantes :
      """json
      { "type": "dynamic", "key": "flow", "scope": "banking", "steps": [{ "from": "customer", "to": "web" }] }
      """
    Quand je calcule la vue "flow"
    Alors la vue contient exactement les étapes :
      | ordre | de       | vers | description    | technologie |
      | 1     | customer | web  | Views accounts | HTTPS       |

  Scénario: Une même relation peut servir à plusieurs étapes
    Et la vue suivante remplace les vues existantes :
      """json
      {
        "type": "dynamic", "key": "flow", "scope": "api",
        "steps": [
          { "from": "controller", "to": "service", "description": "Checks the balance" },
          { "from": "service", "to": "repository" },
          { "from": "controller", "to": "service", "description": "Executes the transfer" }
        ]
      }
      """
    Quand je calcule la vue "flow"
    Alors la vue contient exactement les étapes :
      | ordre | de         | vers       | description           |
      | 1     | controller | service    | Checks the balance    |
      | 2     | service    | repository | Reads and writes      |
      | 3     | controller | service    | Executes the transfer |

  Scénario: Sans périmètre, la vue relie des personnes et des systèmes, sans frontière
    Et la vue suivante remplace les vues existantes :
      """json
      { "type": "dynamic", "key": "flow", "steps": [{ "from": "customer", "to": "banking" }, { "from": "banking", "to": "mainframe" }] }
      """
    Quand je calcule la vue "flow"
    Alors la vue contient exactement les éléments :
      | id        | type           |
      | customer  | person         |
      | banking   | softwareSystem |
      | mainframe | softwareSystem |
    Et la vue ne contient aucune frontière

  Scénario: Quand plusieurs relations relient les mêmes éléments, l'étape prend celle de même description, sinon la première
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [{ "id": "shop", "name": "Shop" }, { "id": "bank", "name": "Bank" }],
          "relationships": [
            { "from": "shop", "to": "bank", "description": "Requests a payment", "technology": "HTTPS" },
            { "from": "shop", "to": "bank", "description": "Downloads statements", "technology": "SFTP" }
          ]
        },
        "views": [{
          "type": "dynamic", "key": "flow",
          "steps": [{ "from": "shop", "to": "bank", "description": "Downloads statements" }, { "from": "shop", "to": "bank" }]
        }]
      }
      """
    Quand je calcule la vue "flow"
    Alors la vue contient exactement les étapes :
      | ordre | de   | vers | description          | technologie |
      | 1     | shop | bank | Downloads statements | SFTP        |
      | 2     | shop | bank | Requests a payment   | HTTPS       |
