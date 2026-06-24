/* TOPDOWN CITY — 30-npc-look.js */
/* Diverse NPC appearance by biome + archetype */

const NPC_PANTS={
  city:["#2a3444","#1a2430","#3a3a48","#222830","#4a4038","#1c2838"],
  forest:["#283828","#3a4830","#4a4030","#2a3828","#5a5840","#364830"],
  desert:["#6a5840","#8a7858","#5a4838","#7a6848","#4a4030"],
  sea:["#2a4868","#3a5878","#284858","#1a3848","#5a6878","#386878"],
};
const NPC_SHOES=["#1a1a20","#2a2420","#3a3028","#4a4038","#5a5048","#8a6838","#e8e8e8","#283848"];
const NPC_SKIN=["#f4cda3","#e8b888","#d49a6a","#b87a48","#92602f","#6b4528","#4a3018"];
const NPC_HAIR=["#2a1c10","#4a3018","#6a4a22","#9a7838","#cdbb88","#6a6a6a","#141414","#b04a2a"];
const NPC_HATCOL=["#b5483b","#3f5b86","#d8a93f","#3f7d5a","#222222","#e0e0e0","#7a4d6b"];
const SHIRT_DARK=["#3a3540","#2e3a44","#43352e","#33403a","#4a3340"];

const NPC_ARCH={
  city_casual:{
    shirts:["#3a6ea5","#4f7d4a","#7a5fa0","#b59a3f","#a85a7a","#2f8a7a","#c0683a","#d0c0a0","#386a8a","#e87858","#58a8c8"],
    pants:NPC_PANTS.city, body:["male","female","female","male"], hairStyle:["short","long","ponytail","short"],
    shirtStyle:["tee","tee","hoodie","jacket"], hat:[null,null,"cap","beanie"], accessory:[null,null,"glasses"], prop:[null,null,"bag"],
    beard:["none","none","stubble"], speed:[28,44],
  },
  city_worker:{
    shirts:["#5a5e66","#4a5058","#6a5840","#3a4848","#7a6848","#455060"],
    pants:["#2a2830","#1a2430","#3a3a40","#283038"], body:["male","hardy","male"], hairStyle:["short","short","bald"],
    shirtStyle:["vest","jacket","tee"], hat:["cap",null,"beanie"], accessory:[null], prop:[null,"briefcase"],
    beard:["none","stubble","full"], speed:[24,38],
  },
  city_business:{
    shirts:["#2a3448","#384858","#3a4048","#2a3848","#4a5060","#1a2838"],
    pants:["#1a2030","#222830","#2a2838","#181c28"], body:["male","female","male"], hairStyle:["short","short","ponytail"],
    shirtStyle:["jacket","vest","jacket"], hat:[null,null], accessory:[null,"glasses","glasses"], prop:["briefcase",null],
    beard:["none","stubble"], speed:[22,34],
  },
  city_elder:{
    shirts:["#8a8078","#9a9088","#7a7068","#a89888","#6a6860"], pants:["#4a4038","#3a3830","#5a5048"],
    body:["hardy","male","female"], hairStyle:["short","bald","short"], shirtStyle:["jacket","tee","coat"],
    hat:["beanie","cap",null], accessory:[null,"glasses"], prop:[null,"bag"], beard:["none","stubble","full"],
    hair:["#6a6a6a","#9a9088","#cdbb88","#4a4038"], speed:[18,28],
  },
  city_teen:{
    shirts:["#e05040","#48a848","#a848a8","#e8a030","#38a8d8","#d84878","#88c848"],
    pants:["#2a2838","#1a2030","#283848","#382838"], body:["male","female","female","male"],
    hairStyle:["long","ponytail","short","short"], shirtStyle:["hoodie","tee","hoodie"], hat:["cap","beanie",null],
    accessory:[null], prop:["backpack",null], beard:["none"], speed:[32,52],
  },
  city_punk:{
    shirts:["#1a1a1a","#3a1838","#283828","#381818","#2a2040"], pants:["#1a1a20","#201820","#181828"],
    body:["male","female","male"], hairStyle:["long","short","ponytail"], shirtStyle:["vest","tee","jacket"],
    hat:[null,"beanie"], accessory:[null], prop:[null], beard:["stubble","none"],
    hair:["#b04a2a","#6a6a6a","#141414","#8a38c8","#e8e8e8"], speed:[30,48],
  },
  forest_hiker:{
    shirts:["#4a6840","#6a7850","#8a6848","#3a5838","#5a7048","#a87848"],
    pants:NPC_PANTS.forest, body:["male","female","hardy"], hairStyle:["short","ponytail","long"],
    shirtStyle:["jacket","hoodie","vest"], hat:["hood","cap","beanie"], accessory:["scarf",null],
    prop:["backpack","backpack","stick"], beard:["stubble","none","full"], speed:[24,40],
  },
  forest_local:{
    shirts:["#5a6848","#6a5840","#788860","#4a5038","#8a7858"], pants:NPC_PANTS.forest,
    body:["hardy","male","female"], hairStyle:["short","short","bald"], shirtStyle:["vest","jacket","tee"],
    hat:["cap","beanie",null], accessory:[null], prop:[null,"stick"], beard:["full","stubble","none"],
    speed:[22,36],
  },
  desert_nomad:{
    shirts:["#c8a868","#d8b878","#b89858","#e8c888","#a88848"], pants:NPC_PANTS.desert,
    body:["male","female","hardy"], hairStyle:["short","long","ponytail"], shirtStyle:["tee","coat","vest"],
    hat:["cap","hood",null], accessory:["scarf","scarf",null], prop:[null,"bag"], beard:["stubble","full","none"],
    speed:[26,42],
  },
  desert_worker:{
    shirts:["#a89068","#988058","#b8a078","#887048"], pants:NPC_PANTS.desert, body:["male","hardy","male"],
    hairStyle:["short","bald","short"], shirtStyle:["vest","tee","jacket"], hat:["cap","cap",null],
    accessory:[null], prop:[null,"briefcase"], beard:["stubble","none"], speed:[24,38],
  },
  sea_tourist:{
    shirts:["#e87858","#48a8c8","#f0c848","#58c8a8","#e8a838","#88b8e8","#ff9878","#ffffff"], pants:NPC_PANTS.sea,
    body:["male","female","female"], hairStyle:["short","long","ponytail"], shirtStyle:["tee","tee","hoodie"],
    hat:[null,"cap",null], accessory:["glasses",null], prop:[null,"bag","cooler"], beard:["none"], speed:[26,40],
    beachWear:true, beachUmbrella:true,
  },
  sea_sunbather:{
    shirts:["#ff9878","#f0c848","#58c8e8","#ffffff","#e87858","#ff6890"], pants:["#e05040","#48a8c8","#f0c848","#ff6890","#58c878"],
    body:["female","male","female","male"], hairStyle:["long","ponytail","short"], shirtStyle:["tee","tee","tee"],
    hat:[null,null,"cap"], accessory:["glasses",null], prop:[null,"bag"], beard:["none"], speed:[16,28],
    beachWear:true, beachUmbrella:true, sunbather:true,
  },
  sea_swimmer:{
    shirts:["#48a8c8","#58c8e8","#88d8f8","#38a8d8"], pants:["#2868a8","#3888b8","#2088a8"],
    body:["male","female","male","female"], hairStyle:["short","ponytail","short"], shirtStyle:["tee","tee"],
    hat:[null], accessory:[null], prop:[null,"bag"], beard:["none"], speed:[28,44],
    beachWear:true,
  },
  sea_lifeguard:{
    shirts:["#e83828","#d82818","#f04838"], pants:["#c82018","#b01810"],
    body:["male","female","male"], hairStyle:["short","short","ponytail"], shirtStyle:["tee","vest"],
    hat:["cap",null], accessory:[null,"glasses"], prop:[null,"whistle"], beard:["none","stubble"], speed:[24,38],
  },
  sea_fisher:{
    shirts:["#3a5878","#486888","#2a4868","#586878"], pants:NPC_PANTS.sea, body:["male","hardy","male"],
    hairStyle:["short","bald","short"], shirtStyle:["jacket","vest","tee"], hat:["cap","beanie",null],
    accessory:[null], prop:[null,"bucket"], beard:["stubble","full","none"], speed:[20,34],
  },
  armed_thug:{
    shirts:SHIRT_DARK, pants:["#1a1820","#222028","#2a2030","#181820"], body:["male","hardy","male"],
    hairStyle:["short","bald","short"], shirtStyle:["jacket","vest","hoodie"], hat:[null,"cap","beanie"],
    accessory:[null], prop:[null], beard:["stubble","full","stubble"], speed:[30,46],
  },
};

const NPC_BIOME_POOL={
  city:[
    {id:"city_casual", w:28},{id:"city_worker", w:16},{id:"city_business", w:12},
    {id:"city_elder", w:10},{id:"city_teen", w:14},{id:"city_punk", w:6},
  ],
  forest:[
    {id:"forest_hiker", w:42},{id:"forest_local", w:30},{id:"city_casual", w:14},{id:"city_elder", w:8},
  ],
  desert:[
    {id:"desert_nomad", w:40},{id:"desert_worker", w:28},{id:"city_casual", w:16},{id:"city_elder", w:8},
  ],
  sea:[
    {id:"sea_sunbather", w:28},{id:"sea_tourist", w:26},{id:"sea_swimmer", w:18},
    {id:"sea_fisher", w:14},{id:"sea_lifeguard", w:8},{id:"city_casual", w:12},{id:"city_teen", w:8},
  ],
};

function npcPickArch(biome, armed){
  if(armed) return {id:"armed_thug", arch:NPC_ARCH.armed_thug};
  const pool=NPC_BIOME_POOL[biome]||NPC_BIOME_POOL.city;
  let roll=rng()*pool.reduce((s,e)=>s+e.w,0);
  for(const e of pool){ roll-=e.w; if(roll<=0) return {id:e.id, arch:NPC_ARCH[e.id]}; }
  return {id:"city_casual", arch:NPC_ARCH.city_casual};
}
function npcPickArchLegacy(biome, armed){ return npcPickArch(biome, armed).arch; }

function npcPickSkin(arch){
  if(arch===NPC_ARCH.city_elder) return pick(["#e8b888","#d49a6a","#c89068","#b87a48"]);
  if(arch===NPC_ARCH.desert_nomad||arch===NPC_ARCH.desert_worker) return pick(["#d49a6a","#b87a48","#92602f","#e8b888","#c89068"]);
  if(arch===NPC_ARCH.sea_tourist) return pick(["#f4cda3","#e8b888","#d49a6a","#b87a48"]);
  return pick(NPC_SKIN);
}

function rollNpcAppearance(x,y,opts){
  opts=opts||{};
  const ci=Math.floor((x-ROAD)/GAP), cj=Math.floor((y-ROAD)/GAP);
  const biome=biomeOf(ci,cj);
  const archPick=npcPickArch(biome,!!opts.armed), arch=archPick.arch, archId=archPick.id;
  const body=pick(arch.body);
  const hairStyle=pick(arch.hairStyle);
  const hairCol=arch.hair?pick(arch.hair):pick(NPC_HAIR);
  const hair=hairStyle==="bald"?null:hairCol;
  const hat=pick(arch.hat);
  const shirt=pick(arch.shirts);
  const pants=pick(arch.pants);
  const prop=pick(arch.prop);
  const propColors={
    backpack:pick(["#5a5048","#4a5840","#3a4850","#6a5848"]),
    bag:pick(["#8a6838","#a87848","#786040","#987850"]),
    briefcase:pick(["#3a3028","#2a2830","#4a4038","#283038"]),
    stick:"#6a5038", bucket:"#586878",
  };
  let beard=body==="female"?"none":pick(arch.beard);
  if(body==="female") beard="none";
  const r=body==="hardy"?11:(body==="female"?8.5:9);
  const sp=arch.speed;
  const accessory=pick(arch.accessory);
  const beachWear=!!arch.beachWear;
  let beachUmbrella=null;
  if(biome==="sea" && (arch.beachUmbrella||beachWear) && rng()<(arch.sunbather?0.78:0.52)){
    beachUmbrella=pick(typeof BEACH_UMBRELLA_COL!=="undefined"?BEACH_UMBRELLA_COL:["#e05040","#48a8c8","#f0c848","#ff6890"]);
  }
  return {
    archId:opts.armed?"armed_thug":archId,
    archetype:opts.armed?"armed_thug":archId,
    skin:npcPickSkin(arch),
    shirt, pants, shoes:pick(NPC_SHOES),
    body, hair, hairStyle,
    shirtStyle:pick(arch.shirtStyle),
    beard, hat, hatColor:pick(NPC_HATCOL),
    accessory,
    scarfColor:accessory==="scarf"?pick(["#a84838","#384858","#8a6838","#c87838","#586878"]):null,
    prop, propColor:prop?propColors[prop]:null,
    r, speed:rand(sp[0],sp[1]),
    color:shirt,
    beachWear, beachUmbrella,
    sunbather:!!arch.sunbather,
  };
}

function applyNpcLook(p, look){
  if(!look) return p;
  for(const k of ["skin","shirt","pants","shoes","body","hair","hairStyle","shirtStyle","beard","hat","hatColor","accessory","scarfColor","prop","propColor","r","speed","color","archetype","archId","beachWear","beachUmbrella","sunbather"]){
    if(look[k]!==undefined) p[k]=look[k];
  }
  return p;
}
