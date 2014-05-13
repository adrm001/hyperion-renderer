
/**
 * @constructor
 * @param {Array.<string>} Array of material arguments to use while creating this texture.
 * @param {string} Path to the location of the texture resource
 */
function GTexture( mtlargs, path ) 
{
	this.scale = vec2.fromValues(1, 1);
    this.path = path;
    this.processArgs( mtlargs );
}

/** 
 * This function handles the arguments sent to the constructor
 * @param {Array.<string>} Array of material arguments to use while creating this texture.
 */
GTexture.prototype.processArgs = function( args )
{
    if ( undefined == args ) return;
    
    var aLen = args.length;
    for (var i = 0; i < aLen; ++i)
    {
        if ( args[i] == "-s" )
        {
            this.scale[0] = parseFloat(args[++i]);
            this.scale[1] = parseFloat(args[++i]);
        }
        else
        {
            this.name = args[i];
        }
    }
};
	
/**
 * Draw the current texture
 * @param {number}
 * @param {WebGLUniformLocation|null} Uniform to the texture
 * @param {WebGLUniformLocation|null} Uniform to the scale value of the texture
 */
GTexture.prototype.draw = function(glTextureTarget, textureUniform, scaleUniform)
{    
    if (undefined != this.glTHandle &&
        undefined != glTextureTarget )
    {
        this.gl.activeTexture(glTextureTarget);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.glTHandle);
        
        if ( null != textureUniform )
        {    
            this.gl.uniform1i(textureUniform, 0);
        }
        
        if ( null != scaleUniform )
        {
            this.gl.uniform2fv(scaleUniform, this.scale);
        }
    }
}

/**
 * Stop the binding to this texture
 */
GTexture.prototype.release = function()
{
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}

/**
 * Called to bind this texture to a gl context
 * @param {WebGLRenderingContext} Context to bind to this texture
 */
GTexture.prototype.bindToContext = function( gl )
{
    this.gl = gl;
    
    this.loadTexture();
}

/**
 * Get the name for this texture
 * @return {string}
 */
GTexture.prototype.getName = function()
{
    return this.name;
}

/**
 * Start the loading process for this texture (usually from a web serever)
 */
GTexture.prototype.loadTexture = function() 
{   
    if ( undefined != this.path &&
         undefined != this.name )
    {
        this.image = new Image();
        this.image.onload = this.handleTextureLoaded.bind(this);
        this.image.src = this.path+this.name;
    }
}

/**
 * This is called as an async call whenever the image has been downloaded from the web server.
 */
GTexture.prototype.handleTextureLoaded = function() 
{
    if (this.gl !== undefined)
    {
        this.sendTextureToGl();
    }
    
    this.image.loaded = true;
}

/**
 * This function is used to send the texture data over to the GPU
 */
GTexture.prototype.sendTextureToGl = function()
{
    var gl = this.gl;
    this.glTHandle = gl.createTexture();
    
    gl.bindTexture(gl.TEXTURE_2D, this.glTHandle);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

/**
 * This is to provide an alternate construction mechanism and lets the caller set
 * the WebGLTexture value. Usually needed for frame buffer constructions
 * @param {WebGLTexture}
 */
GTexture.prototype.setTextureHandle = function( handle )
{
    this.glTHandle = handle;
};
	
