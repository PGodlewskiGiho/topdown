/* puddle-water-sim.js — WebGL2 shallow-water ripple library for canvas puddles (MIT) */
(function(global){
"use strict";

const VS=`#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main(){ v_uv=a_pos*0.5+0.5; gl_Position=vec4(a_pos,0.0,1.0); }`;

const DEC=`float dec(float r){ return (r-0.5)*2.0; }
float enc(float h){ return clamp(h*0.5+0.5,0.0,1.0); }`;

const SIM_FS=`#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_prev;
uniform sampler2D u_curr;
uniform vec2 u_texel;
out vec4 outColor;
${DEC}
void main(){
  float cur=dec(texture(u_curr,v_uv).r);
  float prev=dec(texture(u_prev,v_uv).r);
  float n=dec(texture(u_curr,v_uv+vec2(0.0,u_texel.y)).r);
  float s=dec(texture(u_curr,v_uv-vec2(0.0,u_texel.y)).r);
  float e=dec(texture(u_curr,v_uv+vec2(u_texel.x,0.0)).r);
  float w=dec(texture(u_curr,v_uv-vec2(u_texel.x,0.0)).r);
  float nv=(n+s+e+w)*0.5-prev;
  nv*=0.991;
  outColor=vec4(enc(nv),0.0,0.0,1.0);
}`;

const SPLASH_FS=`#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_curr;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_amp;
out vec4 outColor;
${DEC}
void main(){
  float cur=dec(texture(u_curr,v_uv).r);
  float d=length(v_uv-u_center);
  float m=exp(-(d*d)/(u_radius*u_radius*0.42))*u_amp;
  outColor=vec4(enc(cur+m),0.0,0.0,1.0);
}`;

const RENDER_FS=`#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_height;
uniform vec2 u_texel;
uniform float u_time;
uniform float u_night;
uniform vec3 u_tint;
out vec4 outColor;
${DEC}
void main(){
  float h=dec(texture(u_height,v_uv).r);
  float hx=dec(texture(u_height,v_uv+vec2(u_texel.x,0.0)).r)-dec(texture(u_height,v_uv-vec2(u_texel.x,0.0)).r);
  float hy=dec(texture(u_height,v_uv+vec2(0.0,u_texel.y)).r)-dec(texture(u_height,v_uv-vec2(0.0,u_texel.y)).r);
  vec3 n=normalize(vec3(-hx*3.2,-hy*3.2,1.0));
  vec3 light=normalize(vec3(0.28,0.52,0.82));
  float spec=pow(max(dot(n,light),0.0),56.0);
  float fres=pow(1.0-max(n.z,0.0),3.0);
  vec3 deep=mix(vec3(0.10,0.20,0.30),vec3(0.04,0.07,0.12),u_night);
  vec3 shallow=mix(vec3(0.40,0.62,0.80),vec3(0.14,0.20,0.30),u_night);
  vec3 base=mix(deep,shallow,0.50+h*0.55);
  base=mix(base,u_tint,0.20);
  vec3 col=base;
  col+=vec3(0.75,0.88,1.0)*spec*1.0;
  col+=vec3(0.52,0.68,0.84)*fres*0.45;
  float caust=sin(u_time*4.1+v_uv.x*38.0+v_uv.y*31.0)*sin(u_time*2.7-v_uv.x*22.0+v_uv.y*27.0);
  col+=vec3(0.20,0.30,0.38)*caust*0.04;
  float edge=smoothstep(0.0,0.16,v_uv.x)*smoothstep(0.0,0.16,1.0-v_uv.x)*smoothstep(0.0,0.16,v_uv.y)*smoothstep(0.0,0.16,1.0-v_uv.y);
  outColor=vec4(col,0.92*edge);
}`;

function clamp(v,a,b){ return v<a?a:v>b?b:v; }

function compile(gl,type,src){
  const sh=gl.createShader(type);
  gl.shaderSource(sh,src); gl.compileShader(sh);
  if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)||"shader");
  return sh;
}
function link(gl,vs,fs){
  const p=gl.createProgram();
  gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,vs));
  gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,fs));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)||"link");
  return p;
}

class PuddleWaterSim{
  constructor(opts={}){
    this.size=opts.size||192;
    this.canvas=document.createElement("canvas");
    this.canvas.width=this.size;
    this.canvas.height=this.size;
    this.ok=false;
    this.t=0;
    this._night=0.35;
    this._tint=[0.42,0.58,0.72];
    this._splashQ=[];
    const gl=this.canvas.getContext("webgl2",{alpha:true,premultipliedAlpha:false,antialias:false});
    if(!gl) return;
    this.gl=gl;
    try{ this._init(gl); this.ok=true; }
    catch(e){ console.warn("PuddleWaterSim init failed",e); }
  }

  _init(gl){
    const quad=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,quad);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    this._quad=quad;

    this._sim=link(gl,VS,SIM_FS);
    this._splash=link(gl,VS,SPLASH_FS);
    this._render=link(gl,VS,RENDER_FS);
    this._loc={
      sim:{prev:gl.getUniformLocation(this._sim,"u_prev"),cur:gl.getUniformLocation(this._sim,"u_curr"),texel:gl.getUniformLocation(this._sim,"u_texel")},
      splash:{cur:gl.getUniformLocation(this._splash,"u_curr"),center:gl.getUniformLocation(this._splash,"u_center"),radius:gl.getUniformLocation(this._splash,"u_radius"),amp:gl.getUniformLocation(this._splash,"u_amp")},
      render:{height:gl.getUniformLocation(this._render,"u_height"),texel:gl.getUniformLocation(this._render,"u_texel"),time:gl.getUniformLocation(this._render,"u_time"),night:gl.getUniformLocation(this._render,"u_night"),tint:gl.getUniformLocation(this._render,"u_tint")},
    };

    this._fb=[this._mkTex(gl),this._mkTex(gl)];
    this._ping=0;
    for(const f of this._fb){
      gl.bindFramebuffer(gl.FRAMEBUFFER,f.fb);
      gl.clearColor(0.5,0,0,1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  }

  _mkTex(gl){
    const tex=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const fb=gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,this.size,this.size,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    return {tex,fb};
  }

  _bindQuad(prog){
    const gl=this.gl, loc=gl.getAttribLocation(prog,"a_pos");
    gl.bindBuffer(gl.ARRAY_BUFFER,this._quad);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  }

  _draw(prog){
    const gl=this.gl;
    gl.useProgram(prog);
    this._bindQuad(prog);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }

  setNight(n){ this._night=clamp(n,0,1); }
  setTint(r,g,b){ this._tint=[r,g,b]; }

  splash(u,v,amp,radius){
    if(!this.ok) return;
    this._splashQ.push({u:clamp(u,0.04,0.96),v:clamp(v,0.04,0.96),amp:amp||0.14,radius:radius||0.05});
  }

  splashAtWorld(wx,wy,amp){
    const u=((wx*0.013+this.t*0.07)%1+1)%1;
    const v=((wy*0.011-this.t*0.05)%1+1)%1;
    this.splash(u,v,amp||0.10,0.035+Math.random()*0.03);
  }

  randomRipple(){ this.splash(0.18+Math.random()*0.64,0.18+Math.random()*0.64,0.08+Math.random()*0.10,0.035+Math.random()*0.04); }

  step(dt){
    if(!this.ok) return;
    this.t+=dt;
    const gl=this.gl, S=this.size, texel=[1/S,1/S];
    const cur=this._ping, prev=1-cur, next=1-prev;
    const curT=this._fb[cur].tex, prevT=this._fb[prev].tex;

    gl.viewport(0,0,S,S);

    for(const s of this._splashQ){
      gl.bindFramebuffer(gl.FRAMEBUFFER,this._fb[cur].fb);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,curT);
      gl.useProgram(this._splash);
      gl.uniform1i(this._loc.splash.cur,0);
      gl.uniform2f(this._loc.splash.center,s.u,s.v);
      gl.uniform1f(this._loc.splash.radius,s.radius);
      gl.uniform1f(this._loc.splash.amp,s.amp);
      this._draw(this._splash);
    }
    this._splashQ.length=0;

    gl.bindFramebuffer(gl.FRAMEBUFFER,this._fb[next].fb);
    gl.useProgram(this._sim);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,prevT);
    gl.uniform1i(this._loc.sim.prev,0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,curT);
    gl.uniform1i(this._loc.sim.cur,1);
    gl.uniform2fv(this._loc.sim.texel,texel);
    this._draw(this._sim);
    this._ping=next;

    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.useProgram(this._render);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,this._fb[this._ping].tex);
    gl.uniform1i(this._loc.render.height,0);
    gl.uniform2fv(this._loc.render.texel,texel);
    gl.uniform1f(this._loc.render.time,this.t);
    gl.uniform1f(this._loc.render.night,this._night);
    gl.uniform3fv(this._loc.render.tint,this._tint);
    this._draw(this._render);
  }
}

global.PuddleWaterSim=PuddleWaterSim;
})(typeof window!=="undefined"?window:globalThis);
