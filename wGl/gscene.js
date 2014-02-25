

function GScene()
{
	var gl = undefined;
	var _children = [];
	var _eyeMvMatrix = mat4.create();
	
	var _materials = {};
	
	var camera;
	
	this.bindToContext = function(gl_)
	{
		gl = gl_;
		
		camera.bindToContext(gl);
		var childCount = _children.length;
		for (var i = 0; i < childCount; ++i)
		{
			_children[i].bindToContext(gl);
		}
		
		for (var key in _materials)
		{
			_materials[key].bindToContext(gl);
		}
	}
	
	this.draw = function()
	{
		camera.draw(_eyeMvMatrix);
		
	    var childCount = _children.length;
		for (var i = 0; i < childCount; ++i)
		{
			_children[i].draw(_eyeMvMatrix, _materials);
		}
	}
	
	this.addMaterial = function( mat )
	{
		mat.bindToContext(gl);
		_materials[mat.getName()] = mat;
	}
	
	this.addChild = function(child)
	{
		child.bindToContext(gl);
		_children.push(child);
	}
	
	this.setCamera = function(camera_)
	{
		camera = camera_;
	}
}

function GCamera()
{
    var gl;
	var pMatrix = mat4.create();
	
	var camMatrix = mat4.create();
	
	var rotMat  = mat4.create();
	var tranMat = mat4.create();
	
	var eye = vec3.fromValues(0, 0, 0);
	var up = vec3.fromValues(0, 1, 0);
	var lookAt = vec3.fromValues(0, 0, 1);
	

	
	var mvMatrix = mat4.create();
	mat4.identity(mvMatrix);
	
	this.draw = function(ouMvMatrix)
	{
		updateMatrices();
		
		mat4.copy(ouMvMatrix, mvMatrix);
		
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
		
		mat4.multiply(camMatrix, pMatrix, mvMatrix);
		
		gl.uniformMatrix4fv(gl.shaderProgram.pMatrixUniform, false, pMatrix);
	}
	
	this.bindToContext = function(gl_)
	{
		gl = gl_;
	}
	
	this.setEye = function (x, y, z)
	{
		eye[0] = x; eye[1] = y; eye[2] = z;
	}
    
	this.getEye = function (outA)
	{
        outA[0] = eye[0];
        outA[1] = eye[1];
        outA[2] = eye[2];
	}
	
	this.setUp = function (x, y, z)
	{
		up[0] = x; up[1] = y; up[2] = z;
	}
	
	this.getUp = function (outA)
	{
	    outA[0] = up[0];
	    outA[1] = up[1];
	    outA[2] = up[2];
	}
	
	this.setLookAt = function (x, y, z)
	{
		lookAt[0] = x; lookAt[1] = y; lookAt[2] = z;
	}
	
	this.getLookAt = function (outA)
	{
	    outA[0] = lookAt[0];
	    outA[1] = lookAt[1];
	    outA[2] = lookAt[2];
	}
	
	function updateMatrices()
	{ 
		mat4.lookAt(mvMatrix, eye, lookAt, up);
		
		var i = 0;
	}
}