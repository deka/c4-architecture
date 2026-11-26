# language: fr
Fonctionnalité: Vue de conteneurs (niveau 2)
  En tant que lecteur d'un diagramme
  Je veux voir les applications et bases de données qui composent un système
  Afin de comprendre ses grandes briques techniques et leurs échanges

  Contexte:
    Étant donné le modèle "examples/online-banking.json"

  Scénario: La vue montre les conteneurs du système et leur voisinage direct
    Quand je calcule la vue "containers"
    Alors la vue contient exactement les éléments :
      | id        | type           | rôle    |
      | web       | container      | interne |
      | api       | container      | interne |
      | database  | container      | interne |
      | customer  | person         | voisin  |
      | mainframe | softwareSystem | voisin  |
      | email     | softwareSystem | voisin  |

  Scénario: Le système est représenté par sa frontière, pas par une boîte
    Quand je calcule la vue "containers"
    Alors la vue contient la frontière "banking" qui entoure "web", "api" et "database"
    Et la frontière "banking" n'entoure pas "customer"
    Et la vue ne contient pas l'élément "banking"

  Scénario: Les composants ne sont jamais montrés
    Quand je calcule la vue "containers"
    Alors la vue ne contient aucun élément de type "component"

  Scénario: Les relations sont remontées au niveau conteneur
    Quand je calcule la vue "containers"
    Alors la vue contient exactement les relations :
      | de       | vers      | description         | technologie |
      | customer | web       | Views accounts      | HTTPS       |
      | web      | api       | Calls               | HTTPS/JSON  |
      | api      | database  | Reads and writes    | SQL         |
      | api      | mainframe | Syncs transfers     | MQ          |
      | api      | email     | Sends notifications | SMTP        |
      | email    | customer  | Sends an email      |             |

  Scénario: Les conteneurs d'un autre système ne sont pas dépliés
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [
            { "id": "shop", "name": "Shop", "containers": [{ "id": "shopApi", "name": "Shop API" }] },
            { "id": "billing", "name": "Billing", "containers": [{ "id": "billingApi", "name": "Billing API" }] }
          ],
          "relationships": [{ "from": "shopApi", "to": "billingApi" }]
        },
        "views": [{ "type": "container", "key": "view", "scope": "shop" }]
      }
      """
    Quand je calcule la vue "view"
    Alors la vue contient l'élément "billing" de type "softwareSystem"
    Et la vue ne contient pas l'élément "billingApi"
    Et la vue contient la relation de "shopApi" vers "billing"
