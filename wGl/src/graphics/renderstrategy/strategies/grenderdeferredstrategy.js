/** 
 * @constructor
 * @implements {GRenderStrategy}
 */
function GRenderDeferredStrategy( gl )
{
    this.gl = gl;
    this.configure();
    
}

GRenderDeferredStrategy.prototype.configure = function()
{
    // this map variable is to keep the closure compiler from getting confused.
    var map = this.shaderSrcMap = 
    {
        "blur-vs.c":undefined,
        "blur-fs.c":undefined,
        "fullscr-vs.c":undefined,
        "fullscr-fs.c":undefined,
        "shadowmap-vs.c":undefined,
        "shadowmap-fs.c":undefined,
        "ssao-vs.c":undefined,
        "ssao-fs.c":undefined,
        "colorspec-vs.c":undefined,
        "colorspec-fs.c":undefined,
        "normaldepth-fs.c":undefined,
        "normaldepth-vs.c":undefined,
        "position-fs.c":undefined,
        "position-vs.c":undefined,
        "light-fs.c":undefined,
        "light-vs.c":undefined
    };
    
    for (var key in map)
    {
        this.loadShader(key);
    }
};

GRenderDeferredStrategy.prototype.reload = function()
{
    this._isReady = false;
    
    for ( var key in this.programs )
    {
        this.programs[key].destroy();
        this.programs[key] = undefined;
    }
    
    this.configure();
};

GRenderDeferredStrategy.prototype.loadShader = function(srcName)
{
    var client = new XMLHttpRequest();
    var _this = this;
    client.open('GET', "assets/shaders/" + srcName);
    client.onreadystatechange = function() 
    {
        if ( client.readyState == 4 )
        {
            _this.shaderSrcMap[srcName] = client.responseText; 
            _this.checkShaderDependencies();
        }
    }
    client.send();
};

GRenderDeferredStrategy.prototype.checkShaderDependencies = function()
{
    for (var key in this.shaderSrcMap)
    {
        if (this.shaderSrcMap[key] == undefined)
        {
            return;
        }
    }
    
    this.initialize();
};

GRenderDeferredStrategy.prototype.initialize = function()
{   
    this.initTextureFramebuffer();
    this.initScreenVBOs();
    this.initShaders();
    this.initPassCmds();
    
    this._isReady = true;
};

GRenderDeferredStrategy.prototype.isReady = function()
{
    return true == this._isReady;
};

GRenderDeferredStrategy.prototype.initScreenVBOs = function()
{
    var gl = this.gl;
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    
    
    var screenVertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, screenVertBuffer);
    
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array([-1,-1,1,
                                    1,-1,1,
                                    1,1,1,
                                    -1,1,1]),
                  gl.STATIC_DRAW);
    
    screenVertBuffer.itemSize = 3;
    screenVertBuffer.numItems = 4;
    
    var screenTextBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, screenTextBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 
                  new Float32Array([0,0,  
                                    1,0,  
                                    1,1,  
                                    0,1]), 
                  gl.STATIC_DRAW);
    screenTextBuffer.itemSize = 2;
    screenTextBuffer.numItems = 4;
    
    var screenIndxBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, screenIndxBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 
                  new Uint16Array([0, 1, 2, 2, 3, 0]),
                  gl.STATIC_DRAW);
    screenIndxBuffer.itemSize = 1;
    screenIndxBuffer.numItems = 6;
    
    this.screen = {};
    
    this.screen.vertBuffer = screenVertBuffer;
    this.screen.textBuffer = screenTextBuffer;
    this.screen.indxBuffer = screenIndxBuffer;
    
	
	this.hMatrix = mat3.create();
};

GRenderDeferredStrategy.prototype.initShaders = function () 
{
    var shaderSrcMap = this.shaderSrcMap;
    var gl = this.gl;
    this.programs = {};
  
    this.programs.fullScr     = new GShader( shaderSrcMap["fullscr-vs.c"],     shaderSrcMap["fullscr-fs.c"]     );
    this.programs.shadowmap   = new GShader( shaderSrcMap["shadowmap-vs.c"],   shaderSrcMap["shadowmap-fs.c"]   );
    this.programs.ssao        = new GShader( shaderSrcMap["ssao-vs.c"],        shaderSrcMap["ssao-fs.c"]        );
    this.programs.blur        = new GShader( shaderSrcMap["blur-vs.c"],        shaderSrcMap["blur-fs.c"]        );
    this.programs.colorspec   = new GShader( shaderSrcMap["colorspec-vs.c"],   shaderSrcMap["colorspec-fs.c"]   );
    this.programs.normaldepth = new GShader( shaderSrcMap["normaldepth-vs.c"], shaderSrcMap["normaldepth-fs.c"] );
    this.programs.position    = new GShader( shaderSrcMap["position-vs.c"],    shaderSrcMap["position-fs.c"]    );
    this.programs.light       = new GShader( shaderSrcMap["light-vs.c"],       shaderSrcMap["light-fs.c"]       );

    for ( var key in this.programs )
    {
        this.programs[key].bindToContext(gl);
    }
};

GRenderDeferredStrategy.prototype.drawScreenBuffer = function(shader)
{
    var gl = this.gl;
    
    if ( null != shader.uniforms.mapKd)
    {
        gl.uniform1i(shader.uniforms.mapKd, 0);
    }
 
    if ( null != shader.uniforms.mapNormal )
    {
        gl.uniform1i(shader.uniforms.mapNormal, 1);
    }
  
    if ( null != shader.uniforms.mapPosition )
    {
        gl.uniform1i(shader.uniforms.mapPosition, 2);
    }
    
    if ( null != shader.uniforms.Kd )
    {
        gl.uniform4fv(shader.uniforms.Kd, [1, 1, 1, 1]);
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.screen.vertBuffer);
    gl.vertexAttribPointer(shader.attributes.positionVertexAttribute, 
                           this.screen.vertBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.screen.textBuffer);
    gl.vertexAttribPointer(shader.attributes.textureVertexAttribute, 
                           this.screen.textBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.screen.indxBuffer);
	
	if ( null != shader.uniforms.hMatrixUniform )
    {
        gl.uniformMatrix3fv(shader.uniforms.hMatrixUniform, false, this.hMatrix);
    }
	
    gl.drawElements(gl.TRIANGLES, this.screen.indxBuffer.numItems, gl.UNSIGNED_SHORT, 0);
};

GRenderDeferredStrategy.prototype.initPassCmds = function()
{
    this.passes = {};
    var gl = this.gl;
    
    this.lightCamControlers = {};
    
    var colorPass = new GGeometryRenderPassCmd( this.gl, this.programs.colorspec, this.frameBuffers.color );
    var normalPass = new GGeometryRenderPassCmd( this.gl, this.programs.normaldepth, this.frameBuffers.normal );
    var positionPass = new GGeometryRenderPassCmd( this.gl, this.programs.position, this.frameBuffers.position );
    
    var ssaoPass = new GRenderPassCmd();
    ssaoPass.setDepthTestSwitch( GRENDERPASSCMD_DEPTH_TEST_SWITCH.DISABLE );
    ssaoPass.setSceneDrawMode( GRENDERPASSCMD_SCENE_DRAW_MODE.NO_GEOMETRY );
    ssaoPass.setProgram( this.programs.ssao );
    ssaoPass.setFrameBuffer( this.frameBuffers.ssao );
    ssaoPass.setScreenGeometry( this.screen );
    ssaoPass.setHRec( 0, 0, 1, 1, 0 );
    ssaoPass.bindToContext( this.gl );
    ssaoPass.addInputTexture( this.frameBuffers.color.getGTexture(),    gl.TEXTURE0 );
    ssaoPass.addInputTexture( this.frameBuffers.normal.getGTexture(),   gl.TEXTURE1 );
    ssaoPass.addInputTexture( this.frameBuffers.position.getGTexture(), gl.TEXTURE2 );
   
    
    var ssaoBPass = new GRenderPassCmd();
    ssaoBPass.setSceneDrawMode( GRENDERPASSCMD_SCENE_DRAW_MODE.NO_GEOMETRY );
    ssaoBPass.setProgram( this.programs.blur );
    ssaoBPass.setFrameBuffer( this.frameBuffers.ssaoBlur );
    ssaoBPass.setScreenGeometry( this.screen );
    ssaoBPass.setHRec( 0, 0, 1, 1, 0 );
    ssaoBPass.bindToContext( this.gl );
    ssaoBPass.addInputTexture( this.frameBuffers.ssao.getGTexture(), gl.TEXTURE0 );
   
    
    var clearShadowmapPong = new GRenderPassClearCmd();
    clearShadowmapPong.setFrameBuffer( this.frameBuffers.shadowmapPong );
    clearShadowmapPong.bindToContext( this.gl );
    
    
    var leftCtrl = new GLightBasedCamCtrl();
    leftCtrl.bindToContext( this.gl );
    leftCtrl.setUp( 0, 1, 0 );
    leftCtrl.setLookAtDir( -1, 0, 0 );
    this.lightCamControlers.left = leftCtrl;
    var normalLSource = new GCustomCamGeometryRenderPassCmd( this.gl, this.programs.normaldepth, this.frameBuffers.lightNormal, leftCtrl );
   
    
    var shadowmapPassL = new GRenderPassCmd();
    shadowmapPassL.setSceneDrawMode( GRENDERPASSCMD_SCENE_DRAW_MODE.LIGHTS_ONLY );
    shadowmapPassL.setDepthTestSwitch( GRENDERPASSCMD_DEPTH_TEST_SWITCH.DISABLE );
    shadowmapPassL.setLightCamera( leftCtrl.getCamera() );
    shadowmapPassL.setProgram( this.programs.shadowmap );
    shadowmapPassL.setFrameBuffer( this.frameBuffers.shadowmap );
    shadowmapPassL.setScreenGeometry( this.screen );
    shadowmapPassL.setHRec( 0, 0, 1, 1, 0 );
    shadowmapPassL.bindToContext( this.gl );
    shadowmapPassL.addInputTexture( this.frameBuffers.position.getGTexture(),      gl.TEXTURE0 );
    shadowmapPassL.addInputTexture( this.frameBuffers.lightNormal.getGTexture(),   gl.TEXTURE1 );
    shadowmapPassL.addInputTexture( this.frameBuffers.shadowmapPong.getGTexture(), gl.TEXTURE2 );
    
    
    var rightCtrl = new GLightBasedCamCtrl();
    rightCtrl.bindToContext( this.gl );
    rightCtrl.setUp( 0, 1, 0 );
    rightCtrl.setLookAtDir( 1, 0, 0 );
    this.lightCamControlers.right = rightCtrl;
    var normalRSource = new GCustomCamGeometryRenderPassCmd( this.gl, this.programs.normaldepth, this.frameBuffers.lightNormal, rightCtrl );
  
    
    var shadowmapPassR = new GRenderPassCmd();
    shadowmapPassR.setSceneDrawMode( GRENDERPASSCMD_SCENE_DRAW_MODE.LIGHTS_ONLY );
    shadowmapPassR.setDepthTestSwitch( GRENDERPASSCMD_DEPTH_TEST_SWITCH.DISABLE );
    shadowmapPassR.setLightCamera( rightCtrl.getCamera() );
    shadowmapPassR.setProgram( this.programs.shadowmap );
    shadowmapPassR.setFrameBuffer( this.frameBuffers.shadowmapPong );
    shadowmapPassR.setScreenGeometry( this.screen );
    shadowmapPassR.setHRec( 0, 0, 1, 1, 0 );
    shadowmapPassR.bindToContext( this.gl );
    shadowmapPassR.addInputTexture( this.frameBuffers.position.getGTexture(),    gl.TEXTURE0 );
    shadowmapPassR.addInputTexture( this.frameBuffers.lightNormal.getGTexture(), gl.TEXTURE1 );
    shadowmapPassR.addInputTexture( this.frameBuffers.shadowmap.getGTexture(),   gl.TEXTURE2 );
   
    
    ////
    
    var frontCtrl = new GLightBasedCamCtrl();
    frontCtrl.bindToContext( this.gl );
    frontCtrl.setUp( 0, 1, 0 );
    frontCtrl.setLookAtDir( 0, 0, 1 );
    this.lightCamControlers.front = frontCtrl;
    var normalFSource = new GCustomCamGeometryRenderPassCmd( this.gl, this.programs.normaldepth, this.frameBuffers.lightNormal, frontCtrl );
    
    
    var shadowmapPassF = new GRenderPassCmd();
    shadowmapPassF.setSceneDrawMode( GRENDERPASSCMD_SCENE_DRAW_MODE.LIGHTS_ONLY );
    shadowmapPassF.setDepthTestSwitch( GRENDERPASSCMD_DEPTH_TEST_SWITCH.DISABLE );
    shadowmapPassF.setLightCamera( frontCtrl.getCamera() );
    shadowmapPassF.setProgram( this.programs.shadowmap );
    shadowmapPassF.setFrameBuffer( this.frameBuffers.shadowmap );
    shadowmapPassF.setScreenGeometry( this.screen );
    shadowmapPassF.setHRec( 0, 0, 1, 1, 0 );
    shadowmapPassF.bindToContext( this.gl );
    shadowmapPassF.addInputTexture( this.frameBuffers.position.getGTexture(),      gl.TEXTURE0 );
    shadowmapPassF.addInputTexture( this.frameBuffers.lightNormal.getGTexture(),   gl.TEXTURE1 );
    shadowmapPassF.addInputTexture( this.frameBuffers.shadowmapPong.getGTexture(), gl.TEXTURE2 );
 
    
    var backCtrl = new GLightBasedCamCtrl();
    backCtrl.bindToContext( this.gl );
    backCtrl.setUp( 0, 1, 0 );
    backCtrl.setLookAtDir( 0, 0, -1 );
    this.lightCamControlers.back = backCtrl;
    var normalBSource = new GCustomCamGeometryRenderPassCmd( this.gl, this.programs.normaldepth, this.frameBuffers.lightNormal, backCtrl );
  
    
    var shadowmapPassB = new GRenderPassCmd();
    shadowmapPassB.setSceneDrawMode( GRENDERPASSCMD_SCENE_DRAW_MODE.LIGHTS_ONLY );
    shadowmapPassB.setDepthTestSwitch( GRENDERPASSCMD_DEPTH_TEST_SWITCH.DISABLE );
    shadowmapPassB.setLightCamera( backCtrl.getCamera() );
    shadowmapPassB.setProgram( this.programs.shadowmap );
    shadowmapPassB.setFrameBuffer( this.frameBuffers.shadowmapPong );
    shadowmapPassB.setScreenGeometry( this.screen );
    shadowmapPassB.setHRec( 0, 0, 1, 1, 0 );
    shadowmapPassB.bindToContext( this.gl );
    shadowmapPassB.addInputTexture( this.frameBuffers.position.getGTexture(),    gl.TEXTURE0 );
    shadowmapPassB.addInputTexture( this.frameBuffers.lightNormal.getGTexture(), gl.TEXTURE1 );
    shadowmapPassB.addInputTexture( this.frameBuffers.shadowmap.getGTexture(),   gl.TEXTURE2 );
   
    
    ////
    
    var upCtrl = new GLightBasedCamCtrl();
    upCtrl.bindToContext( this.gl );
    upCtrl.setUp( 1, 0, 0 );
    upCtrl.setLookAtDir( 0, 1, 0 );
    this.lightCamControlers.up = upCtrl;
    var normalUSource = new GCustomCamGeometryRenderPassCmd( this.gl, this.programs.normaldepth, this.frameBuffers.lightNormal, upCtrl );
   
    
    var shadowmapPassU = new GRenderPassCmd();
    shadowmapPassU.setSceneDrawMode( GRENDERPASSCMD_SCENE_DRAW_MODE.LIGHTS_ONLY );
    shadowmapPassU.setDepthTestSwitch( GRENDERPASSCMD_DEPTH_TEST_SWITCH.DISABLE );
    shadowmapPassU.setLightCamera( upCtrl.getCamera() );
    shadowmapPassU.setProgram( this.programs.shadowmap );
    shadowmapPassU.setFrameBuffer( this.frameBuffers.shadowmap );
    shadowmapPassU.setScreenGeometry( this.screen );
    shadowmapPassU.setHRec( 0, 0, 1, 1, 0 );
    shadowmapPassU.bindToContext( this.gl );
    shadowmapPassU.addInputTexture( this.frameBuffers.position.getGTexture(),       gl.TEXTURE0 );
    shadowmapPassU.addInputTexture( this.frameBuffers.lightNormal.getGTexture(),    gl.TEXTURE1 );
    shadowmapPassU.addInputTexture( this.frameBuffers.shadowmapPong.getGTexture(),  gl.TEXTURE2 );
   
    
    var downCtrl = new GLightBasedCamCtrl();
    downCtrl.bindToContext( this.gl );
    downCtrl.setUp( 1, 0, 0 );
    downCtrl.setLookAtDir( 0, -1, 0 );
    this.lightCamControlers.down = downCtrl;
    var normalDSource = new GCustomCamGeometryRenderPassCmd( this.gl, this.programs.normaldepth, this.frameBuffers.lightNormal, downCtrl );
 
    
    var shadowmapPassD = new GRenderPassCmd();
    shadowmapPassD.setSceneDrawMode( GRENDERPASSCMD_SCENE_DRAW_MODE.LIGHTS_ONLY );
    shadowmapPassD.setDepthTestSwitch( GRENDERPASSCMD_DEPTH_TEST_SWITCH.DISABLE );
    shadowmapPassD.setLightCamera( downCtrl.getCamera() );
    shadowmapPassD.setProgram( this.programs.shadowmap );
    shadowmapPassD.setFrameBuffer( this.frameBuffers.shadowmapPong );
    shadowmapPassD.setScreenGeometry( this.screen );
    shadowmapPassD.setHRec( 0, 0, 1, 1, 0 );
    shadowmapPassD.bindToContext( this.gl );
    shadowmapPassD.addInputTexture( this.frameBuffers.position.getGTexture(),    gl.TEXTURE0 );
    shadowmapPassD.addInputTexture( this.frameBuffers.lightNormal.getGTexture(), gl.TEXTURE1 );
    shadowmapPassD.addInputTexture( this.frameBuffers.shadowmap.getGTexture(),   gl.TEXTURE2 ); 
    
    
    var clearShadowmap = new GRenderPassClearCmd();
    clearShadowmap.setFrameBuffer( this.frameBuffers.shadowmap );
    clearShadowmap.bindToContext( this.gl );
    
    var shadowBlurA = new GPostEffectRenderPassCmd( this.gl, this.programs.blur, this.frameBuffers.shadowmap, this.screen );
    shadowBlurA.setHRec( 0, 0, 1, 1, 3.14159/2 );
    shadowBlurA.addInputFrameBuffer( this.frameBuffers.shadowmapPong, gl.TEXTURE0 );
   
    var shadowBlurB = new GPostEffectRenderPassCmd( this.gl, this.programs.blur, this.frameBuffers.shadowmapPong, this.screen );
    shadowBlurB.setHRec( 0, 0, 1, 1, -3.14159/2 );
    shadowBlurB.addInputFrameBuffer( this.frameBuffers.shadowmap, gl.TEXTURE0 );
    
    var phongLightPass = new GRenderPassCmd();
    phongLightPass.setSceneDrawMode( GRENDERPASSCMD_SCENE_DRAW_MODE.LIGHTS_ONLY );
    phongLightPass.setProgram( this.programs.light );
    phongLightPass.setFrameBuffer( this.frameBuffers.phongLight );
    phongLightPass.setScreenGeometry( this.screen );
    phongLightPass.setHRec( 0, 0, 1, 1, 0 );
    phongLightPass.bindToContext( this.gl );
    phongLightPass.addInputTexture( this.frameBuffers.normal.getGTexture(),        gl.TEXTURE0 );
    phongLightPass.addInputTexture( this.frameBuffers.position.getGTexture(),      gl.TEXTURE1 );
    phongLightPass.addInputTexture( this.frameBuffers.shadowmapPong.getGTexture(), gl.TEXTURE2 );
    
    
    var cmds = [];
    
    cmds.push( normalPass );
    cmds.push( positionPass );
    cmds.push( colorPass );
    
    cmds.push( clearShadowmapPong );
    
    cmds.push( normalLSource );
    cmds.push( shadowmapPassL );
    cmds.push( normalRSource );
    cmds.push( shadowmapPassR );
    
    cmds.push( normalFSource );
    cmds.push( shadowmapPassF );
    cmds.push( normalBSource );
    cmds.push( shadowmapPassB );
    
    cmds.push( normalUSource );
    cmds.push( shadowmapPassU );
    cmds.push( normalDSource );
    cmds.push( shadowmapPassD );
    
    cmds.push( clearShadowmap );
    cmds.push( shadowBlurA );
    cmds.push( shadowBlurB );
    
    cmds.push( phongLightPass );
     
    this.passCmds = cmds;
};

GRenderDeferredStrategy.prototype.draw = function ( scene, hud )
{
    var gl = this.gl;
    gl.disable(gl.BLEND);
    
    for ( var key in this.lightCamControlers )
    {
        this.lightCamControlers[key].update( scene );
    }
  
    for (var i = 0; i < this.passCmds.length; ++i)
    {
        this.passCmds[i].run( scene );
    }
    
    // HUD
    this.gl.disable( this.gl.DEPTH_TEST );
    this.programs.fullScr.activate(); 
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    
    this.frameBuffers.phongLight.bindTexture(gl.TEXTURE0, "color");
    this.setHRec(0, 0, 1, 1);
    this.drawScreenBuffer(this.programs.fullScr); 
    
    /*this.frameBuffers.prePass.bindTexture(gl.TEXTURE0, "depthRGBTexture");
    this.setHRec(-0.125+0.75, 0.125-0.75, 0.125, 0.125);
    this.drawScreenBuffer(this.fullScreenProgram);*/
    
    /*this.frameBuffers.color.bindTexture(gl.TEXTURE0, "color");
    this.setHRec(0.125+0.75, 0.125-0.75, 0.125, 0.125);
    this.drawScreenBuffer(this.programs.fullScr);*/
    /*this.frameBuffers.lightNormal.bindTexture(gl.TEXTURE0, "color");  
    this.setHRec(-0.125+0.75, -0.125-0.75, 0.125, 0.125);
    this.drawScreenBuffer(this.programs.fullScr); */
    /*this.frameBuffers.position.bindTexture(gl.TEXTURE0, "color");
    this.setHRec(0.125+0.75, -0.125-0.75, 0.125, 0.125);
    this.drawScreenBuffer(this.programs.fullScr);*/
    
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
       	
    if (hud != undefined)
    {
        hud.draw(this.programs.fullScr);
    }
    this.programs.fullScr.deactivate();
};

GRenderDeferredStrategy.prototype.setHRec = function( x, y, width, height )
{
	// the values passed in are meant to be between 0 and 1
	// currently there are no plans to add debug assertions
    mat3.identity(this.hMatrix);
	mat3.translate(this.hMatrix, this.hMatrix, [x, y]);
	mat3.scale(this.hMatrix,this.hMatrix, [width, height]);  
}

GRenderDeferredStrategy.prototype.initTextureFramebuffer = function()
{
    var gl = this.gl;
    

    var tf = gl.getExtension("OES_texture_float");
    var tfl = null;//gl.getExtension("OES_texture_float_linear"); // turning this off for now... its running better and no image difference
    var dt = gl.getExtension("WEBGL_depth_texture");
    
    var floatTexFilter = (tfl != null)?gl.LINEAR:gl.NEAREST;
    
    var texCfg = 
    {
        filter: gl.LINEAR,
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
        attachment: gl.COLOR_ATTACHMENT0,
        name: "color"
    };
    
    var texCfgFloat = 
    {
        filter: floatTexFilter,
        format: gl.RGBA,
        type: gl.FLOAT,
        attachment: gl.COLOR_ATTACHMENT0,
        name: "color"
    };
    
   
    
    var frameBuffer = new GFrameBuffer({ gl: this.gl, width: 256, height: 256 });
    frameBuffer.addBufferTexture(texCfg);
    frameBuffer.complete();
   
    this.frameBuffers = 
    {
        ssao: frameBuffer
    };
    
    frameBuffer = new GFrameBuffer({ gl: this.gl, width: 256, height: 256 });
    frameBuffer.addBufferTexture(texCfg);
    frameBuffer.complete();
    this.frameBuffers.ssaoBlur = frameBuffer;
    
    frameBuffer = new GFrameBuffer({ gl: this.gl, width: 256, height: 256 });
    frameBuffer.addBufferTexture(texCfg);
    frameBuffer.complete();
    this.frameBuffers.shadowmap = frameBuffer;
    
    frameBuffer = new GFrameBuffer({ gl: this.gl, width: 1024, height: 1024 });
    frameBuffer.addBufferTexture(texCfg);
    frameBuffer.complete();
    this.frameBuffers.color = frameBuffer;
    
    frameBuffer = new GFrameBuffer({ gl: this.gl, width: 1024, height: 1024 });
    frameBuffer.addBufferTexture(texCfgFloat);
    frameBuffer.complete();
    this.frameBuffers.normal = frameBuffer;
    
    frameBuffer = new GFrameBuffer({ gl: this.gl, width: 1024, height: 1024 });
    frameBuffer.addBufferTexture(texCfgFloat);
    frameBuffer.complete();
    this.frameBuffers.position = frameBuffer;
    
    frameBuffer = new GFrameBuffer({ gl: this.gl, width: 512, height: 512 });
    frameBuffer.addBufferTexture(texCfgFloat);
    frameBuffer.complete();
    this.frameBuffers.lightNormal = frameBuffer;
    
    frameBuffer = new GFrameBuffer({ gl: this.gl, width: 256, height: 256 });
    frameBuffer.addBufferTexture(texCfg);
    frameBuffer.complete();
    this.frameBuffers.shadowmapPong = frameBuffer;
    
    frameBuffer = new GFrameBuffer({ gl: this.gl, width: 1024, height: 1024 });
    frameBuffer.addBufferTexture(texCfgFloat);
    frameBuffer.complete();
    this.frameBuffers.phongLight = frameBuffer;
};



