/* gta2-outfit.js — hex → GTA2 modular part ids, body/build helpers */
(function(global){
"use strict";

const SHIRT_HEX={
  "#3a6ea5":"blue","#2f5fa0":"blue","#386a8a":"blue",
  "#e8e8ec":"white","#ffffff":"white",
  "#c43830":"red","#a4513f":"red","#8a2828":"red","#8a3a4a":"red",
  "#dcb828":"yellow","#b59a3f":"yellow","#c87838":"yellow",
  "#8a6838":"brown","#704838":"brown",
  "#e878a8":"pink","#a85a7a":"pink",
  "#6a7080":"grey","#5a5e66":"grey","#384858":"grey",
  "#4f7d4a":"brown","#7a5fa0":"pink","#2f8a7a":"grey","#2a5848":"grey",
  "#6a3848":"brown","#5a5088":"grey","#286848":"brown",
};

const PANTS_HEX={
  "#2a3444":"jeans","#3a3a48":"jeans","#222830":"jeans","#283038":"jeans",
  "#1a2430":"jeans_dark","#222228":"jeans_dark","#1a2030":"jeans_dark","#181c28":"jeans_dark",
  "#283828":"shorts_blue","#384050":"shorts_blue",
  "#4a4038":"jeans","#1c2838":"jeans_dark",
};

const SKIN_HEX={
  "#f4cda3":"light","#f5d0b0":"light","#e8b888":"light",
  "#d49a6a":"medium","#c89068":"medium","#d8a878":"medium","#e8b888":"medium",
  "#b87a48":"tan","#92602f":"tan","#b87858":"tan","#6b4528":"tan","#4a3018":"tan",
  "#cdbb88":"light","#f5d0b0":"light",
};

const HAIR_HEX={
  "#2a1c10":"black","#1a1410":"black","#141414":"black","#4a3018":"brown",
  "#6a4a22":"brown","#3a2a18":"brown","#5a4030":"brown",
  "#9a7838":"blonde","#cdbb88":"blonde","#c8a048":"blonde",
  "#b04a2a":"red","#a03028":"red",
  "#6a6a6a":"black","#e8e8e8":"blonde",
};

const BODY_BUILD={ male:"average", female:"slim", hardy:"hardy" };

function normHex(h){
  if(h==null||typeof h!=="string") return null;
  let x=h.trim().toLowerCase();
  if(!x) return null;
  if(!x.startsWith("#")) x="#"+x;
  if(/^#[0-9a-f]{3}$/.test(x)) return "#"+x[1]+x[1]+x[2]+x[2]+x[3]+x[3];
  return /^#[0-9a-f]{6}$/.test(x)?x:null;
}

function nearestId(hex, table, fallback){
  const h=normHex(hex);
  if(h&&table[h]) return table[h];
  if(!h) return fallback;
  const tr=parseInt(h.slice(1,3),16), tg=parseInt(h.slice(3,5),16), tb=parseInt(h.slice(5,7),16);
  let best=fallback, bestD=1e9;
  for(const [k,v] of Object.entries(table)){
    const r=parseInt(k.slice(1,3),16), g=parseInt(k.slice(3,5),16), b=parseInt(k.slice(5,7),16);
    const d=Math.abs(r-tr)+Math.abs(g-tg)+Math.abs(tb-b);
    if(d<bestD){ bestD=d; best=v; }
  }
  return best;
}

function shirtIdFromHex(hex){ return nearestId(hex, SHIRT_HEX, "blue"); }
function pantsIdFromHex(hex){ return nearestId(hex, PANTS_HEX, "jeans"); }
function skinIdFromHex(hex){ return nearestId(hex, SKIN_HEX, "medium"); }
function hairIdFromHex(hex){ return nearestId(hex, HAIR_HEX, "brown"); }

function pickFemalePants(pantsList, seed){
  const skirts=pantsList.filter(p=>p.id==="skirt_red"||p.id==="skirt_navy");
  const rest=pantsList.filter(p=>p.id!=="skirt_red"&&p.id!=="skirt_navy");
  if(skirts.length&&Math.abs(seed)%5<2) return skirts[Math.abs(seed+3)%skirts.length].id;
  return rest.length?rest[Math.abs(seed+17)%rest.length].id:"jeans";
}

function buildForBody(body, build){
  if(build) return build;
  return BODY_BUILD[body]||"average";
}

function bodyType(p){
  const b=p.body||"male";
  if(b==="female"||b==="hardy"||b==="male") return b;
  return "male";
}

function applyGta2Ids(p){
  const body=bodyType(p);
  p.body=body;
  p.shirtId=shirtIdFromHex(p.shirt||p.color);
  p.skinId=skinIdFromHex(p.skin);
  p.hairId=(p.hairStyle==="bald"||p.hair==null)?null:hairIdFromHex(p.hair);
  if(!p.pantsId) p.pantsId=pantsIdFromHex(p.pants);
  p.build=buildForBody(body, p.build);
  delete p._gta2Outfit;
  return p;
}

function filterPantsForGender(pantsList, body, rules, seed){
  const femaleOnly=new Set((rules&&rules.female_only_pants)||[]);
  const maleOnly=new Set((rules&&rules.male_only_pants)||[]);
  return pantsList.filter(p=>{
    if(body==="female"&&maleOnly.has(p.id)) return false;
    if(body!=="female"&&femaleOnly.has(p.id)) return false;
    return true;
  });
}

const Gta2Outfit={
  shirtIdFromHex, pantsIdFromHex, skinIdFromHex, hairIdFromHex,
  buildForBody, bodyType, applyGta2Ids, filterPantsForGender, pickFemalePants,
  BODY_BUILD,
};
global.Gta2Outfit=Gta2Outfit;
})(typeof window!=="undefined"?window:globalThis);
