# language: fr
Fonctionnalité: Couleurs des éléments
  En tant que lecteur d'un diagramme
  Je veux distinguer d'un coup d'œil ce qui fait partie des systèmes modélisés et ce qui leur est extérieur
  Afin de savoir ce qui est à notre charge

  Comme dans Structurizr, la couleur appartient à l'élément et non à la vue : un élément marqué
  "external" est gris dans toutes les vues, les autres sont bleus. Les couleurs sont des tons pastel
  des couleurs C4 : le bleu s'éclaircit à chaque niveau (personne, système, conteneur, composant).

  Scénario: Un système externe est gris, un système interne est bleu
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [
            { "id": "banking", "name": "Internet banking", "description": "Lets customers manage their accounts" },
            { "id": "email", "name": "Email system", "description": "Sends emails", "external": true }
          ],
          "relationships": [
            { "from": "banking", "to": "email", "description": "Sends emails using" }
          ]
        },
        "views": [{ "type": "systemContext", "key": "context", "scope": "banking" }]
      }
      """
    Quand je dessine la vue "context"
    Alors le dessin correspond à la référence "colors/internal-and-external-system", sur laquelle on voit :
      | « Internet banking » a un fond bleu pastel et un contour bleu |
      | « Email system » a un fond gris pastel et un contour gris     |
      | les deux boîtes ont un texte foncé, bien lisible              |
      | la légende montre une entrée bleue et une entrée « External » grise |

  Scénario: Une personne interne est bleue, une personne externe est grise
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "people": [
            { "id": "advisor", "name": "Advisor", "description": "Bank employee" },
            { "id": "customer", "name": "Customer", "description": "Personal banking customer", "external": true }
          ],
          "softwareSystems": [{ "id": "banking", "name": "Internet banking" }],
          "relationships": [
            { "from": "advisor", "to": "banking", "description": "Helps customers with" },
            { "from": "customer", "to": "banking", "description": "Uses" }
          ]
        },
        "views": [{ "type": "systemContext", "key": "context", "scope": "banking" }]
      }
      """
    Quand je dessine la vue "context"
    Alors le dessin correspond à la référence "colors/internal-and-external-person", sur laquelle on voit :
      | « Advisor » a la forme d'une personne, en bleu pastel  |
      | « Customer » a la forme d'une personne, en gris pastel |
      | « Internet banking » est en bleu, un peu plus clair que « Advisor » |

  Scénario: Le bleu s'éclaircit à chaque niveau C4
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "people": [{ "id": "user", "name": "User" }],
          "softwareSystems": [
            { "id": "crm", "name": "CRM", "description": "Customer records" },
            {
              "id": "shop",
              "name": "Shop",
              "containers": [
                {
                  "id": "api",
                  "name": "API",
                  "technology": "Node.js",
                  "components": [
                    { "id": "orders", "name": "Orders controller", "technology": "Express" }
                  ]
                },
                { "id": "web", "name": "Web app", "technology": "React" }
              ]
            }
          ],
          "relationships": [
            { "from": "user", "to": "orders", "description": "Tracks orders using" },
            { "from": "web", "to": "orders", "description": "Places orders with" },
            { "from": "orders", "to": "crm", "description": "Reads customers from" }
          ]
        },
        "views": [{ "type": "component", "key": "components", "scope": "api" }]
      }
      """
    Quand je dessine la vue "components"
    Alors le dessin correspond à la référence "colors/levels", sur laquelle on voit :
      | « User » (personne) est le bleu le plus soutenu   |
      | « CRM » (système) est un peu plus clair            |
      | « Web app » (conteneur) est plus clair encore      |
      | « Orders controller » (composant) est le plus clair |
      | les quatre restent reconnaissables comme du bleu, pas du blanc |

  Scénario: Un élément garde sa couleur d'une vue à l'autre
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [
            {
              "id": "banking",
              "name": "Internet banking",
              "containers": [{ "id": "api", "name": "API", "technology": "Java" }]
            },
            { "id": "mainframe", "name": "Mainframe", "description": "Core banking system" }
          ],
          "relationships": [{ "from": "api", "to": "mainframe", "description": "Reads accounts from" }]
        },
        "views": [
          { "type": "systemContext", "key": "context", "scope": "banking" },
          { "type": "container", "key": "containers", "scope": "banking" }
        ]
      }
      """
    Quand je dessine la vue "context"
    Alors le dessin correspond à la référence "colors/same-color-context", sur laquelle on voit :
      | « Mainframe » est bleu : il n'est pas marqué "external" |
    Quand je dessine la vue "containers"
    Alors le dessin correspond à la référence "colors/same-color-containers", sur laquelle on voit :
      | « Mainframe » est du même bleu que dans la vue de contexte, bien qu'il soit hors de « Internet banking » |
      | « API » est dans la frontière « Internet banking », en bleu plus clair |

  Scénario: Un style par tag remplace les couleurs par défaut
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [
            { "id": "banking", "name": "Internet banking" },
            { "id": "legacy", "name": "Legacy CRM", "tags": ["Legacy"] }
          ],
          "relationships": [{ "from": "banking", "to": "legacy", "description": "Reads customers from" }]
        },
        "views": [{ "type": "systemLandscape", "key": "landscape" }],
        "styles": {
          "elements": [{ "tag": "Legacy", "background": "#f3e3c3", "stroke": "#9a7b3c" }]
        }
      }
      """
    Quand je dessine la vue "landscape"
    Alors le dessin correspond à la référence "colors/tag-style", sur laquelle on voit :
      | « Legacy CRM » a un fond sable et un contour brun, déclarés par le style "Legacy" |
      | « Internet banking » garde le bleu par défaut                                    |
      | la légende a une entrée « Legacy » aux mêmes couleurs                             |
