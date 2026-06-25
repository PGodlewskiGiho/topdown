/* TOPDOWN CITY — 00-game.js */
/* System registry: plug-in updates, rendering layers, lot hooks */

const Game = {
  systems: [],
  _byId: new Map(),

  /** @param {{id:string, order?:number, init?:Function, update?:Function, updateAlways?:boolean, onLot?:(lot,i,j)=>void, drawAfterRoads?:(ox,oy)=>void, drawAfterBuildings?:(ox,oy)=>void, drawActors?:(ox,oy)=>void, drawWorldOverlay?:(ox,oy)=>void, drawMap?:(mctx,opts)=>void}} spec */
  register(spec){
    if(!spec||!spec.id){ console.warn("Game.register: brak id"); return; }
    if(this._byId.has(spec.id)) return;
    const sys=Object.assign({order:50}, spec);
    this.systems.push(sys);
    this._byId.set(spec.id, sys);
    this.systems.sort((a,b)=>(a.order|0)-(b.order|0));
    if(sys.init) sys.init();
  },

  get(id){ return this._byId.get(id); },

  onLot(lot,i,j){
    for(const s of this.systems) if(s.onLot) s.onLot(lot,i,j);
  },

  /** Extension updates (core loop stays in 20-main.js). */
  update(dt, paused){
    for(const s of this.systems){
      if(s.updateAlways && s.update) s.update(dt, paused);
      else if(!paused && s.update) s.update(dt, paused);
    }
  },

  drawAfterRoads(ox,oy){
    for(const s of this.systems) if(s.drawAfterRoads) s.drawAfterRoads(ox,oy);
  },

  drawAfterBuildings(ox,oy){
    for(const s of this.systems) if(s.drawAfterBuildings) s.drawAfterBuildings(ox,oy);
  },

  /** @param {"beforeTraffic"|"afterTraffic"} [layer] */
  drawActors(ox,oy, layer="beforeTraffic"){
    for(const s of this.systems){
      const L=s.actorLayer||"beforeTraffic";
      if(s.drawActors && L===layer) s.drawActors(ox,oy);
    }
  },

  drawWorldOverlay(ox,oy){
    for(const s of this.systems) if(s.drawWorldOverlay) s.drawWorldOverlay(ox,oy);
  },

  drawMap(mctx, opts){
    for(const s of this.systems) if(s.drawMap) s.drawMap(mctx, opts);
  },
};
