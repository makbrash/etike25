# Visualizzatore 3D Bottiglia di Vino

Un visualizzatore 3D interattivo per il modello di una bottiglia di vino, realizzato con Three.js.

## Caratteristiche

- Visualizzazione 3D del modello GLTF
- Controlli per rotazione, zoom e pan della camera
- Illuminazione professionale
- Sfondo nero per evidenziare il modello
- Interfaccia responsiva
- Indicatore di caricamento

## Struttura del Progetto

```
/
├── css/                  # Fogli di stile
│   └── style.css         # Stile principale
├── js/                   # Script JavaScript
│   └── viewer.js         # Logica del visualizzatore
├── models/               # Modelli 3D
│   └── wine_bottle/      # Modello della bottiglia di vino
│       ├── scene.gltf    # File principale del modello
│       ├── scene.bin     # Dati binari del modello
│       └── textures/     # Texture del modello
├── viewer.php            # Pagina principale
└── README.md             # Documentazione
```

## Utilizzo

1. Assicurarsi che il server web (XAMPP) sia attivo
2. Aprire un browser e navigare su `http://localhost/etike25/etike25/viewer.php`
3. Utilizzare i seguenti controlli:
   - **Rotazione**: Click sinistro + Trascina
   - **Zoom**: Rotella del mouse / Pinch (su touch)
   - **Pan**: Click destro + Trascina

## Requisiti

- Un server web (XAMPP, Apache, ecc.)
- Un browser moderno con supporto WebGL

## Crediti

- Modello 3D: Wine Bottle di FranzAlvior
- Three.js per la visualizzazione 3D
