# language: fr
Fonctionnalité: Déclarer les éléments C4
  En tant qu'agent qui décrit une architecture
  Je veux déclarer des personnes, des systèmes, des conteneurs et des composants
  Afin que le runtime dispose de tous les éléments des niveaux 1 à 3 du modèle C4

  Scénario: Un workspace minimal est accepté
    Étant donné le workspace suivant :
      """json
      { "version": 1 }
      """
    Quand je valide le workspace
    Alors il est accepté

  Scénario: Une personne interne avec tous ses attributs
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "people": [{
            "id": "advisor", "name": "Advisor", "description": "Branch employee",
            "external": false, "group": "Branch", "tags": ["Back-office"],
            "url": "https://intranet.example/advisors",
            "properties": [{ "name": "team", "value": "Paris" }]
          }]
        }
      }
      """
    Quand je valide le workspace
    Alors il est accepté
    Et le modèle contient la personne "advisor" avec :
      | attribut    | valeur                       |
      | nom         | Advisor                      |
      | description | Branch employee              |
      | externe     | non                          |
      | groupe      | Branch                       |
      | tags        | Element, Person, Back-office |

  Scénario: Une personne est interne par défaut
    Étant donné le workspace suivant :
      """json
      { "version": 1, "model": { "people": [{ "id": "user", "name": "User" }] } }
      """
    Quand je valide le workspace
    Alors il est accepté
    Et le modèle contient la personne "user" avec :
      | attribut | valeur          |
      | externe  | non             |
      | tags     | Element, Person |

  Scénario: Une personne externe
    Étant donné le workspace suivant :
      """json
      { "version": 1, "model": { "people": [{ "id": "customer", "name": "Customer", "external": true }] } }
      """
    Quand je valide le workspace
    Alors il est accepté
    Et le modèle contient la personne "customer" avec :
      | attribut | valeur |
      | externe  | oui    |

  Scénario: Un système logiciel externe
    Étant donné le workspace suivant :
      """json
      { "version": 1, "model": { "softwareSystems": [{ "id": "email", "name": "Email system", "external": true }] } }
      """
    Quand je valide le workspace
    Alors le modèle contient le système "email" avec :
      | attribut | valeur                   |
      | externe  | oui                      |
      | tags     | Element, Software System |

  Scénario: Un conteneur est déclaré dans un système, un composant dans un conteneur
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [{
            "id": "app", "name": "Application",
            "containers": [{
              "id": "api", "name": "API", "technology": "Node.js",
              "components": [{ "id": "controller", "name": "Controller", "technology": "Express" }]
            }]
          }]
        }
      }
      """
    Quand je valide le workspace
    Alors il est accepté
    Et le parent de "api" est "app"
    Et le parent de "controller" est "api"
    Et le modèle contient le conteneur "api" avec :
      | attribut    | valeur             |
      | technologie | Node.js            |
      | externe     | non                |
      | tags        | Element, Container |
    Et le modèle contient le composant "controller" avec :
      | attribut    | valeur             |
      | technologie | Express            |
      | tags        | Element, Component |

  Plan du scénario: Les attributs obligatoires sont exigés (<cas>)
    Étant donné le workspace suivant :
      """json
      <workspace>
      """
    Quand je valide le workspace
    Alors il est rejeté avec une erreur sur "<chemin>"

    Exemples:
      | cas                  | workspace                                                                   | chemin                   |
      | version absente      | { "model": {} }                                                             | /                        |
      | personne sans nom    | { "version": 1, "model": { "people": [{ "id": "user" }] } }                 | /model/people/0          |
      | système sans id      | { "version": 1, "model": { "softwareSystems": [{ "name": "System" }] } }    | /model/softwareSystems/0 |

  Plan du scénario: Les attributs qui n'ont pas de sens pour un type d'élément sont refusés (<cas>)
    Étant donné le workspace suivant :
      """json
      <workspace>
      """
    Quand je valide le workspace
    Alors il est rejeté avec une erreur sur "<chemin>"

    Exemples:
      | cas                                 | workspace                                                                                                                                         | chemin                                |
      | technologie sur une personne        | { "version": 1, "model": { "people": [{ "id": "user", "name": "User", "technology": "X" }] } }                                                    | /model/people/0                       |
      | technologie sur un système          | { "version": 1, "model": { "softwareSystems": [{ "id": "app", "name": "App", "technology": "X" }] } }                                             | /model/softwareSystems/0              |
      | conteneur externe                   | { "version": 1, "model": { "softwareSystems": [{ "id": "app", "name": "App", "containers": [{ "id": "web", "name": "Web", "external": true }] }] } } | /model/softwareSystems/0/containers/0 |
      | composants directement sous système | { "version": 1, "model": { "softwareSystems": [{ "id": "app", "name": "App", "components": [] }] } }                                              | /model/softwareSystems/0              |
      | attribut inconnu                    | { "version": 1, "model": { "people": [{ "id": "user", "name": "User", "colour": "red" }] } }                                                      | /model/people/0                       |

  Plan du scénario: Les identifiants respectent un format strict (<id>)
    Étant donné le workspace suivant :
      """json
      { "version": 1, "model": { "people": [{ "id": "<id>", "name": "User" }] } }
      """
    Quand je valide le workspace
    Alors il est <résultat>

    Exemples:
      | id       | résultat |
      | customer | accepté  |
      | user_2   | accepté  |
      | api-v2   | accepté  |
      | 2user    | rejeté   |
      | app.web  | rejeté   |
      | my user  | rejeté   |

  Plan du scénario: Une URL doit être en http ou https (<url>)
    Étant donné le workspace suivant :
      """json
      { "version": 1, "model": { "softwareSystems": [{ "id": "app", "name": "App", "url": "<url>" }] } }
      """
    Quand je valide le workspace
    Alors il est <résultat>

    Exemples:
      | url                         | résultat |
      | https://wiki.example.com/a  | accepté  |
      | http://intranet.example/doc | accepté  |
      | javascript:alert(1)         | rejeté   |
      | mailto:team@example.com     | rejeté   |
      | ftp://files.example.com     | rejeté   |
      | /relative/path              | rejeté   |

  Scénario: L'erreur sur une URL de relation est localisée
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [{ "id": "a", "name": "A" }, { "id": "b", "name": "B" }],
          "relationships": [{ "from": "a", "to": "b", "url": "javascript:alert(1)" }]
        }
      }
      """
    Quand je valide le workspace
    Alors il est rejeté avec une erreur sur "/model/relationships/0/url"
