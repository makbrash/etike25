<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visualizzatore Bottiglia di Vino 3D</title>
    <link rel="stylesheet" href="css/style.css">
    <!-- Three.js core -->
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"></script>
    <!-- GLTFLoader per caricare i modelli GLTF -->
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/GLTFLoader.js"></script>
    <!-- EXRLoader per caricare file EXR -->
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/EXRLoader.js"></script>
    <!-- OrbitControls per la gestione dello zoom e dell'orbita -->
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js"></script>
    <!-- Effetti post-processing -->
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/postprocessing/EffectComposer.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/postprocessing/RenderPass.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/postprocessing/ShaderPass.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/shaders/CopyShader.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/postprocessing/BokehPass.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/postprocessing/UnrealBloomPass.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/shaders/LuminosityHighPassShader.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/shaders/BokehShader.js"></script>
    <!-- GUI per controlli -->
    <script src="https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.min.js"></script>
    <!-- Script personalizzato -->
    <script src="js/viewer.js"></script>
</head>
<body>
    <div id="container"></div>
</body>
</html> 