/* TOPDOWN CITY — 30-npc-look.js */
/* Diverse NPC appearance: biome archetypes + modular body parts */

const NPC_PANTS={
  city:["#2a3444","#1a2430","#3a3a48","#222830","#4a4038","#1c2838","#384050","#283038"],
  forest:["#283828","#3a4830","#4a4030","#2a3828","#5a5840","#364830","#485838"],
  desert:["#6a5840","#8a7858","#5a4838","#7a6848","#4a4030","#9a8868"],
  sea:["#2a4868","#3a5878","#284858","#1a3848","#5a6878","#386878","#1e4050"],
};
const NPC_SHOES=["#1a1a20","#2a2420","#3a3028","#4a4038","#5a5048","#8a6838","#e8e8e8","#283848","#c8a868","#f0e8d8"];
const NPC_HATCOL=["#b5483b","#3f5b86","#d8a93f","#3f7d5a","#222222","#e0e0e0","#7a4d6b","#1a2838","#c87838"];
const SHIRT_DARK=["#3a3540","#2e3a44","#43352e","#33403a","#4a3340"];

const NPC_HAIR_STYLES={
  young:["short","long","ponytail","buzz","curly","bun"],
  adult:["short","long","ponytail","bald","buzz","curly"],
  middle:["short","bald","ponytail","buzz"],
  senior:["short","bald","buzz"],
  teen:["long","ponytail","short","curly","buzz","mohawk"],
};

const NPC_ARCH={
  city_casual:{
    age:["young","young","adult","adult","adult"], build:["slim","average","average","athletic"],
    shirts:["#3a6ea5","#4f7d4a","#7a5fa0","#b59a3f","#a85a7a","#2f8a7a","#c0683a","#386a8a","#e87858","#58a8c8","#d0c0a0"],
    pants:NPC_PANTS.city, body:["male","female","female","male","male"], hairStyle:["short","long","ponytail","buzz","curly"],
    shirtStyle:["tee","tee","hoodie","jacket"], hat:[null,null,"cap","beanie"], accessory:[null,null,"glasses"], prop:[null,null,"bag"],
    beard:["none","none","stubble"], speed:[30,48],
  },
  city_worker:{
    age:["adult","adult","middle"], build:["average","stocky","athletic"],
    shirts:["#5a5e66","#4a5058","#6a5840","#3a4848","#7a6848","#455060","#788088"],
    pants:["#2a2830","#1a2430","#3a3a40","#283038"], body:["male","hardy","male"], hairStyle:["short","short","bald","buzz"],
    shirtStyle:["vest","jacket","tee"], hat:["cap",null,"beanie"], accessory:[null], prop:[null,"briefcase"],
    beard:["none","stubble","full"], speed:[24,38],
  },
  city_business:{
    age:["adult","adult","middle"], build:["slim","average","average"],
    shirts:["#2a3448","#384858","#3a4048","#2a3848","#4a5060","#1a2838","#505868"],
    pants:["#1a2030","#222830","#2a2838","#181c28"], body:["male","female","male"], hairStyle:["short","short","ponytail","buzz"],
    shirtStyle:["jacket","vest","jacket"], hat:[null,null], accessory:[null,"glasses","glasses"], prop:["briefcase",null],
    beard:["none","stubble"], speed:[22,34],
  },
  city_elder:{
    age:["senior"], build:["average","stocky"], weight:0.35,
    shirts:["#8a8078","#9a9088","#7a7068","#a89888","#6a6860"], pants:["#4a4038","#3a3830","#5a5048"],
    body:["male","female","hardy"], hairStyle:["short","bald","buzz"], shirtStyle:["jacket","tee","coat"],
    hat:["beanie","cap",null], accessory:[null,"glasses"], prop:[null,"bag"], beard:["none","stubble","full"],
    hair:["#6a6a6a","#9a9088","#cdbb88","#4a4038"], speed:[18,28],
  },
  city_teen:{
    age:["teen","teen","young"], build:["slim","slim","average"],
    shirts:["#e05040","#48a848","#a848a8","#e8a030","#38a8d8","#d84878","#88c848","#f06888"],
    pants:["#2a2838","#1a2030","#283848","#382838","#1a2830"], body:["male","female","female","male"],
    hairStyle:["long","ponytail","short","curly","buzz","mohawk"], shirtStyle:["hoodie","tee","hoodie","vest"],
    hat:["cap","beanie",null], accessory:[null], prop:["backpack",null], beard:["none"], speed:[34,56],
  },
  city_punk:{
    age:["teen","young","young"], build:["slim","average","slim"],
    shirts:["#1a1a1a","#3a1838","#283828","#381818","#2a2040","#4a1830"], pants:["#1a1a20","#201820","#181828"],
    body:["male","female","male"], hairStyle:["mohawk","long","short","ponytail"], shirtStyle:["vest","tee","jacket"],
    hat:[null,"beanie"], accessory:[null], prop:[null], beard:["stubble","none"],
    hair:["#b04a2a","#6a6a6a","#141414","#8a38c8","#e8e8e8","#38a848"], speed:[30,50],
  },
  city_jogger:{
    age:["young","adult","adult"], build:["athletic","slim","athletic"],
    shirts:["#e83838","#38a8e8","#38d878","#f0c030","#f87848","#88b8f0","#ffffff"], pants:["#1a2030","#222830","#283040","#1a2838"],
    body:["male","female","male","female"], hairStyle:["ponytail","short","buzz","bun"], shirtStyle:["tee","tee","vest"],
    hat:[null,"cap"], accessory:[null], prop:[null], beard:["none"], speed:[38,58],
  },
  city_sporty:{
    age:["young","adult","teen"], build:["athletic","athletic","average"],
    shirts:["#2868b8","#c83838","#38a848","#f0a020","#5858c8","#e85050"], pants:["#1a2430","#222830","#283848"],
    body:["male","female","male"], hairStyle:["short","buzz","ponytail"], shirtStyle:["tee","hoodie","vest"],
    hat:["cap",null], accessory:[null], prop:[null,"backpack"], beard:["none","stubble"], speed:[32,50],
  },
  city_parent:{
    age:["adult","middle","adult"], build:["average","stocky","average"],
    shirts:["#4a6888","#6a8878","#a87868","#5888a8","#887858","#c8a878"], pants:NPC_PANTS.city,
    body:["male","female","female","male"], hairStyle:["short","ponytail","long","buzz"], shirtStyle:["tee","jacket","hoodie","coat"],
    hat:[null,"cap"], accessory:[null,"glasses"], prop:[null,"bag"], beard:["none","stubble"], speed:[24,38],
  },
  city_artist:{
    age:["young","adult","young"], build:["slim","average","slim"],
    shirts:["#a84888","#48a8a8","#c8a848","#8848a8","#48c8a8","#e87898"], pants:["#2a2838","#383040","#403848","#483850"],
    body:["female","male","female"], hairStyle:["long","curly","ponytail","bun"], shirtStyle:["tee","hoodie","jacket","coat"],
    hat:[null,"beanie","cap"], accessory:["glasses",null], prop:["bag",null], beard:["none","stubble"], speed:[26,40],
  },
  city_delivery:{
    age:["young","adult"], build:["average","athletic"],
    shirts:["#e8c030","#f0a020","#d8a020","#f0d040"], pants:["#1a2030","#222830"],
    body:["male","male","hardy"], hairStyle:["short","buzz","cap"], shirtStyle:["vest","jacket","tee"],
    hat:["cap",null], accessory:[null], prop:["backpack",null], beard:["none","stubble"], speed:[34,52],
  },
  forest_hiker:{
    age:["young","adult","middle"], build:["athletic","average","stocky"],
    shirts:["#4a6840","#6a7850","#8a6848","#3a5838","#5a7048","#a87848"], pants:NPC_PANTS.forest,
    body:["male","female","hardy"], hairStyle:["short","ponytail","long","buzz"],
    shirtStyle:["jacket","hoodie","vest"], hat:["hood","cap","beanie"], accessory:["scarf",null],
    prop:["backpack","backpack","stick"], beard:["stubble","none","full"], speed:[24,42],
  },
  forest_local:{
    age:["adult","middle","middle"], build:["stocky","average","hardy"],
    shirts:["#5a6848","#6a5840","#788860","#4a5038","#8a7858"], pants:NPC_PANTS.forest,
    body:["hardy","male","female"], hairStyle:["short","short","bald","buzz"], shirtStyle:["vest","jacket","tee"],
    hat:["cap","beanie",null], accessory:[null], prop:[null,"stick"], beard:["full","stubble","none"],
    speed:[22,36],
  },
  desert_nomad:{
    age:["adult","middle","adult"], build:["average","slim","stocky"],
    shirts:["#c8a868","#d8b878","#b89858","#e8c888","#a88848"], pants:NPC_PANTS.desert,
    body:["male","female","hardy"], hairStyle:["short","long","ponytail","buzz"], shirtStyle:["tee","coat","vest"],
    hat:["cap","hood",null], accessory:["scarf","scarf",null], prop:[null,"bag"], beard:["stubble","full","none"],
    speed:[26,42],
  },
  desert_worker:{
    age:["adult","middle"], build:["stocky","athletic","average"],
    shirts:["#a89068","#988058","#b8a078","#887048"], pants:NPC_PANTS.desert, body:["male","hardy","male"],
    hairStyle:["short","bald","buzz"], shirtStyle:["vest","tee","jacket"], hat:["cap","cap",null],
    accessory:[null], prop:[null,"briefcase"], beard:["stubble","none"], speed:[24,38],
  },
  sea_tourist:{
    age:["young","adult","middle"], build:["average","slim","average"],
    shirts:["#e87858","#48a8c8","#f0c848","#58c8a8","#e8a838","#88b8e8","#f0a878"], pants:NPC_PANTS.sea,
    body:["male","female","female"], hairStyle:["short","long","ponytail","curly"], shirtStyle:["tee","tee","hoodie"],
    hat:["cap",null,"beanie"], accessory:["glasses",null], prop:[null,"bag"], beard:["none"], speed:[26,42],
  },
  sea_fisher:{
    age:["adult","middle","middle"], build:["stocky","average","hardy"],
    shirts:["#3a5878","#486888","#2a4868","#586878"], pants:NPC_PANTS.sea, body:["male","hardy","male"],
    hairStyle:["short","bald","buzz"], shirtStyle:["jacket","vest","tee"], hat:["cap","beanie",null],
    accessory:[null], prop:[null,"bucket"], beard:["stubble","full","none"], speed:[20,34],
  },
  armed_thug:{
    age:["young","adult","adult"], build:["athletic","stocky","average"],
    shirts:SHIRT_DARK, pants:["#1a1820","#222028","#2a2030","#181820"], body:["male","hardy","male"],
    hairStyle:["short","bald","buzz"], shirtStyle:["jacket","vest","hoodie"], hat:[null,"cap","beanie"],
    accessory:[null], prop:[null], beard:["stubble","full","stubble"], speed:[30,48],
  },
};

const NPC_BIOME_POOL={
  city:[
    {id:"city_casual", w:22},{id:"city_worker", w:12},{id:"city_business", w:10},
    {id:"city_teen", w:12},{id:"city_jogger", w:10},{id:"city_sporty", w:9},
    {id:"city_parent", w:10},{id:"city_artist", w:8},{id:"city_delivery", w:7},
    {id:"city_punk", w:5},{id:"city_elder", w:4},
  ],
  forest:[
    {id:"forest_hiker", w:44},{id:"forest_local", w:28},{id:"city_casual", w:14},{id:"city_jogger", w:8},{id:"city_elder", w:4},
  ],
  desert:[
    {id:"desert_nomad", w:38},{id:"desert_worker", w:26},{id:"city_casual", w:16},{id:"city_delivery", w:10},{id:"city_elder", w:4},
  ],
  sea:[
    {id:"sea_tourist", w:36},{id:"sea_fisher", w:24},{id:"city_casual", w:18},{id:"city_teen", w:10},{id:"city_sporty", w:8},
  ],
};

const BUILD_MOD={
  slim:{tw:0.82,th:1.02,head:0.94,shoulder:0.86,leg:0.92,swing:1.06},
  average:{tw:0.92,th:1.10,head:1.00,shoulder:1.00,leg:1.00,swing:1.00},
  athletic:{tw:0.88,th:1.08,head:0.98,shoulder:1.06,leg:1.04,swing:1.10},
  stocky:{tw:1.02,th:1.16,head:1.02,shoulder:1.10,leg:1.04,swing:0.94},
  hardy:{tw:1.06,th:1.20,head:1.04,shoulder:1.14,leg:1.08,swing:0.90},
};
const AGE_MOD={
  teen:{tw:0.80,th:1.04,head:0.92,swing:1.16,hunch:0},
  young:{tw:0.86,th:1.06,head:0.96,swing:1.08,hunch:0},
  adult:{tw:0.92,th:1.10,head:1.00,swing:1.00,hunch:0},
  middle:{tw:0.90,th:1.08,head:0.98,swing:0.92,hunch:0.04},
  senior:{tw:0.88,th:1.06,head:0.94,swing:0.78,hunch:0.10},
};

function npcPickArch(biome, armed){
  if(armed) return "armed_thug";
  const pool=NPC_BIOME_POOL[biome]||NPC_BIOME_POOL.city;
  let roll=rng()*pool.reduce((s,e)=>s+e.w,0);
  for(const e of pool){ roll-=e.w; if(roll<=0) return e.id; }
  return "city_casual";
}
function npcArchDef(id){ return NPC_ARCH[id]||NPC_ARCH.city_casual; }

function npcPickSkin(arch, age){
  if(arch===NPC_ARCH.city_elder||age==="senior") return pick(["#e8b888","#d49a6a","#c89068","#b87a48","#cdbb88"]);
  if(arch===NPC_ARCH.desert_nomad||arch===NPC_ARCH.desert_worker) return pick(["#d49a6a","#b87a48","#92602f","#e8b888","#c89068"]);
  if(arch===NPC_ARCH.sea_tourist) return pick(["#f4cda3","#e8b888","#d49a6a","#b87a48","#f5d0b0"]);
  return pick(NPC_SKIN);
}
function npcPickAge(arch){
  if(arch.age) return pick(arch.age);
  return pick(["young","adult","adult","adult","middle"]);
}
function npcPickHairStyle(arch, age){
  const pool=arch.hairStyle||(NPC_HAIR_STYLES[age]||NPC_HAIR_STYLES.adult);
  return pick(pool);
}
function npcBuildParts(look){
  return {
    head:{skin:look.skin, hair:look.hair, hairStyle:look.hairStyle, beard:look.beard, accessory:look.accessory},
    torso:{shirt:look.shirt, style:look.shirtStyle, pants:look.pants},
    legs:{pants:look.pants, shorts:look.shorts},
    feet:{shoes:look.shoes},
    outer:{hat:look.hat, hatColor:look.hatColor, scarf:look.accessory==="scarf", scarfColor:look.scarfColor},
    carry:{prop:look.prop, propColor:look.propColor},
  };
}

function rollNpcAppearance(x,y,opts){
  opts=opts||{};
  const ci=Math.floor((x-ROAD)/GAP), cj=Math.floor((y-ROAD)/GAP);
  const biome=biomeOf(ci,cj);
  const archId=npcPickArch(biome,!!opts.armed);
  const arch=npcArchDef(archId);
  const age=npcPickAge(arch);
  const build=pick(arch.build||["average","average","slim","athletic"]);
  const model=typeof People2D!=="undefined"?People2D.modelForArchetype(archId):typeof Humanoid2D!=="undefined"?Humanoid2D.modelForArchetype(archId, age, build):"civilian";
  const body=pick(arch.body);
  const hairStyle=npcPickHairStyle(arch, age);
  const hairCol=arch.hair?pick(arch.hair):pick(NPC_HAIR);
  const hair=hairStyle==="bald"?null:hairCol;
  const hat=pick(arch.hat);
  const shirt=pick(arch.shirts);
  const pants=pick(arch.pants);
  const prop=pick(arch.prop);
  const propColors={
    backpack:pick(["#5a5048","#4a5840","#3a4850","#6a5848","#485850"]),
    bag:pick(["#8a6838","#a87848","#786040","#987850"]),
    briefcase:pick(["#3a3028","#2a2830","#4a4038","#283038"]),
    stick:"#6a5038", bucket:"#586878",
  };
  let beard=body==="female"?"none":pick(arch.beard);
  const height=rand(0.88,1.12)*(age==="teen"?0.92:age==="senior"?0.94:1);
  const r=(body==="hardy"?11.5:(body==="female"?8.2:9.2))*height;
  const sp=arch.speed;
  const accessory=pick(arch.accessory);
  const shorts=(archId==="city_teen"||archId==="city_jogger"||archId==="city_sporty")&&rng()<0.42;
  const look={
    archetype:opts.armed?"armed_thug":biome,
    archetypeId:archId,
    model, age, build, height,
    skin:npcPickSkin(arch, age),
    shirt, pants, shoes:pick(NPC_SHOES),
    body, hair, hairStyle,
    shirtStyle:pick(arch.shirtStyle),
    beard, hat, hatColor:pick(NPC_HATCOL),
    accessory,
    scarfColor:accessory==="scarf"?pick(["#a84838","#384858","#8a6838","#c87838","#586878"]):null,
    prop, propColor:prop?propColors[prop]:null,
    shorts,
    r, speed:rand(sp[0],sp[1]),
    color:shirt,
    _visSeed:(rng()*1e9)|0,
  };
  look.parts=npcBuildParts(look);
  return look;
}

function applyNpcLook(p, look){
  if(!look) return p;
  for(const k of ["skin","shirt","pants","shoes","body","hair","hairStyle","shirtStyle","beard","hat","hatColor","accessory","scarfColor","prop","propColor","r","speed","color","archetype","archetypeId","model","age","build","height","shorts","parts","_visSeed"]){
    if(look[k]!==undefined) p[k]=look[k];
  }
  if(typeof Gta2Outfit!=="undefined") Gta2Outfit.applyGta2Ids(p);
  return p;
}
