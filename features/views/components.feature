# language: fr
Fonctionnalité: Vue de composants (niveau 3)
  En tant que lecteur d'un diagramme
  Je veux voir les composants internes d'un conteneur
  Afin de comprendre comment il est structuré

  Contexte:
    Étant donné le modèle "examples/online-banking.json"

  Scénario: La vue montre les composants du conteneur et leur voisinage direct
    Quand je calcule la vue "components"
    Alors la vue contient exactement les éléments :
      | id         | type           | rôle    |
      | controller | component      | interne |
      | service    | component      | interne |
      | repository | component      | interne |
      | web        | container      | voisin  |
      | database   | container      | voisin  |
      | mainframe  | softwareSystem | voisin  |
      | email      | softwareSystem | voisin  |

  Scénario: Le conteneur est représenté par sa frontière
    Quand je calcule la vue "components"
    Alors la vue contient la frontière "api" qui entoure "controller", "service" et "repository"

  Scénario: Les éléments qui ne touchent pas directement un composant sont absents
    Quand je calcule la vue "components"
    Alors la vue ne contient pas l'élément "customer"
    Et la vue ne contient pas l'élément "advisor"

  Scénario: Les relations entre composants et avec l'extérieur
    Quand je calcule la vue "components"
    Alors la vue contient exactement les relations :
      | de         | vers       | description         | technologie |
      | web        | controller | Calls               | HTTPS/JSON  |
      | controller | service    | Delegates to        |             |
      | service    | repository | Reads and writes    |             |
      | repository | database   | Reads and writes    | SQL         |
      | service    | mainframe  | Syncs transfers     | MQ          |
      | service    | email      | Sends notifications | SMTP        |
