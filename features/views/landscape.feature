# language: fr
@to-validate
Fonctionnalité: Vue de paysage système
  En tant que lecteur d'un diagramme
  Je veux voir tous les systèmes et toutes les personnes de l'organisation
  Afin d'avoir une vue d'ensemble sans système central

  Contexte:
    Étant donné le modèle "examples/online-banking.json"

  Scénario: La vue montre toutes les personnes et tous les systèmes
    Quand je calcule la vue "landscape"
    Alors la vue contient exactement les éléments :
      | id        | type           |
      | customer  | person         |
      | advisor   | person         |
      | banking   | softwareSystem |
      | mainframe | softwareSystem |
      | email     | softwareSystem |

  Scénario: Les relations sont remontées au niveau système
    Quand je calcule la vue "landscape"
    Alors la vue contient exactement les relations :
      | de       | vers      |
      | customer | banking   |
      | advisor  | mainframe |
      | banking  | mainframe |
      | banking  | email     |
      | email    | customer  |
