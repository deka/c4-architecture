# language: fr
Fonctionnalité: Inspecter un modèle sans regarder le dessin
  En tant qu'agent qui conçoit une architecture avec un humain
  Je veux un résumé textuel de chaque vue et des avertissements de modélisation
  Afin de relire et d'améliorer le modèle sans voir le SVG

  # Les avertissements ne rejettent pas le modèle : ils signalent ce qui rend un diagramme C4 moins utile.

  Scénario: Un modèle complet ne produit aucun avertissement
    Étant donné le modèle "examples/online-banking.json"
    Quand j'inspecte le workspace
    Alors l'inspection ne signale aucun avertissement
    Et le résumé de la vue "context" liste les éléments "customer", "banking", "mainframe" et "email"

  Scénario: Le résumé d'une vue dynamique liste les étapes dans l'ordre
    Étant donné le modèle "examples/online-banking.json"
    Quand j'inspecte le workspace
    Alors le résumé de la vue "transfer" liste les étapes :
      | ordre | de       | vers      | description             |
      | 1     | customer | web       | Submits a transfer      |
      | 2     | web      | api       | Sends the transfer      |
      | 3     | api      | database  | Records the transfer    |
      | 4     | api      | mainframe | Syncs the transfer      |
      | 5     | api      | email     | Requests a confirmation |
      | 6     | email    | customer  | Sends the confirmation  |

  Scénario: Un modèle sans vue ne dessinera rien
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": { "people": [{ "id": "user", "name": "User", "description": "End user" }] }
      }
      """
    Quand j'inspecte le workspace
    Alors l'inspection signale "no-views" sur "/views"
    Et l'inspection ne signale pas "not-in-any-view"

  Scénario: Les descriptions et technologies manquantes sont signalées
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [
            { "id": "shop", "name": "Shop", "containers": [{ "id": "api", "name": "API", "description": "Orders" }] }
          ]
        },
        "views": [{ "type": "container", "key": "containers", "scope": "shop" }]
      }
      """
    Quand j'inspecte le workspace
    Alors l'inspection signale "missing-description" sur "shop"
    Et l'inspection signale "missing-technology" sur "api"

  Scénario: Une relation entre conteneurs doit dire comment ils communiquent
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [
            {
              "id": "shop", "name": "Shop", "description": "Online shop",
              "containers": [
                { "id": "web", "name": "Web", "description": "Storefront", "technology": "React" },
                { "id": "api", "name": "API", "description": "Orders", "technology": "Go" }
              ]
            }
          ],
          "relationships": [{ "from": "web", "to": "api" }]
        },
        "views": [{ "type": "container", "key": "containers", "scope": "shop" }]
      }
      """
    Quand j'inspecte le workspace
    Alors l'inspection signale "missing-relationship-description" sur "web->api"
    Et l'inspection signale "missing-relationship-technology" sur "web->api"

  Scénario: Un appel entre composants d'un même conteneur n'a pas besoin de technologie
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [
            {
              "id": "shop", "name": "Shop", "description": "Online shop",
              "containers": [
                {
                  "id": "api", "name": "API", "description": "Orders", "technology": "Go",
                  "components": [
                    { "id": "handler", "name": "Handler", "description": "HTTP routes", "technology": "net/http" },
                    { "id": "service", "name": "Service", "description": "Business rules", "technology": "Go" }
                  ]
                }
              ]
            }
          ],
          "relationships": [{ "from": "handler", "to": "service", "description": "Delegates to" }]
        },
        "views": [{ "type": "component", "key": "components", "scope": "api" }]
      }
      """
    Quand j'inspecte le workspace
    Alors l'inspection ne signale pas "missing-relationship-technology"

  Scénario: Un élément absent de toutes les vues est signalé
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "people": [{ "id": "user", "name": "User", "description": "End user" }],
          "softwareSystems": [
            { "id": "shop", "name": "Shop", "description": "Online shop" },
            { "id": "legacy", "name": "Legacy", "description": "Old back office" }
          ],
          "relationships": [{ "from": "user", "to": "shop", "description": "Buys from" }]
        },
        "views": [{ "type": "systemContext", "key": "context", "scope": "shop" }]
      }
      """
    Quand j'inspecte le workspace
    Alors l'inspection signale "not-in-any-view" sur "legacy"

  Scénario: Une vue de plus de 20 éléments est trop chargée
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [
            { "id": "s1", "name": "S1", "description": "-" }, { "id": "s2", "name": "S2", "description": "-" },
            { "id": "s3", "name": "S3", "description": "-" }, { "id": "s4", "name": "S4", "description": "-" },
            { "id": "s5", "name": "S5", "description": "-" }, { "id": "s6", "name": "S6", "description": "-" },
            { "id": "s7", "name": "S7", "description": "-" }, { "id": "s8", "name": "S8", "description": "-" },
            { "id": "s9", "name": "S9", "description": "-" }, { "id": "s10", "name": "S10", "description": "-" },
            { "id": "s11", "name": "S11", "description": "-" }, { "id": "s12", "name": "S12", "description": "-" },
            { "id": "s13", "name": "S13", "description": "-" }, { "id": "s14", "name": "S14", "description": "-" },
            { "id": "s15", "name": "S15", "description": "-" }, { "id": "s16", "name": "S16", "description": "-" },
            { "id": "s17", "name": "S17", "description": "-" }, { "id": "s18", "name": "S18", "description": "-" },
            { "id": "s19", "name": "S19", "description": "-" }, { "id": "s20", "name": "S20", "description": "-" },
            { "id": "s21", "name": "S21", "description": "-" }
          ]
        },
        "views": [{ "type": "systemLandscape", "key": "landscape" }]
      }
      """
    Quand j'inspecte le workspace
    Alors l'inspection signale "crowded-view" sur "landscape"
