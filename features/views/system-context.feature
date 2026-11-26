# language: fr
Fonctionnalité: Vue de contexte système (niveau 1)
  En tant que lecteur d'un diagramme
  Je veux voir un système, ses utilisateurs et les systèmes avec lesquels il échange
  Afin de comprendre sa place dans son environnement sans détail technique

  Contexte:
    Étant donné le modèle "examples/online-banking.json"

  Scénario: La vue montre le système et son voisinage direct
    Quand je calcule la vue "context"
    Alors la vue contient exactement les éléments :
      | id        | type           | rôle              |
      | banking   | softwareSystem | système principal |
      | customer  | person         | voisin            |
      | mainframe | softwareSystem | voisin            |
      | email     | softwareSystem | voisin            |

  Scénario: Les éléments sans lien avec le système ne sont pas montrés
    Quand je calcule la vue "context"
    Alors la vue ne contient pas l'élément "advisor"

  Scénario: Les conteneurs et composants ne sont jamais montrés
    Quand je calcule la vue "context"
    Alors la vue ne contient aucun élément de type "container"
    Et la vue ne contient aucun élément de type "component"

  Scénario: Les relations sont remontées au niveau système
    Quand je calcule la vue "context"
    Alors la vue contient exactement les relations :
      | de       | vers      | description         |
      | customer | banking   | Views accounts      |
      | banking  | mainframe | Syncs transfers     |
      | banking  | email     | Sends notifications |
      | email    | customer  | Sends an email      |

  Scénario: Les relations entre voisins sont montrées
    Quand je calcule la vue "context"
    Alors la vue contient la relation de "email" vers "customer"
