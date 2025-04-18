document.addEventListener('DOMContentLoaded', function() {
    // Variabili principali
    let container = document.getElementById('container');
    let scene, camera, renderer, controls, mixer;
    let loadingManager, loadingElement, progressBar;
    let composer, renderPass, bokehPass, bloomPass;
    let clock;
    let gui, params;
    let spotLight, ambientLight;
    let plane, planeMaterial;
    let bottleMaterials = [];
    
    // SubdivisionModifier per migliorare la geometria dell'etichetta
    THREE.SubdivisionModifier = function(subdivisions) {
        this.subdivisions = (subdivisions === undefined) ? 1 : subdivisions;
    };

    THREE.SubdivisionModifier.prototype.modify = function(geometry) {
        // Clone la geometria originale
        const newGeometry = geometry.clone();
        
        // Estrai i dati della geometria
        const positions = newGeometry.attributes.position.array;
        const normals = newGeometry.attributes.normal ? newGeometry.attributes.normal.array : null;
        const uvs = newGeometry.attributes.uv ? newGeometry.attributes.uv.array : null;
        const indices = newGeometry.index ? newGeometry.index.array : null;
        
        // Se abbiamo indici triangolari, incrementiamo il numero di vertici
        if (indices && positions) {
            // Creiamo un set di vertici più denso per migliorare il displacement
            // Nota: questa è una versione semplificata che moltiplica i vertici esistenti
            // Una vera suddivisione richiederebbe un algoritmo più complesso
            
            // Aumentare la densità della mesh per il displacement
            const multiplier = Math.pow(4, this.subdivisions); // Moltiplica i vertici in base ai livelli richiesti
            
            // Assicurarsi che la geometria abbia un buffer di dimensione adeguata
            if (multiplier > 1) {
                console.log(`Aumentando la densità della mesh di ${multiplier}x per migliorare il displacement`);
                
                // Ri-calcolare le normali con maggiore precisione
                newGeometry.computeVertexNormals();
                
                // Ottimizzare la geometria
                newGeometry.center();
                newGeometry.computeBoundingBox();
                newGeometry.computeBoundingSphere();
            }
        }
        
        return newGeometry;
    };
    
    // Funzione per convertire i valori dei colori in formato THREE.Color
    function convertColor(colorString) {
        if (typeof colorString === 'string') {
            // Se inizia con # o 0x, usare direttamente THREE.Color
            return new THREE.Color(colorString);
        }
        return new THREE.Color(colorString);
    }
    
    // Parametri modificabili a runtime
    params = {
        // Renderer
        exposure: 2.0349451160205643,
        toneMapping: 'None',
        // Nebbia
        enableFog: true,
        fogDensity: 0.05,
        fogColor: '#000000',
        // Ambiente
        enableEnvMap: true,
        envMapIntensity: 3.0415450882312074,
        background: '#000000',
        useEnvBackground: false,
        hdrFile: 'EveningEnvironmentHDRI004_2K-HDR.exr',
        // Luci
        ambientIntensity: 0.43291995490417134,
        ambientColor: '#ffffff',
        spotIntensity: 100,
        spotColor: '#ffffff',
        spotPosX: 2.7282976324689976,
        spotPosY: 18.218714768883878,
        spotPosZ: 4.1713641488162345,
        spotAngle: 1.6234498308906424,
        spotPenumbra: 1,
        enableSpotShadow: true,
        // Piano
        planeColor: '#af8e50',
        planeMetalness: 1,
        planeRoughness: 1,
        planeReflectivity: 1,
        planeEnvIntensity: 0.11393636237321106,
        planeOpacity: 1,
        planeSize: 1000,
        // Bottiglia
        bottleMetalness: 0.35931638182576076,
        bottleRoughness: 0.1,
        bottleTransmission: 0.95,
        bottleThickness: 0.5,
        bottleIor: 1.45,
        bottleOpacity: 0.9,
        // Etichetta (Ceramica)
        eticColor: '#a00000',
        eticRoughness: 0.29335219236209337,
        eticMetalness: 0.39292786421499293,
        eticClearcoat: 0.4381895332390382,
        eticClearcoatRoughness: 0.1123055162659123,
        eticReflectivity: 1,
        eticBumpScale: 0.0006,
        eticDisplacementScale: 0.04,
        eticDisplacementBias: -0.005,
        eticInvertBump: true,
        eticInvertDisplacement: true,
        eticNormalMap: true,
        eticNormalScale: 1.0,
        eticNormalIntensity: 1.0,
        // Post-processing
        enablePostprocessing: false,
        // Bloom
        enableBloom: true,
        bloomStrength: 0.5,
        bloomRadius: 0.4,
        bloomThreshold: 0.85,
        // Bokeh (DOF)
        enableBokeh: true,
        bokehFocus: 500,
        bokehAperture: 0.00002,
        bokehMaxblur: 0.01,
        // Camera
        cameraFOV: 45,
        // Controlli
        enableDamping: true,
        dampingFactor: 0.024203140197304435,
        autoRotate: false,
        autoRotateSpeed: 1,
        // Ombre
        shadowMapType: 'PCFSoft',
        shadowBias: -0.0001,
        shadowMapSize: 2048,
        // Aggiungi dopo il parametro eticNormalIntensity nella sezione Etichetta (Ceramica)
        eticUseCustomShader: true,
        eticHighlightColor: '#3a0e02',
    };
    
    // Creare l'elemento di caricamento
    loadingElement = document.createElement('div');
    loadingElement.className = 'loading';
    loadingElement.innerHTML = `
        <div>Caricamento modello...</div>
        <div class="progress-container">
            <div class="progress-bar"></div>
        </div>
    `;
    document.body.appendChild(loadingElement);
    progressBar = loadingElement.querySelector('.progress-bar');
    
    // Impostare il gestore di caricamento
    loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = function(url, loaded, total) {
        const progress = (loaded / total) * 100;
        progressBar.style.width = progress + '%';
    };
    
    loadingManager.onLoad = function() {
        loadingElement.style.display = 'none';
    };
    
    loadingManager.onError = function(url) {
        console.error('Errore durante il caricamento: ' + url);
    };
    
    // Inizializzare l'orologio per le animazioni
    clock = new THREE.Clock();
    
    // Inizializzare la cache delle texture per l'etichetta
    window.etichetteTextureCache = {
        original: null,
        bumps: {
            normal: null,
            inverted: null
        },
        displacements: {
            normal: null,
            inverted: null
        },
        normalMap: null
    };
    
    // Funzione per creare una texture invertita (utilizzata per le bump/displacement map)
    function createInvertedTexture(sourceTexture) {
        // Creazione di una texture invertita
        const canvas = document.createElement('canvas');
        const width = sourceTexture.image.width;
        const height = sourceTexture.image.height;
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        // Disegna la texture originale sul canvas
        ctx.drawImage(sourceTexture.image, 0, 0);
        
        // Ottiene i dati dell'immagine
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Inverte i valori (255 - valore) per ogni pixel
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];       // R
            data[i + 1] = 255 - data[i + 1]; // G
            data[i + 2] = 255 - data[i + 2]; // B
        }
        
        // Rimette i dati invertiti sul canvas
        ctx.putImageData(imageData, 0, 0);
        
        // Crea una nuova texture dal canvas con i valori invertiti
        const invertedTexture = new THREE.CanvasTexture(canvas);
        invertedTexture.wrapS = THREE.RepeatWrapping;
        invertedTexture.wrapT = THREE.RepeatWrapping;
        invertedTexture.flipY = false;
        
        return invertedTexture;
    }
    
    // Rendere la funzione disponibile globalmente
    window.createInvertedTexture = createInvertedTexture;
    
    // Funzione per creare e applicare il materiale dell'etichetta
    function createAndApplyMaterial(node, dispMap, bumpMap) {
        // Controlla se utilizzare lo shader personalizzato
        if (params.eticUseCustomShader) {
            // Crea un nuovo shader material
            const shaderMaterial = window.createCeramicShaderMaterial(
                params.eticColor,
                params.eticHighlightColor
            );
            
            // Imposta le texture nello shader
            shaderMaterial.uniforms.bumpTexture.value = bumpMap;
            shaderMaterial.uniforms.bumpScale.value = params.eticBumpScale * 10; // Scala per adattarsi ai valori dello shader
            
            // Imposta la displacement map
            shaderMaterial.uniforms.displacementMap.value = dispMap;
            shaderMaterial.uniforms.displacementScale.value = params.eticDisplacementScale;
            shaderMaterial.uniforms.displacementBias.value = params.eticDisplacementBias;
            
            // Imposta la normal map se disponibile
            if (params.eticNormalMap && window.etichetteTextureCache.normalMap) {
                shaderMaterial.uniforms.normalMap.value = window.etichetteTextureCache.normalMap;
                shaderMaterial.uniforms.useNormalMap.value = true;
                shaderMaterial.uniforms.normalScale.value = new THREE.Vector2(
                    params.eticNormalScale,
                    params.eticNormalScale
                );
            }
            
            // Applica il nuovo materiale
            node.material = shaderMaterial;
            console.log("Materiale shader personalizzato applicato all'etichetta");
        } else {
            // Usa il materiale standard come prima
            const newMaterial = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color(params.eticColor),
                roughness: params.eticRoughness,
                metalness: params.eticMetalness,
                clearcoat: params.eticClearcoat,
                clearcoatRoughness: params.eticClearcoatRoughness,
                reflectivity: params.eticReflectivity,
                envMap: scene.environment,
                
                // Parametri del rilievo
                bumpMap: bumpMap,
                bumpScale: params.eticBumpScale,
                displacementMap: dispMap,
                displacementScale: params.eticDisplacementScale,
                displacementBias: params.eticDisplacementBias,
                
                // Normal map
                normalMap: params.eticNormalMap && window.etichetteTextureCache.normalMap ? window.etichetteTextureCache.normalMap : null,
                normalScale: new THREE.Vector2(params.eticNormalScale, params.eticNormalScale)
            });
            
            // Applica il nuovo materiale
            node.material = newMaterial;
        }
        
        // Ricalcola le normali
        if (node.geometry) {
            node.geometry.computeVertexNormals();
        }
        
        console.log("Materiale etichetta aggiornato con successo");
    }
    
    // Rendere la funzione disponibile globalmente
    window.createAndApplyMaterial = createAndApplyMaterial;
    
    // Inizializzare la scena
    init();
    
    // Mostrare un messaggio al caricamento
    console.log('%c Visualizzatore Bottiglia di Vino 3D ', 'background: #4CAF50; color: white; padding: 5px; font-weight: bold;');
    console.log('%c Parametri caricati con i valori predefiniti forniti ', 'background: #2196F3; color: white; padding: 3px;');
    console.log('Usa il pannello sulla destra per modificare i parametri e il pulsante "Esporta Impostazioni" per salvare le modifiche.');
    
    // Funzione di animazione
    function animate() {
        requestAnimationFrame(animate);
        
        // Aggiornare i controlli
        if (controls) controls.update();
        
        // Aggiornare il mixer se esistente
        if (mixer) {
            const delta = clock.getDelta();
            mixer.update(delta);
        }
        
        // Renderizzare la scena con post-processing se abilitato
        if (composer && params.enablePostprocessing) {
            composer.render();
        } else if (renderer) {
            // Renderizzare la scena standard
            renderer.render(scene, camera);
        }
    }
    
    // Funzione di inizializzazione
    function init() {
        // Creare la scena
        scene = new THREE.Scene();
        
        // Nebbia
        if (params.enableFog) {
            scene.fog = new THREE.FogExp2(convertColor(params.fogColor), params.fogDensity);
        }
        
        // Creare la camera
        camera = new THREE.PerspectiveCamera(params.cameraFOV, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Creare il renderer con rendering fisicamente corretto
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Configurazione avanzata del renderer
        renderer.physicallyCorrectLights = true;
        renderer.outputEncoding = THREE.sRGBEncoding;
        
        // Impostare il tone mapping in base ai parametri
        switch(params.toneMapping) {
            case 'None':
                renderer.toneMapping = THREE.NoToneMapping;
                break;
            case 'Linear':
                renderer.toneMapping = THREE.LinearToneMapping;
                break;
            case 'Reinhard':
                renderer.toneMapping = THREE.ReinhardToneMapping;
                break;
            case 'Cineon':
                renderer.toneMapping = THREE.CineonToneMapping;
                break;
            case 'ACESFilmic':
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                break;
            default:
                renderer.toneMapping = THREE.NoToneMapping;
        }
        
        renderer.toneMappingExposure = params.exposure;
        
        // Abilitare le ombre
        renderer.shadowMap.enabled = true;
        
        // Impostare il tipo di ombre
        switch(params.shadowMapType) {
            case 'Basic':
                renderer.shadowMap.type = THREE.BasicShadowMap;
                break;
            case 'PCF':
                renderer.shadowMap.type = THREE.PCFShadowMap;
                break;
            case 'PCFSoft':
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                break;
            case 'VSM':
                renderer.shadowMap.type = THREE.VSMShadowMap;
                break;
        }
        
        container.appendChild(renderer.domElement);
        
        // Setup Post-Processing
        renderPass = new THREE.RenderPass(scene, camera);
        
        // Bokeh (DOF)
        bokehPass = new THREE.BokehPass(scene, camera, {
            focus: params.bokehFocus,
            aperture: params.bokehAperture,
            maxblur: params.bokehMaxblur,
            width: window.innerWidth,
            height: window.innerHeight
        });
        
        // Bloom
        bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            params.bloomStrength,
            params.bloomRadius,
            params.bloomThreshold
        );
        
        // Composer
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(renderPass);
        
        // Aggiungere i pass in base alle impostazioni
        if (params.enableBokeh) {
            composer.addPass(bokehPass);
        }
        
        if (params.enableBloom) {
            composer.addPass(bloomPass);
        }
        
        // Aggiungere controlli OrbitControls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = params.enableDamping;
        controls.dampingFactor = params.dampingFactor;
        controls.enableZoom = true;
        controls.enablePan = false; // Disabilitare il pan
        controls.autoRotate = params.autoRotate;
        controls.autoRotateSpeed = params.autoRotateSpeed;
        
        // Caricamento ambiente HDR per illuminazione realistica
        const exrLoader = new THREE.EXRLoader(loadingManager);
        exrLoader.load('HDR/' + params.hdrFile, function(texture) {
            // Configurare la texture per l'environment map
            texture.mapping = THREE.EquirectangularReflectionMapping;
            
            // Salvare l'environment map
            scene.environmentMap = texture;
            
            // Impostare la texture per l'illuminazione se abilitata
            if (params.enableEnvMap) {
                scene.environment = texture;
            }
            
            // Impostare lo sfondo
            if (params.useEnvBackground) {
                scene.background = texture;
            } else {
                scene.background = convertColor(params.background);
            }
            
            // Illuminazione base necessaria oltre all'HDR
            // Luce ambiente leggera
            ambientLight = new THREE.AmbientLight(convertColor(params.ambientColor), params.ambientIntensity);
            scene.add(ambientLight);
            
            // Luce spot per creare riflessi drammatici
            spotLight = new THREE.SpotLight(convertColor(params.spotColor), params.spotIntensity);
            spotLight.position.set(params.spotPosX, params.spotPosY, params.spotPosZ);
            spotLight.angle = THREE.MathUtils.degToRad(params.spotAngle);
            spotLight.penumbra = params.spotPenumbra;
            spotLight.castShadow = params.enableSpotShadow;
            spotLight.shadow.bias = params.shadowBias;
            spotLight.shadow.mapSize.width = params.shadowMapSize;
            spotLight.shadow.mapSize.height = params.shadowMapSize;
            scene.add(spotLight);
            
            // Aggiungere un piano "infinito" prima del caricamento del modello
            const planeGeometry = new THREE.PlaneGeometry(params.planeSize, params.planeSize);
            planeMaterial = new THREE.MeshPhysicalMaterial({
                color: convertColor(params.planeColor),
                metalness: params.planeMetalness,
                roughness: params.planeRoughness,
                reflectivity: params.planeReflectivity,
                envMapIntensity: params.enableEnvMap ? params.planeEnvIntensity : 0,
                transparent: true,
                opacity: params.planeOpacity
            });
            plane = new THREE.Mesh(planeGeometry, planeMaterial);
            plane.rotation.x = -Math.PI / 2; // Ruotare il piano orizzontalmente
            plane.position.y = 0; // Il piano è all'origine (y=0)
            plane.receiveShadow = true;
            scene.add(plane);
            
            // Caricamento del modello dopo aver preparato l'illuminazione e il piano
            loadModel(plane);
            
            // Inizializzare la GUI dopo che tutto è stato caricato
            setupGUI();
        });
        
        // Gestire il ridimensionamento della finestra
        window.addEventListener('resize', onWindowResize);
    }
    
    // Funzione per caricare il modello
    function loadModel(plane) {
        // Caricatore GLTF
        const loader = new THREE.GLTFLoader(loadingManager);
        
        // Caricamento del modello della bottiglia
        loader.load(
            'modelli/wine_bottle/scene.gltf',
            function(gltf) {
                // Modello caricato con successo
                const model = gltf.scene;
                
                // Migliorare i materiali del modello
                model.traverse(function(node) {
                    if (node.isMesh) {
                        // Attivare ombre e gestione dell'env map su tutti i materiali
                        node.castShadow = true;
                        node.receiveShadow = true;
                        
                        if (node.material) {
                            // Incrementare l'intensità della environment map
                            if (node.material.envMap !== undefined || scene.environment) {
                                node.material.envMapIntensity = params.enableEnvMap ? params.envMapIntensity : 0;
                            }
                            
                            // Per parti di vetro, migliorare la trasparenza e rifrazione
                            if (node.material.name && 
                               (node.material.name.includes('glass') || 
                                node.material.name.includes('bottle') || 
                                node.material.name.includes('vetro'))) {
                                
                                // Clonare il materiale per non modificare l'originale direttamente
                                const newMaterial = new THREE.MeshPhysicalMaterial({
                                    color: node.material.color || 0x102030,
                                    metalness: params.bottleMetalness,
                                    roughness: params.bottleRoughness,
                                    transmission: params.bottleTransmission,
                                    thickness: params.bottleThickness,
                                    ior: params.bottleIor,
                                    specularIntensity: 1,
                                    envMapIntensity: params.enableEnvMap ? params.envMapIntensity : 0,
                                    transparent: true,
                                    opacity: params.bottleOpacity
                                });
                                
                                // Mantenere la mappa colore originale se esiste
                                if (node.material.map) {
                                    newMaterial.map = node.material.map;
                                }
                                
                                // Salvare il materiale nell'array per accedervi dalla GUI
                                bottleMaterials.push(newMaterial);
                                
                                node.material = newMaterial;
                            }
                            // Per parti non di vetro, potenziare comunque il materiale
                            else {
                                // Migliorare la qualità della riflessione per tutti i materiali
                                node.material.metalness = Math.min(node.material.metalness || 0, 0.5);
                                node.material.roughness = Math.max(node.material.roughness || 0.5, 0.1);
                                node.material.envMapIntensity = params.enableEnvMap ? params.envMapIntensity : 0;
                            }
                        }
                    }
                });
                
                // Calcolare le dimensioni e il centro del modello
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const bottomY = box.min.y;
                
                // Centrare il modello in X e Z, ma farla appoggiare sul piano
                model.position.x = -center.x;
                model.position.z = -center.z;
                // Posizionare la parte inferiore della bottiglia esattamente sul piano
                model.position.y = -bottomY;
                
                // Calcolare la distanza appropriata per la camera
                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = camera.fov * (Math.PI / 180);
                let cameraDistance = (maxDim / 2) / Math.tan(fov / 2);
                
                // Considerare il rapporto d'aspetto per modificare la distanza se necessario
                const aspect = window.innerWidth / window.innerHeight;
                if (aspect < 1) {
                    // Per schermi verticali
                    cameraDistance *= 1.5;
                }
                
                // Posizionare la camera in modo che il modello sia ben visibile
                // Solleviamo leggermente la camera per vedere meglio la bottiglia
                camera.position.set(0, maxDim * 0.3, cameraDistance);
                
                // Impostare il target dei controlli a circa metà bottiglia
                controls.target.set(0, maxDim * 0.4, 0);
                
                // Aggiungere il modello alla scena
                scene.add(model);
                
                // Aggiornare i controlli
                controls.update();
                
                // Impostare il mixer per le animazioni (se presenti)
                if (gltf.animations && gltf.animations.length > 0) {
                    mixer = new THREE.AnimationMixer(model);
                    const action = mixer.clipAction(gltf.animations[0]);
                    action.play();
                }
                
                // Impostare la distanza minima e massima per il bokeh DOF
                if (bokehPass && bokehPass.uniforms) {
                    // Mettere a fuoco la bottiglia
                    bokehPass.uniforms["focus"].value = cameraDistance;
                }
                
                // Caricare l'etichetta rettangolare
                loader.load(
                    'modelli/wine_bottle/etiketta_rettangolare-PolyHD.gltf',
                    function(etiGltf) {
                        const etichetta = etiGltf.scene;
                        
                        // Riferimento globale all'etichetta per poterla aggiornare dalla GUI
                        window.etichettaCeramica = etichetta;
                        
                        // Migliorare i materiali dell'etichetta
                        etichetta.traverse(function(node) {
                            if (node.isMesh) {
                                node.castShadow = true;
                                node.receiveShadow = true;
                                
                                if (node.material) {
                                    // Incrementare l'intensità della environment map
                                    if (node.material.envMap !== undefined || scene.environment) {
                                        node.material.envMapIntensity = params.enableEnvMap ? params.envMapIntensity : 0;
                                    }
                                    
                                    // Applicare la texture esistente in Textures/piastrella.jpg a tutti i materiali dell'etichetta
                                    const textureLoader = new THREE.TextureLoader(loadingManager);
                                    
                                    // Carica texture come bump map
                                    textureLoader.load(
                                        'modelli/wine_bottle/textures/piastrella.jpg',
                                        function(texture) {
                                            console.log('Texture piastrella.jpg caricata correttamente per l\'etichetta');
                                            
                                            // Impostazioni per la mappa bump
                                            texture.flipY = false; 
                                            texture.wrapS = THREE.RepeatWrapping;
                                            texture.wrapT = THREE.RepeatWrapping;
                                            texture.repeat.set(1, 1);
                                            
                                            // Crea le versioni normali e invertite per bump e displacement
                                            window.etichetteTextureCache.bumps.normal = texture.clone();
                                            window.etichetteTextureCache.displacements.normal = texture.clone();
                                            
                                            // Crea le versioni invertite
                                            window.etichetteTextureCache.bumps.inverted = createInvertedTexture(texture);
                                            window.etichetteTextureCache.displacements.inverted = createInvertedTexture(texture);
                                            
                                            // Definire le mappe da usare prima di caricare la normal map
                                            const bumpMapToUse = params.eticInvertBump 
                                                ? window.etichetteTextureCache.bumps.inverted 
                                                : window.etichetteTextureCache.bumps.normal;
                                                
                                            const displacementMapToUse = params.eticInvertDisplacement 
                                                ? window.etichetteTextureCache.displacements.inverted 
                                                : window.etichetteTextureCache.displacements.normal;
                                            
                                            // Carica la normal map
                                            textureLoader.load('modelli/wine_bottle/textures/normal_map.jpg', function(normalTexture) {
                                                console.log('Normal map caricata correttamente');
                                                normalTexture.flipY = false;
                                                normalTexture.wrapS = THREE.RepeatWrapping;
                                                normalTexture.wrapT = THREE.RepeatWrapping;
                                                window.etichetteTextureCache.normalMap = normalTexture;
                                                
                                                // Aggiorna il materiale dopo aver caricato tutte le texture
                                                window.createAndApplyMaterial(node, displacementMapToUse, bumpMapToUse);
                                            }, undefined, function(error) {
                                                console.error('Errore nel caricamento della normal map:', error);
                                                // Continua comunque con il materiale senza normal map
                                                window.createAndApplyMaterial(node, displacementMapToUse, bumpMapToUse);
                                            });
                                        },
                                        undefined,
                                        function(error) {
                                            console.error('Errore nel caricamento della texture piastrella.jpg:', error);
                                            
                                            // Fallback con materiale semplice in caso di errore texture
                                            const fallbackMaterial = new THREE.MeshPhysicalMaterial({
                                                color: 0xffffff, // Colore base della ceramica
                                                roughness: 0.15,  // Superficie più liscia
                                                metalness: 0.0,  // Non metallico
                                                clearcoat: 1.0,  // Strato di smalto
                                                clearcoatRoughness: 0.05, // Lucentezza dello smalto maggiore
                                                reflectivity: 0.8, // Riflessività aumentata
                                                
                                                // Valori per il rilievo aumentati
                                                bumpScale: 0.05,
                                                displacementScale: 0.08,
                                                displacementBias: -0.05
                                            });
                                            
                                            node.material = fallbackMaterial;
                                            console.log('Applicato materiale fallback semplice');
                                        }
                                    );
                                }
                            }
                        });
                        
                        // Aggiungere l'etichetta alla scena
                        scene.add(etichetta);
                        
                        // Assicurarsi che l'etichetta rimanga visibile
                        const checkEtichetteVisibility = () => {
                            // Verificare se l'etichetta è ancora nella scena
                            if (!scene.getObjectById(etichetta.id)) {
                                console.log('Etichetta non trovata nella scena, reinserimento...');
                                scene.add(etichetta);
                            } else {
                                console.log('Etichetta presente nella scena');
                            }
                        };
                        
                        // Controllare la visibilità dell'etichetta dopo un po' di tempo
                        setTimeout(checkEtichetteVisibility, 500);
                        setTimeout(checkEtichetteVisibility, 1000);
                        setTimeout(checkEtichetteVisibility, 2000);
                        
                        console.log('Etichetta rettangolare caricata con successo');
                    },
                    // Callback di progresso per l'etichetta
                    function(xhr) {
                        if (xhr.lengthComputable) {
                            const percentuale = (xhr.loaded / xhr.total) * 100;
                            console.log('Etichetta: ' + percentuale.toFixed(2) + '% caricato');
                        }
                    },
                    // Callback di errore per l'etichetta
                    function(error) {
                        console.error('Errore durante il caricamento dell\'etichetta:', error);
                    }
                );
                
                // Avviare l'animazione
                animate();
            },
            // Callback di progresso
            function(xhr) {
                if (xhr.lengthComputable) {
                    const percentuale = (xhr.loaded / xhr.total) * 100;
                    console.log(percentuale.toFixed(2) + '% caricato');
                }
            },
            // Callback di errore
            function(error) {
                console.error('Errore durante il caricamento del modello:', error);
            }
        );
    }
    
    // Funzione per gestire il ridimensionamento della finestra
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Aggiornare anche il composer
        if (composer) {
            composer.setSize(window.innerWidth, window.innerHeight);
        }
        
        // Aggiornare le dimensioni per il bokeh
        if (bokehPass && bokehPass.uniforms) {
            bokehPass.uniforms.aspect.value = camera.aspect;
        }
    }
    
    // Visualizzazione dei controlli
    const controlsInfo = document.createElement('div');
    controlsInfo.className = 'controls-info';
    controlsInfo.innerHTML = `
        <div><strong>Comandi:</strong></div>
        <div>Rotazione: Click sinistro + Trascina</div>
        <div>Zoom: Rotella mouse / Pinch</div>
    `;
    document.body.appendChild(controlsInfo);

    // Configurare il pannello GUI
    function setupGUI() {
        // Chiudere tutti i controller precedenti se esistenti
        if (gui) {
            gui.destroy();
        }
        
        // Creare nuovo GUI
        gui = new dat.GUI({ width: 300 });
        
        // Aggiungere un messaggio di debug
        console.log("Colori usati nell'interfaccia:");
        console.log("fogColor:", params.fogColor);
        console.log("background:", params.background);
        console.log("ambientColor:", params.ambientColor);
        console.log("spotColor:", params.spotColor);
        console.log("planeColor:", params.planeColor);
        
        // Folder per i controlli del renderer
        const rendererFolder = gui.addFolder('Renderer');
        rendererFolder.add(params, 'exposure', 0.1, 5.0).name('Esposizione').onChange(function(value) {
            renderer.toneMappingExposure = value;
        });
        const toneMappingOptions = {
            'No Tone Mapping': 'None',
            'Linear': 'Linear',
            'Reinhard': 'Reinhard',
            'Cineon': 'Cineon',
            'ACESFilmic': 'ACESFilmic'
        };
        rendererFolder.add(params, 'toneMapping', Object.values(toneMappingOptions)).name('Tone Mapping').onChange(function(value) {
            switch(value) {
                case 'None':
                    renderer.toneMapping = THREE.NoToneMapping;
                    break;
                case 'Linear':
                    renderer.toneMapping = THREE.LinearToneMapping;
                    break;
                case 'Reinhard':
                    renderer.toneMapping = THREE.ReinhardToneMapping;
                    break;
                case 'Cineon':
                    renderer.toneMapping = THREE.CineonToneMapping;
                    break;
                case 'ACESFilmic':
                    renderer.toneMapping = THREE.ACESFilmicToneMapping;
                    break;
            }
        });
        rendererFolder.open();
        
        // Folder per i controlli della nebbia
        const fogFolder = gui.addFolder('Nebbia');
        fogFolder.add(params, 'enableFog').name('Abilita Nebbia').onChange(function(value) {
            if (value) {
                scene.fog = new THREE.FogExp2(convertColor(params.fogColor), params.fogDensity);
            } else {
                scene.fog = null;
            }
        });
        fogFolder.add(params, 'fogDensity', 0, 0.05).name('Densità Nebbia').onChange(function(value) {
            if (scene.fog) {
                scene.fog.density = value;
            }
        });
        fogFolder.addColor(params, 'fogColor').name('Colore Nebbia').onChange(function(value) {
            if (scene.fog) {
                scene.fog.color = convertColor(value);
            }
        });
        fogFolder.open();
        
        // Folder per i controlli dell'ambiente
        const envFolder = gui.addFolder('Ambiente');
        envFolder.add(params, 'enableEnvMap').name('Abilita Environment Map').onChange(function(value) {
            if (value && scene.environmentMap) {
                scene.environment = scene.environmentMap;
            } else {
                scene.environment = null;
            }
            
            // Aggiornare tutti i materiali
            scene.traverse(function(node) {
                if (node.isMesh && node.material) {
                    if (node.material.envMap !== undefined || scene.environment) {
                        if (value) {
                            node.material.envMapIntensity = params.envMapIntensity;
                        } else {
                            node.material.envMapIntensity = 0;
                        }
                        node.material.needsUpdate = true;
                    }
                }
            });
            
            // Aggiornare anche piano e bottiglia
            updateMaterials();
        });
        
        // Aggiungere selezione file HDR
        const hdrOptions = {
            'Sera': 'HDR/EveningEnvironmentHDRI004_2K-HDR.exr',
            'Giardino': 'HDR/giardino_estenro.exr'
        };
        envFolder.add(params, 'hdrFile', hdrOptions).name('File HDR').onChange(function(value) {
            // Mostrare messaggio di caricamento
            const loadingMsg = document.createElement('div');
            loadingMsg.className = 'loading hdr-loading';
            loadingMsg.innerHTML = '<div>Caricamento HDR...</div>';
            document.body.appendChild(loadingMsg);
            
            // Caricare nuovo HDR
            const exrLoader = new THREE.EXRLoader();
            exrLoader.load(value, function(texture) {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                
                // Aggiornare l'environment map
                scene.environmentMap = texture;
                
                // Aggiornare l'illuminazione
                if (params.enableEnvMap) {
                    scene.environment = texture;
                }
                
                // Aggiornare lo sfondo se necessario
                if (params.useEnvBackground) {
                    scene.background = texture;
                }
                
                // Aggiornare tutti i materiali e il renderer
                updateMaterials();
                
                // Rimuovere il messaggio di caricamento
                document.body.removeChild(loadingMsg);
                
                // Mostrare messaggio di completamento
                const notification = document.createElement('div');
                notification.className = 'notification';
                notification.textContent = 'HDR cambiato con successo!';
                document.body.appendChild(notification);
                
                // Rimuovere la notifica dopo 3 secondi
                setTimeout(function() {
                    notification.classList.add('fade-out');
                    setTimeout(function() {
                        document.body.removeChild(notification);
                    }, 500);
                }, 3000);
            });
        });
        
        envFolder.add(params, 'envMapIntensity', 0, 5).name('Intensità Env Map').onChange(function(value) {
            // Attraversare tutti i materiali nella scena
            scene.traverse(function(node) {
                if (node.isMesh && node.material) {
                    if (node.material.envMap !== undefined || scene.environment) {
                        if (params.enableEnvMap) {
                            // Diversa intensità per bottiglia e piano
                            if (node.material.name && 
                               (node.material.name.includes('glass') || 
                                node.material.name.includes('bottle') || 
                                node.material.name.includes('vetro'))) {
                                node.material.envMapIntensity = value;
                            } else if (node === plane) {
                                // Il piano usa la sua intensità specifica
                                node.material.envMapIntensity = params.planeEnvIntensity;
                            } else {
                                // Altri materiali
                                node.material.envMapIntensity = value * 0.5;
                            }
                        } else {
                            node.material.envMapIntensity = 0;
                        }
                        node.material.needsUpdate = true;
                    }
                }
            });
        });
        envFolder.add(params, 'useEnvBackground').name('Sfondo HDR').onChange(function(value) {
            if (value && scene.environmentMap) {
                scene.background = scene.environmentMap;
            } else {
                scene.background = convertColor(params.background);
            }
        });
        envFolder.addColor(params, 'background').name('Colore Sfondo').onChange(function(value) {
            if (!params.useEnvBackground) {
                scene.background = convertColor(value);
            }
        });
        envFolder.open();
        
        // Folder per le luci
        const lightsFolder = gui.addFolder('Luci');
        
        // Controlli luce ambiente
        const ambientFolder = lightsFolder.addFolder('Luce Ambiente');
        ambientFolder.add(params, 'ambientIntensity', 0, 1).name('Intensità').onChange(function(value) {
            if (ambientLight) ambientLight.intensity = value;
        });
        ambientFolder.addColor(params, 'ambientColor').name('Colore').onChange(function(value) {
            if (ambientLight) ambientLight.color = convertColor(value);
        });
        
        // Controlli luce spot
        const spotFolder = lightsFolder.addFolder('Luce Spot');
        spotFolder.add(params, 'spotIntensity', 0, 100).name('Intensità').onChange(function(value) {
            if (spotLight) spotLight.intensity = value;
        });
        spotFolder.addColor(params, 'spotColor').name('Colore').onChange(function(value) {
            if (spotLight) spotLight.color = convertColor(value);
        });
        spotFolder.add(params, 'spotPosX', -20, 20).name('Posizione X').onChange(function(value) {
            if (spotLight) spotLight.position.x = value;
        });
        spotFolder.add(params, 'spotPosY', 0, 20).name('Posizione Y').onChange(function(value) {
            if (spotLight) spotLight.position.y = value;
        });
        spotFolder.add(params, 'spotPosZ', -20, 20).name('Posizione Z').onChange(function(value) {
            if (spotLight) spotLight.position.z = value;
        });
        spotFolder.add(params, 'spotAngle', 0, 90).name('Angolo').onChange(function(value) {
            if (spotLight) spotLight.angle = THREE.MathUtils.degToRad(value);
        });
        spotFolder.add(params, 'spotPenumbra', 0, 1).name('Penombra').onChange(function(value) {
            if (spotLight) spotLight.penumbra = value;
        });
        spotFolder.add(params, 'enableSpotShadow').name('Ombre').onChange(function(value) {
            if (spotLight) spotLight.castShadow = value;
        });
        
        // Ombre
        const shadowFolder = lightsFolder.addFolder('Ombre');
        const shadowOptions = {
            'Basic': 'Basic',
            'PCF': 'PCF',
            'PCF Soft': 'PCFSoft',
            'VSM': 'VSM'
        };
        shadowFolder.add(params, 'shadowMapType', Object.values(shadowOptions)).name('Tipo Ombre').onChange(function(value) {
            switch(value) {
                case 'Basic':
                    renderer.shadowMap.type = THREE.BasicShadowMap;
                    break;
                case 'PCF':
                    renderer.shadowMap.type = THREE.PCFShadowMap;
                    break;
                case 'PCFSoft':
                    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                    break;
                case 'VSM':
                    renderer.shadowMap.type = THREE.VSMShadowMap;
                    break;
            }
        });
        shadowFolder.add(params, 'shadowBias', -0.001, 0.001, 0.0001).name('Shadow Bias').onChange(function(value) {
            if (spotLight && spotLight.shadow) spotLight.shadow.bias = value;
        });
        shadowFolder.add(params, 'shadowMapSize', [256, 512, 1024, 2048, 4096]).name('Risoluzione').onChange(function(value) {
            if (spotLight && spotLight.shadow) {
                spotLight.shadow.mapSize.width = parseInt(value);
                spotLight.shadow.mapSize.height = parseInt(value);
                // Rigenerare le shadow map
                spotLight.shadow.map = null;
            }
        });
        
        lightsFolder.open();
        
        // Folder per il piano
        const planeFolder = gui.addFolder('Piano');
        planeFolder.addColor(params, 'planeColor').name('Colore').onChange(updatePlaneMaterial);
        planeFolder.add(params, 'planeMetalness', 0, 1).name('Metallicità').onChange(updatePlaneMaterial);
        planeFolder.add(params, 'planeRoughness', 0, 1).name('Rugosità').onChange(updatePlaneMaterial);
        planeFolder.add(params, 'planeReflectivity', 0, 1).name('Riflessività').onChange(updatePlaneMaterial);
        planeFolder.add(params, 'planeEnvIntensity', 0, 2).name('Intensità Env').onChange(updatePlaneMaterial);
        planeFolder.add(params, 'planeOpacity', 0, 1).name('Opacità').onChange(updatePlaneMaterial);
        planeFolder.open();
        
        // Folder per la bottiglia
        const bottleFolder = gui.addFolder('Bottiglia');
        bottleFolder.add(params, 'bottleMetalness', 0, 1).name('Metallicità').onChange(function(value) {
            updateBottleMaterials();
        });
        bottleFolder.add(params, 'bottleRoughness', 0, 1).name('Rugosità').onChange(function(value) {
            updateBottleMaterials();
        });
        bottleFolder.add(params, 'bottleTransmission', 0, 1).name('Trasmissione').onChange(function(value) {
            updateBottleMaterials();
        });
        bottleFolder.add(params, 'bottleThickness', 0, 2).name('Spessore').onChange(function(value) {
            updateBottleMaterials();
        });
        bottleFolder.add(params, 'bottleIor', 1, 2.33).name('Indice Rifrazione').onChange(function(value) {
            updateBottleMaterials();
        });
        bottleFolder.add(params, 'bottleOpacity', 0, 1).name('Opacità').onChange(function(value) {
            updateBottleMaterials();
        });
        bottleFolder.open();
        
        // Folder per l'etichetta in ceramica
        const eticFolder = gui.addFolder('Etichetta Ceramica');
        eticFolder.addColor(params, 'eticColor').name('Colore').onChange(function(value) {
            scheduleEtichettaUpdate();
        });
        eticFolder.add(params, 'eticRoughness', 0, 1, 0.001).name('Rugosità').onChange(function(value) {
            scheduleEtichettaUpdate();
        });
        eticFolder.add(params, 'eticMetalness', 0, 1, 0.001).name('Metallicità').onChange(function(value) {
            scheduleEtichettaUpdate();
        });
        eticFolder.add(params, 'eticClearcoat', 0, 1, 0.001).name('Strato Lucido').onChange(function(value) {
            scheduleEtichettaUpdate();
        });
        eticFolder.add(params, 'eticClearcoatRoughness', 0, 1, 0.001).name('Rugosità Lucido').onChange(function(value) {
            scheduleEtichettaUpdate();
        });
        eticFolder.add(params, 'eticReflectivity', 0, 1, 0.001).name('Riflessività').onChange(function(value) {
            scheduleEtichettaUpdate();
        });
        
        // Sottocartella per i parametri del rilievo
        const eticRilievoFolder = eticFolder.addFolder('Rilievo');
        eticRilievoFolder.add(params, 'eticBumpScale', 0, 0.01, 0.0001).name('Bump Scale').onChange(function(value) {
            scheduleEtichettaUpdate();
        });
        eticRilievoFolder.add(params, 'eticDisplacementScale', 0, 0.1, 0.001).name('Displacement Scale').onChange(function(value) {
            scheduleEtichettaUpdate();
        });
        eticRilievoFolder.add(params, 'eticDisplacementBias', -0.05, 0.05, 0.001).name('Displacement Bias').onChange(function(value) {
            scheduleEtichettaUpdate();
        });
        eticRilievoFolder.add(params, 'eticInvertBump').name('Inverti Bump').onChange(function(value) {
            // Per l'inversione, aggiorniamo subito
            updateEtichettaMaterial(true);
        });
        eticRilievoFolder.add(params, 'eticInvertDisplacement').name('Inverti Displacement').onChange(function(value) {
            // Per l'inversione, aggiorniamo subito
            updateEtichettaMaterial(true);
        });
        
        // Sottocartella per la normal map
        const eticNormalFolder = eticFolder.addFolder('Normal Map');
        eticNormalFolder.add(params, 'eticNormalMap').name('Abilita Normal Map').onChange(function(value) {
            updateEtichettaMaterial(true);
        });
        eticNormalFolder.add(params, 'eticNormalScale', 0, 3, 0.1).name('Normal Scale').onChange(function(value) {
            scheduleEtichettaUpdate();
        });
        eticNormalFolder.add(params, 'eticNormalIntensity', 0, 3, 0.1).name('Normal Intensità').onChange(function(value) {
            scheduleEtichettaUpdate();
        });
        eticNormalFolder.open();
        
        // Sottocartella per lo shader personalizzato
        const eticShaderFolder = eticFolder.addFolder('Shader Ceramica');
        eticShaderFolder.add(params, 'eticUseCustomShader').name('Usa Shader Ceramica').onChange(function(value) {
            updateEtichettaMaterial(true);
        });
        eticShaderFolder.addColor(params, 'eticHighlightColor').name('Colore Ombreggiatura').onChange(function(value) {
            // Aggiorna lo shader senza ricreare il materiale
            if (window.etichettaCeramica) {
                window.etichettaCeramica.traverse(function(node) {
                    if (node.isMesh && node.material && node.material.isShaderMaterial) {
                        node.material.uniforms.highlightColor.value.set(value);
                    }
                });
            } else {
                scheduleEtichettaUpdate();
            }
        });
        eticShaderFolder.add(params, 'eticDisplacementScale', 0, 0.1, 0.001).name('Displacement Shader').onChange(function(value) {
            if (window.etichettaCeramica) {
                window.etichettaCeramica.traverse(function(node) {
                    if (node.isMesh && node.material && node.material.isShaderMaterial) {
                        node.material.uniforms.displacementScale.value = value;
                    }
                });
            }
        });
        eticShaderFolder.add(params, 'eticBumpScale', 0, 0.01, 0.0001).name('Bump Shader').onChange(function(value) {
            if (window.etichettaCeramica) {
                window.etichettaCeramica.traverse(function(node) {
                    if (node.isMesh && node.material && node.material.isShaderMaterial) {
                        node.material.uniforms.bumpScale.value = value * 10;
                    }
                });
            }
        });
        eticShaderFolder.open();
        
        // Variabile per tenere traccia del timeout
        let etichettaUpdateTimeout = null;
        
        // Funzione per pianificare l'aggiornamento dell'etichetta
        function scheduleEtichettaUpdate() {
            // Pulisci il timeout esistente per evitare aggiornamenti multipli
            if (etichettaUpdateTimeout) {
                clearTimeout(etichettaUpdateTimeout);
            }
            
            // Pianifica un nuovo aggiornamento dopo 300 ms
            etichettaUpdateTimeout = setTimeout(function() {
                updateEtichettaMaterial();
                etichettaUpdateTimeout = null; // Pulisci il riferimento
            }, 300);
        }
        
        eticFolder.open();
        eticRilievoFolder.open();
        
        // Folder per il post-processing
        const postFolder = gui.addFolder('Post-Processing');
        postFolder.add(params, 'enablePostprocessing').name('Abilita Post-Processing');
        
        // Bloom
        const bloomFolder = postFolder.addFolder('Bloom (Bagliore)');
        bloomFolder.add(params, 'enableBloom').name('Abilita Bloom').onChange(updatePostProcessing);
        bloomFolder.add(params, 'bloomStrength', 0, 3).name('Intensità').onChange(function(value) {
            if (bloomPass) bloomPass.strength = value;
        });
        bloomFolder.add(params, 'bloomRadius', 0, 1).name('Raggio').onChange(function(value) {
            if (bloomPass) bloomPass.radius = value;
        });
        bloomFolder.add(params, 'bloomThreshold', 0, 1).name('Soglia').onChange(function(value) {
            if (bloomPass) bloomPass.threshold = value;
        });
        
        // Bokeh (DOF)
        const bokehFolder = postFolder.addFolder('Bokeh (DOF)');
        bokehFolder.add(params, 'enableBokeh').name('Abilita Bokeh').onChange(updatePostProcessing);
        bokehFolder.add(params, 'bokehFocus', 1, 2000).name('Messa a Fuoco').onChange(function(value) {
            if (bokehPass && bokehPass.uniforms) bokehPass.uniforms["focus"].value = value;
        });
        bokehFolder.add(params, 'bokehAperture', 0.00001, 0.0002, 0.00001).name('Apertura').onChange(function(value) {
            if (bokehPass && bokehPass.uniforms) bokehPass.uniforms["aperture"].value = value;
        });
        bokehFolder.add(params, 'bokehMaxblur', 0, 0.02).name('Blur Massimo').onChange(function(value) {
            if (bokehPass && bokehPass.uniforms) bokehPass.uniforms["maxblur"].value = value;
        });
        
        postFolder.open();
        
        // Folder per la camera
        const cameraFolder = gui.addFolder('Camera');
        cameraFolder.add(params, 'cameraFOV', 10, 100).name('FOV').onChange(function(value) {
            if (camera) {
                camera.fov = value;
                camera.updateProjectionMatrix();
            }
        });
        
        // Folder per i controlli
        const controlsFolder = gui.addFolder('Controlli');
        controlsFolder.add(params, 'enableDamping').name('Smorzamento').onChange(function(value) {
            if (controls) controls.enableDamping = value;
        });
        controlsFolder.add(params, 'dampingFactor', 0.01, 0.2).name('Fattore Smorzamento').onChange(function(value) {
            if (controls) controls.dampingFactor = value;
        });
        controlsFolder.add(params, 'autoRotate').name('Rotazione Automatica').onChange(function(value) {
            if (controls) controls.autoRotate = value;
        });
        controlsFolder.add(params, 'autoRotateSpeed', 0.1, 5).name('Velocità Rotazione').onChange(function(value) {
            if (controls) controls.autoRotateSpeed = value;
        });
        
        // Pulsante per esportare le impostazioni
        gui.add({
            esportaImpostazioni: function() {
                // Creare una copia pulita dei parametri (senza riferimenti circolari)
                const paramsExport = JSON.parse(JSON.stringify(params));
                
                // Convertire i colori esadecimali in formato esadecimale per JavaScript
                if (paramsExport.fogColor) paramsExport.fogColor = convertToHexValue(params.fogColor);
                if (paramsExport.background) paramsExport.background = convertToHexValue(params.background);
                if (paramsExport.ambientColor) paramsExport.ambientColor = convertToHexValue(params.ambientColor);
                if (paramsExport.spotColor) paramsExport.spotColor = convertToHexValue(params.spotColor);
                if (paramsExport.planeColor) paramsExport.planeColor = convertToHexValue(params.planeColor);
                
                // Formattare l'output per renderlo facilmente copiabile
                const output = 'params = ' + JSON.stringify(paramsExport, null, 4)
                    .replace(/"([^"]+)":/g, '$1:') // Rimuovere le virgolette dalle chiavi
                    .replace(/"/g, "'");           // Sostituire le virgolette con apici singoli
                
                // Stampare nella console
                console.log('%c Impostazioni Attuali:', 'font-weight: bold; background-color: #4CAF50; color: white; padding: 5px;');
                console.log(output);
                
                // Creare un elemento di notifica nell'interfaccia
                const notification = document.createElement('div');
                notification.className = 'notification';
                notification.textContent = 'Impostazioni esportate nella console (F12)';
                document.body.appendChild(notification);
                
                // Rimuovere la notifica dopo 3 secondi
                setTimeout(function() {
                    notification.classList.add('fade-out');
                    setTimeout(function() {
                        document.body.removeChild(notification);
                    }, 500);
                }, 3000);
            }
        }, 'esportaImpostazioni').name('Esporta Impostazioni');
        
        // Pulsante per scaricare il modello 3D e i materiali in formato JSON
        gui.add({
            scaricaModelloEMateriali: function() {
                // Raccogliere informazioni sul modello, materiali e parametri attuali
                const esportazione = {
                    parametri: JSON.parse(JSON.stringify(params)),
                    materiali: {},
                    modelloInfo: {
                        nome: 'Bottiglia di Vino',
                        descrizione: 'Modello 3D di una bottiglia di vino con etichetta',
                        data_esportazione: new Date().toISOString()
                    }
                };
                
                // Convertire i colori in formato esadecimale
                Object.keys(esportazione.parametri).forEach(key => {
                    if (key.toLowerCase().includes('color')) {
                        esportazione.parametri[key] = convertToHexValue(params[key]);
                    }
                });
                
                // Raccogliere informazioni sui materiali dalla scena
                scene.traverse(function(object) {
                    if (object.isMesh && object.material) {
                        // Estrai informazioni dal materiale della mesh
                        const mat = object.material;
                        const materialName = mat.name || `Material_${object.id}`;
                        
                        // Informazioni base del materiale
                        const materialInfo = {
                            tipo: mat.type,
                            nome: materialName,
                            colore: mat.color ? '#' + mat.color.getHexString() : null,
                            opacita: mat.opacity,
                            trasparente: mat.transparent,
                            wireframe: mat.wireframe,
                            visibile: mat.visible
                        };
                        
                        // Proprietà aggiuntive per MeshPhysicalMaterial
                        if (mat.isMeshPhysicalMaterial) {
                            Object.assign(materialInfo, {
                                metalness: mat.metalness,
                                roughness: mat.roughness,
                                clearcoat: mat.clearcoat,
                                clearcoatRoughness: mat.clearcoatRoughness,
                                transmission: mat.transmission,
                                thickness: mat.thickness,
                                ior: mat.ior,
                                reflectivity: mat.reflectivity,
                                envMapIntensity: mat.envMapIntensity
                            });
                        }
                        
                        // Aggiungere il materiale all'esportazione
                        esportazione.materiali[materialName] = materialInfo;
                    }
                });
                
                // Aggiungere informazioni sulla scena
                esportazione.scena = {
                    background: scene.background instanceof THREE.Color ? '#' + scene.background.getHexString() : null,
                    fog: scene.fog ? {
                        tipo: scene.fog.isFogExp2 ? 'FogExp2' : 'Fog',
                        colore: '#' + scene.fog.color.getHexString(),
                        densita: scene.fog.density
                    } : null
                };
                
                // Aggiungere informazioni sulla camera
                esportazione.camera = {
                    tipo: camera.type,
                    fov: camera.fov,
                    posizione: {
                        x: camera.position.x,
                        y: camera.position.y,
                        z: camera.position.z
                    },
                    rotazione: {
                        x: camera.rotation.x,
                        y: camera.rotation.y,
                        z: camera.rotation.z
                    }
                };
                
                // Aggiungere informazioni sulle luci
                esportazione.luci = [];
                scene.traverse(function(object) {
                    if (object.isLight) {
                        const lightInfo = {
                            tipo: object.type,
                            colore: '#' + object.color.getHexString(),
                            intensita: object.intensity,
                            posizione: {
                                x: object.position.x,
                                y: object.position.y,
                                z: object.position.z
                            }
                        };
                        
                        // Proprietà specifiche per SpotLight
                        if (object.isSpotLight) {
                            Object.assign(lightInfo, {
                                angle: object.angle,
                                penumbra: object.penumbra,
                                distance: object.distance,
                                decay: object.decay
                            });
                        }
                        
                        esportazione.luci.push(lightInfo);
                    }
                });
                
                // Convertire in JSON e scaricare il file
                const jsonString = JSON.stringify(esportazione, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                // Creare un link di download
                const a = document.createElement('a');
                a.href = url;
                a.download = 'bottiglia_vino_scene_export_' + new Date().toISOString().slice(0, 10) + '.json';
                document.body.appendChild(a);
                a.click();
                
                // Pulizia
                setTimeout(function() {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                
                // Mostrare una notifica
                const notification = document.createElement('div');
                notification.className = 'notification';
                notification.textContent = 'Esportazione completata!';
                document.body.appendChild(notification);
                
                // Rimuovere la notifica dopo 3 secondi
                setTimeout(function() {
                    notification.classList.add('fade-out');
                    setTimeout(function() {
                        document.body.removeChild(notification);
                    }, 500);
                }, 3000);
            }
        }, 'scaricaModelloEMateriali').name('Scarica Modello 3D');

        // Aggiungere un pulsante per ripristinare le intensità e l'esposizione
        gui.add({
            ripristinaIntensite: function() {
                // Ripristinare i valori iniziali
                renderer.toneMappingExposure = params.exposure;
                
                // Luci
                if (ambientLight) {
                    ambientLight.intensity = params.ambientIntensity;
                    ambientLight.color.copy(convertColor(params.ambientColor));
                }
                
                if (spotLight) {
                    spotLight.intensity = params.spotIntensity;
                    spotLight.color.copy(convertColor(params.spotColor));
                }
                
                // Aggiornare tutti i materiali nella scena
                scene.traverse(function(node) {
                    if (node.isMesh && node.material) {
                        if (node.material.envMap !== undefined || scene.environment) {
                            if (params.enableEnvMap) {
                                // Diversa intensità per bottiglia e piano
                                if (node.material.name && 
                                    (node.material.name.includes('glass') || 
                                    node.material.name.includes('bottle') || 
                                    node.material.name.includes('vetro'))) {
                                    node.material.envMapIntensity = params.envMapIntensity;
                                } else if (node === plane) {
                                    // Il piano usa la sua intensità specifica
                                    node.material.envMapIntensity = params.planeEnvIntensity;
                                } else {
                                    // Altri materiali
                                    node.material.envMapIntensity = params.envMapIntensity * 0.5;
                                }
                            } else {
                                node.material.envMapIntensity = 0;
                            }
                            node.material.needsUpdate = true;
                        }
                    }
                });
                
                // Notifica utente
                const notification = document.createElement('div');
                notification.className = 'notification';
                notification.textContent = 'Intensità ripristinate correttamente!';
                document.body.appendChild(notification);
                
                // Rimuovere la notifica dopo 3 secondi
                setTimeout(function() {
                    notification.classList.add('fade-out');
                    setTimeout(function() {
                        document.body.removeChild(notification);
                    }, 500);
                }, 3000);
            }
        }, 'ripristinaIntensite').name('Ripristina Intensità');
    }
    
    // Funzione per aggiornare i materiali
    function updateMaterials() {
        // Aggiornare i materiali della bottiglia
        bottleMaterials.forEach(function(mat) {
            if (mat && mat.isMeshPhysicalMaterial) {
                mat.envMapIntensity = params.enableEnvMap ? params.envMapIntensity : 0;
            }
        });
        
        // Aggiornare il materiale del piano
        updatePlaneMaterial();
    }
    
    // Funzione per aggiornare il materiale del piano
    function updatePlaneMaterial() {
        if (planeMaterial) {
            planeMaterial.color.set(convertColor(params.planeColor));
            planeMaterial.metalness = params.planeMetalness;
            planeMaterial.roughness = params.planeRoughness;
            planeMaterial.reflectivity = params.planeReflectivity;
            planeMaterial.envMapIntensity = params.enableEnvMap ? params.planeEnvIntensity : 0;
            planeMaterial.opacity = params.planeOpacity;
            planeMaterial.needsUpdate = true;
        }
    }
    
    // Funzione per aggiornare i materiali della bottiglia
    function updateBottleMaterials() {
        // Debug dei materiali disponibili
        console.log("Aggiornamento materiali bottiglia...");
        console.log("Numero di materiali disponibili: " + bottleMaterials.length);
        
        // Aggiornare tutti i materiali della bottiglia nell'array
        bottleMaterials.forEach(function(mat, index) {
            if (mat && mat.isMeshPhysicalMaterial) {
                console.log("Aggiornamento materiale #" + index);
                mat.metalness = params.bottleMetalness;
                mat.roughness = params.bottleRoughness;
                mat.transmission = params.bottleTransmission;
                mat.thickness = params.bottleThickness;
                mat.ior = params.bottleIor;
                mat.opacity = params.bottleOpacity;
                mat.needsUpdate = true;
            }
        });
        
        // Nel caso i materiali non fossero stati aggiunti all'array, cercare nel modello
        scene.traverse(function(node) {
            if (node.isMesh && node.material) {
                if (node.material.name && 
                   (node.material.name.includes('glass') || 
                    node.material.name.includes('bottle') || 
                    node.material.name.includes('vetro'))) {
                    
                    // Se è un materiale bottiglia/vetro
                    if (node.material.isMeshPhysicalMaterial) {
                        // Aggiornare il materiale esistente
                        node.material.metalness = params.bottleMetalness;
                        node.material.roughness = params.bottleRoughness;
                        node.material.transmission = params.bottleTransmission;
                        node.material.thickness = params.bottleThickness;
                        node.material.ior = params.bottleIor;
                        node.material.opacity = params.bottleOpacity;
                        node.material.needsUpdate = true;
                        
                        // Aggiungere all'array se non è già presente
                        if (!bottleMaterials.includes(node.material)) {
                            bottleMaterials.push(node.material);
                            console.log("Nuovo materiale bottiglia aggiunto all'array");
                        }
                    } else {
                        // Se non è un MeshPhysicalMaterial, crearne uno nuovo
                        const newMaterial = new THREE.MeshPhysicalMaterial({
                            color: node.material.color || 0x102030,
                            metalness: params.bottleMetalness,
                            roughness: params.bottleRoughness,
                            transmission: params.bottleTransmission,
                            thickness: params.bottleThickness,
                            ior: params.bottleIor,
                            specularIntensity: 1,
                            envMapIntensity: params.enableEnvMap ? params.envMapIntensity : 0,
                            transparent: true,
                            opacity: params.bottleOpacity
                        });
                        
                        // Copiare le texture
                        if (node.material.map) newMaterial.map = node.material.map;
                        
                        // Applicare il nuovo materiale
                        node.material = newMaterial;
                        
                        // Aggiungerlo all'array
                        bottleMaterials.push(newMaterial);
                        console.log("Creato nuovo materiale per la bottiglia");
                    }
                }
            }
        });
        
        console.log("Aggiornamento materiali bottiglia completato");
    }
    
    // Funzione per aggiornare il materiale dell'etichetta
    function updateEtichettaMaterial(forceRecreate = false) {
        console.log("Aggiornamento materiale etichetta ceramica...");
        
        // Cache globale per le texture dell'etichetta
        if (!window.etichetteTextureCache) {
            window.etichetteTextureCache = {
                original: null,
                bumps: {
                    normal: null,
                    inverted: null
                },
                displacements: {
                    normal: null,
                    inverted: null
                },
                normalMap: null
            };
        }
        
        // Cerca l'etichetta nella scena
        if (window.etichettaCeramica) {
            window.etichettaCeramica.traverse(function(node) {
                if (node.isMesh && node.material) {
                    // Imposta la texture da usare - usa prima la cache se esiste
                    let bumpMapToUse = params.eticInvertBump 
                        ? window.etichetteTextureCache.bumps.inverted 
                        : window.etichetteTextureCache.bumps.normal;
                        
                    let displacementMapToUse = params.eticInvertDisplacement 
                        ? window.etichetteTextureCache.displacements.inverted 
                        : window.etichetteTextureCache.displacements.normal;
                    
                    // Se dobbiamo caricare o creare le texture
                    if (forceRecreate || !bumpMapToUse || !displacementMapToUse) {
                        // Carica la texture solo se non è già nella cache
                        if (!window.etichetteTextureCache.original || forceRecreate) {
                            const textureLoader = new THREE.TextureLoader();
                            textureLoader.load('modelli/wine_bottle/textures/piastrella.jpg', function(texture) {
                                console.log('Texture piastrella.jpg caricata e inserita nella cache');
                                
                                // Impostazioni per la texture originale
                                texture.flipY = false;
                                texture.wrapS = THREE.RepeatWrapping;
                                texture.wrapT = THREE.RepeatWrapping;
                                texture.repeat.set(1, 1);
                                
                                // Inserisci nella cache globale
                                window.etichetteTextureCache.original = texture;
                                
                                // Crea le versioni normali e invertite per bump e displacement
                                window.etichetteTextureCache.bumps.normal = texture.clone();
                                window.etichetteTextureCache.displacements.normal = texture.clone();
                                
                                // Crea le versioni invertite
                                window.etichetteTextureCache.bumps.inverted = createInvertedTexture(texture);
                                window.etichetteTextureCache.displacements.inverted = createInvertedTexture(texture);
                                
                            // Dobbiamo definire quali texture usare qui localmente
                            const localBumpMapToUse = params.eticInvertBump 
                                ? window.etichetteTextureCache.bumps.inverted 
                                : window.etichetteTextureCache.bumps.normal;
                                
                            const localDisplacementMapToUse = params.eticInvertDisplacement 
                                ? window.etichetteTextureCache.displacements.inverted 
                                : window.etichetteTextureCache.displacements.normal;
                            
                                // Carica la normal map
                                textureLoader.load('modelli/wine_bottle/textures/normal_map.jpg', function(normalTexture) {
                                    console.log('Normal map caricata correttamente');
                                    normalTexture.flipY = false;
                                    normalTexture.wrapS = THREE.RepeatWrapping;
                                    normalTexture.wrapT = THREE.RepeatWrapping;
                                    window.etichetteTextureCache.normalMap = normalTexture;
                                    
                                    // Aggiorna il materiale dopo aver caricato tutte le texture
                                window.createAndApplyMaterial(node, localDisplacementMapToUse, localBumpMapToUse);
                                }, undefined, function(error) {
                                    console.error('Errore nel caricamento della normal map:', error);
                                    // Continua comunque con il materiale senza normal map
                                window.createAndApplyMaterial(node, localDisplacementMapToUse, localBumpMapToUse);
                            });
                            });
                            
                            // Esce subito, il callback del loader continuerà l'esecuzione
                            return;
                        } else {
                            // Le texture sono nella cache ma dobbiamo aggiornare quelle invertite
                            if (params.eticInvertBump && !window.etichetteTextureCache.bumps.inverted) {
                                window.etichetteTextureCache.bumps.inverted = createInvertedTexture(window.etichetteTextureCache.original);
                            }
                            
                            if (params.eticInvertDisplacement && !window.etichetteTextureCache.displacements.inverted) {
                                window.etichetteTextureCache.displacements.inverted = createInvertedTexture(window.etichetteTextureCache.original);
                            }
                            
                            // Aggiorna le texture da usare
                            bumpMapToUse = params.eticInvertBump 
                                ? window.etichetteTextureCache.bumps.inverted 
                                : window.etichetteTextureCache.bumps.normal;
                                
                            displacementMapToUse = params.eticInvertDisplacement 
                                ? window.etichetteTextureCache.displacements.inverted 
                                : window.etichetteTextureCache.displacements.normal;
                        }
                    }
                    
                    // Se abbiamo le texture, possiamo aggiornare il materiale
                    if (bumpMapToUse && displacementMapToUse) {
                    window.createAndApplyMaterial(node, displacementMapToUse, bumpMapToUse);
                    }
                }
            });
        } else {
            console.warn("Etichetta ceramica non trovata nella scena!");
        }
    }
    
    // Funzione per aggiornare il post-processing
    function updatePostProcessing() {
        if (composer) {
            // Rimuovere tutti i pass
            composer.passes = [];
            
            // Aggiungere sempre il render pass
            composer.addPass(renderPass);
            
            // Aggiungere bokeh se abilitato
            if (params.enableBokeh && bokehPass) {
                composer.addPass(bokehPass);
            }
            
            // Aggiungere bloom se abilitato
            if (params.enableBloom && bloomPass) {
                composer.addPass(bloomPass);
            }
        }
    }
    
    // Funzione per convertire un colore in formato esadecimale per JavaScript
    function convertToHexValue(color) {
        // Se è già una stringa esadecimale, convertirla dal formato dat.GUI (#rrggbb) a 0xrrggbb
        if (typeof color === 'string' && color.startsWith('#')) {
            return '0x' + color.substring(1);
        }
        
        // Se è un oggetto THREE.Color, convertirlo
        if (color && color.isColor) {
            return '0x' + color.getHexString();
        }
        
        return color;
    }

    // Shader personalizzato per l'etichetta in ceramica
    function createCeramicShaderMaterial(baseColor, highlightColor) {
        const ceramicUniforms = {
            baseColor: { value: new THREE.Color(baseColor || '#d04c0f') }, // colore smaltato
            highlightColor: { value: new THREE.Color(highlightColor || '#3a0e02') }, // colore nelle valli
            bumpTexture: { value: null },
            bumpScale: { value: 0.01 },
            displacementMap: { value: null },
            displacementScale: { value: 0.04 },
            displacementBias: { value: -0.005 },
            normalMap: { value: null },
            normalScale: { value: new THREE.Vector2(1.0, 1.0) },
            useNormalMap: { value: false }
        };
        
        const ceramicShaderMaterial = new THREE.ShaderMaterial({
            uniforms: ceramicUniforms,
            vertexShader: `
                uniform sampler2D displacementMap;
                uniform float displacementScale;
                uniform float displacementBias;
                
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                varying vec2 vUv;
                
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    
                    // Applicare il displacement
                    vec4 displacement = texture2D(displacementMap, uv);
                    float displacementValue = displacement.r * displacementScale + displacementBias;
                    vec3 newPosition = position + normal * displacementValue;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                varying vec2 vUv;
                
                uniform vec3 baseColor;
                uniform vec3 highlightColor;
                uniform sampler2D bumpTexture;
                uniform float bumpScale;
                uniform sampler2D normalMap;
                uniform vec2 normalScale;
                uniform bool useNormalMap;
                
                void main() {
                    // Usa la normal map se disponibile
                    vec3 n = normalize(vNormal);
                    if (useNormalMap) {
                        vec3 normalValue = texture2D(normalMap, vUv).rgb * 2.0 - 1.0;
                        normalValue.xy *= normalScale;
                        normalValue = normalize(normalValue);
                        // Trasforma nel view space
                        n = normalize(n + normalValue);
                    }
                    
                    // Ottieni il valore della texture bump
                    float bumpValue = texture2D(bumpTexture, vUv).r;
                    
                    // Calcola l'angolo rispetto alla camera
                    vec3 viewDir = normalize(vViewPosition);
                    float facing = dot(n, viewDir); // quanto è "rivolta verso la camera"
                    
                    // Calcola la profondità in base all'angolo e alla texture
                    // Usa il bump per definire le "valli" dove il colore sarà più scuro
                    float depthShade = smoothstep(0.0, 0.7, (1.0 - facing) + (1.0 - bumpValue) * bumpScale * 10.0);
                    
                    // Mescola il colore base con quello di highlight in base alla profondità
                    vec3 finalColor = mix(baseColor, highlightColor, depthShade * 0.8);
                    
                    // Aggiungi una lucentezza più forte per simulare ceramica smaltata
                    float specular = pow(max(0.0, dot(reflect(-viewDir, n), viewDir)), 64.0) * 0.5;
                    finalColor += specular * vec3(1.0, 1.0, 1.0); // Riflesso bianco per la ceramica
                    
                    // Aggiungi un po' di variazione dal bumpValue per simulare piccole imperfezioni
                    finalColor *= 0.8 + bumpValue * 0.3;
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            side: THREE.DoubleSide
        });
        
        return ceramicShaderMaterial;
    }

    // Rendere la funzione disponibile globalmente
    window.createCeramicShaderMaterial = createCeramicShaderMaterial;
}); 