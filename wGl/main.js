

function degToRad(degrees) {
	return degrees * Math.PI / 180;
}

var rPyramid = 0;
var rCube = 0;

var lastTime = 0;

function animate() {
	
	var timeNow = new Date().getTime();
	var elapsed = 0;
	if (lastTime != 0) {
		elapsed = timeNow - lastTime;

		rPyramid += (90 * elapsed) / 1000.0;
		rCube -= (75 * elapsed) / 1000.0;
	}
	lastTime = timeNow;

	camController.update(elapsed);
}


function tick() {
	requestAnimFrame(tick);
	animate();
	context.draw();
}

window.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         window.oRequestAnimationFrame ||
         window.msRequestAnimationFrame ||
         function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
           window.setTimeout(callback, 1000/60);
         };
})();

var context;
var scene;
var camController;

var shaderSrcMap =
{
    "phong-vs.c":undefined,
    "phong-fs.c":undefined,
    "fullscr-vs.c":undefined,
    "fullscr-fs.c":undefined,
};

function start() 
{
    for (var key in shaderSrcMap)
    {
        loadShader(key);
    }
}

function loadShader(srcName)
{
    var client = new XMLHttpRequest();
    client.open('GET', "shaders/" + srcName);
    client.onreadystatechange = function() 
    {
        if ( client.readyState == 4 )
        {
            shaderSrcMap[srcName] = client.responseText; 
            checkShaderDependencies();
        }
    }
    client.send();
}

function checkShaderDependencies()
{
    for (var key in shaderSrcMap)
    {
        if (shaderSrcMap[key] == undefined)
        {
            return;
        }
    }
    
    // if all the shaders are loaded move on
    // to the main loop
    mainLoop();
}

function mainLoop()
{
	context = new GContext(document.getElementById("glcanvas"), shaderSrcMap);
	scene   = new GScene();
	camera  = new GCamera();
	
	scene.setCamera(camera);
	
	camera.setLookAt(4.232629776000977, 2.6432266235351562, 0.2486426830291748);
	camera.setUp(-0.09341227263212204, 0.9805285334587097, 0.17273758351802826);
	camera.setEye(9.44430160522461, 4.382470607757568, -3.9111077785491943);
	
	camController = new GCameraController();
	camController.bindCamera(camera);
	
	context.setScene(scene);
	
	tick();
	
	var ldr = new GObjLoader(scene);
	ldr.loadObj("office3d/18361-obj-4/", "OfficeOBJ.obj");
	//ldr.loadObj("office3d/18361-50509/", "OfficeOBJ.obj");
}