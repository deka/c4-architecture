# language: fr
Fonctionnalité: Filtrer le contenu d'une vue
  En tant qu'agent qui prépare un diagramme
  Je veux ajouter ou retirer des éléments et des relations d'une vue
  Afin de produire un diagramme lisible centré sur un sujet

  Contexte:
    Étant donné le modèle "examples/online-banking.json"

  Scénario: Sans include, la vue prend la sélection par défaut
    Étant donné la vue suivante remplace les vues existantes :
      """json
      { "type": "container", "key": "view", "scope": "banking" }
      """
    Quand je calcule la vue "view"
    Alors la vue contient les mêmes éléments qu'avec "include": ["*"]

  Scénario: Exclure un élément retire aussi ses relations
    Étant donné la vue suivante remplace les vues existantes :
      """json
      { "type": "container", "key": "view", "scope": "banking", "exclude": ["email"] }
      """
    Quand je calcule la vue "view"
    Alors la vue ne contient pas l'élément "email"
    Et la vue ne contient aucune relation impliquant "email"

  Scénario: Inclure explicitement un élément non relié
    Étant donné la vue suivante remplace les vues existantes :
      """json
      { "type": "systemContext", "key": "view", "scope": "banking", "include": ["*", "advisor"] }
      """
    Quand je calcule la vue "view"
    Alors la vue contient l'élément "advisor"

  Scénario: Inclure seulement certains éléments
    Étant donné la vue suivante remplace les vues existantes :
      """json
      { "type": "container", "key": "view", "scope": "banking", "include": ["web", "api"] }
      """
    Quand je calcule la vue "view"
    Alors la vue contient exactement les éléments :
      | id  |
      | web |
      | api |
    Et la vue contient exactement les relations :
      | de  | vers |
      | web | api  |

  Scénario: Exclure par tag
    Étant donné la vue suivante remplace les vues existantes :
      """json
      { "type": "container", "key": "view", "scope": "banking", "exclude": [{ "tag": "Database" }] }
      """
    Quand je calcule la vue "view"
    Alors la vue ne contient pas l'élément "database"

  Scénario: Exclure une relation par son identifiant
    Étant donné la vue suivante remplace les vues existantes :
      """json
      { "type": "component", "key": "view", "scope": "api", "exclude": [{ "relationship": "repositoryToDatabase" }] }
      """
    Quand je calcule la vue "view"
    Alors la vue ne contient pas la relation de "repository" vers "database"
    Mais la vue contient l'élément "database"

  @to-validate
  Scénario: Inclure un élément d'un niveau qui n'a pas sa place dans la vue
    Étant donné la vue suivante remplace les vues existantes :
      """json
      { "type": "systemContext", "key": "view", "scope": "banking", "include": ["*", "api"] }
      """
    Quand je valide le workspace
    Alors il est rejeté avec une erreur sur "/views/0/include/1"
