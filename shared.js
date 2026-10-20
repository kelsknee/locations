// Code shared by the logger (index.html) and the data page (pins.html):
// the Supabase connection, reverse geocoding, and CSV / ZIP / GPX export.
(function(){
  var cfg = window.SITE_CONFIG || {};
  var SP = window.SP = {};
  var base = String(cfg.supabaseUrl || "").replace(/\/+$/,"");
  SP.configured = !!(base && cfg.supabaseKey);

  SP.TYPES = {
    brush:{label:"Brush",color:"#2e7d4f",svg:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M5 21c0-6 1-10 3-14M12 21V4M19 21c0-6-1-10-3-14"/></svg>'},
    trash:{label:"Trash",color:"#d9822b",svg:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></svg>'},
    tires:{label:"Tires",color:"#2b2f36",svg:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>'}
  };
  SP.CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';

  SP.esc = function(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); };
  SP.fmtCoord = function(p){ return p.lat.toFixed(6)+", "+p.lng.toFixed(6); };
  SP.countLabel = function(p){
    return p.type==="tires" ? (p.count===""||p.count==null ? "count unknown" : p.count+(p.count===1?" tire":" tires")) : "";
  };
  SP.dist = function(a,b){ // metres, haversine
    var R=6371000,r=Math.PI/180,dl=(b[0]-a[0])*r,dn=(b[1]-a[1])*r;
    var h=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dn/2)*Math.sin(dn/2);
    return 2*R*Math.asin(Math.sqrt(h));
  };
  SP.segMeters = function(segs){
    var m=0; segs.forEach(function(sg){ for(var i=1;i<sg.length;i++) m+=SP.dist(sg[i-1],sg[i]); }); return m;
  };
  SP.hasPhoto = function(p){ return !!(p.photoPath || p.localBlob); };

  // ---- Supabase (plain REST, no SDK) ----
  function headers(extra){
    var h = {apikey:cfg.supabaseKey};
    if (/^eyJ/.test(cfg.supabaseKey)) h.Authorization = "Bearer "+cfg.supabaseKey; // legacy JWT keys only
    for (var k in (extra||{})) h[k] = extra[k];
    return h;
  }
  function ok(r){
    if (r.ok) return r;
    return r.text().then(function(t){ throw new Error("HTTP "+r.status+" "+String(t).slice(0,200)); });
  }
  function noStore(){ if (!SP.configured) throw new Error("Shared storage isn't set up"); }
  function toRow(p){
    return {id:p.id,type:p.type,lat:p.lat,lng:p.lng,acc:p.acc,logged_at:p.time,address:p.address||"",
      addr_kind:p.addrKind||null,edited:!!p.edited,tire_count:(p.count===""||p.count==null)?null:p.count,photo_path:p.photoPath||null};
  }
  function fromRow(r){
    return {id:r.id,type:r.type,lat:r.lat,lng:r.lng,acc:r.acc,time:r.logged_at,address:r.address||"",
      addrKind:r.addr_kind||null,edited:!!r.edited,count:r.tire_count==null?null:r.tire_count,photoPath:r.photo_path||null};
  }
  var COLS = {type:"type",lat:"lat",lng:"lng",acc:"acc",time:"logged_at",address:"address",addrKind:"addr_kind",edited:"edited",count:"tire_count",photoPath:"photo_path"};
  function listAll(table,order,map){
    noStore();
    var out = [];
    function page(off){
      return fetch(base+"/rest/v1/"+table+"?select=*&order="+order+"&limit=1000&offset="+off,{headers:headers(),cache:"no-store"})
        .then(ok).then(function(r){return r.json();}).then(function(rows){
          rows.forEach(function(r){ out.push(map(r)); });
          return rows.length===1000 ? page(off+1000) : out;
        });
    }
    return page(0);
  }
  function jsonHeaders(prefer){ return headers({"Content-Type":"application/json",Prefer:prefer}); }

  SP.api = {
    photoUrl:function(path){ return base+"/storage/v1/object/public/photos/"+encodeURIComponent(path); },
    listPins:function(){ return listAll("pins","logged_at.asc",fromRow); },
    upsertPin:function(p){
      noStore();
      return fetch(base+"/rest/v1/pins?on_conflict=id",{method:"POST",headers:jsonHeaders("resolution=merge-duplicates,return=minimal"),body:JSON.stringify(toRow(p))}).then(ok);
    },
    patchPin:function(id,fields){
      noStore();
      var body = {}, row = toRow(Object.assign({id:id,type:"brush",lat:0,lng:0},fields));
      Object.keys(fields).forEach(function(k){ if (COLS[k]) body[COLS[k]] = row[COLS[k]]; });
      return fetch(base+"/rest/v1/pins?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:jsonHeaders("return=minimal"),body:JSON.stringify(body)}).then(ok);
    },
    deletePin:function(id){
      noStore();
      return fetch(base+"/rest/v1/pins?id=eq."+encodeURIComponent(id),{method:"DELETE",headers:headers({Prefer:"return=minimal"})}).then(ok);
    },
    uploadPhoto:function(path,blob){
      noStore();
      return fetch(base+"/storage/v1/object/photos/"+encodeURIComponent(path),{method:"POST",headers:headers({"Content-Type":"image/jpeg","x-upsert":"true","cache-control":"max-age=31536000"}),body:blob}).then(ok);
    },
    deletePhoto:function(path){
      noStore();
      return fetch(base+"/storage/v1/object/photos/"+encodeURIComponent(path),{method:"DELETE",headers:headers()}).then(ok);
    },
    listTracks:function(){
      return listAll("tracks","started_at.asc",function(r){ return {id:r.id,segs:r.points||[],miles:r.miles,startedAt:r.started_at,updatedAt:r.updated_at}; });
    },
    upsertTrack:function(t){
      noStore();
      var row = {id:t.id,points:t.segs,miles:+(SP.segMeters(t.segs)/1609.344).toFixed(3),started_at:t.startedAt,updated_at:new Date().toISOString()};
      return fetch(base+"/rest/v1/tracks?on_conflict=id",{method:"POST",headers:jsonHeaders("resolution=merge-duplicates,return=minimal"),body:JSON.stringify(row)}).then(ok);
    }
  };

  // ---- Reverse geocoding (OpenStreetMap Nominatim: max 1 request per second) ----
  SP.reverseGeocode = function(lat,lng){
    return fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat="+lat+"&lon="+lng,{headers:{"Accept":"application/json"}})
      .then(function(r){ if(!r.ok) throw new Error("http"); return r.json(); })
      .then(function(j){
        var a = j.address || {}, kind;
        var street = [a.house_number,a.road].filter(Boolean).join(" ");
        var city = a.city||a.town||a.village||a.hamlet||"";
        var place = street||a.neighbourhood||a.suburb||"";
        if (a.house_number){ kind = "Exact"; }
        else { kind = "Nearest"; if (a.road) place = "Near "+a.road; else if (place) place = "Near "+place; }
        var line = [place, city, a.state, a.postcode].filter(Boolean);
        var address = line.length ? line.join(", ") : "";
        return {address:address, addrKind:address ? kind : "None"};
      });
  };
  // Queue so lookups run one at a time, a little over a second apart.
  // lookup(pin) -> start; onResult(pin, result|null) is called for each (null = lookup failed).
  SP.makeGeocoder = function(onResult){
    var queue = [], working = false;
    function run(){
      working = true;
      var p = queue.shift();
      SP.reverseGeocode(p.lat,p.lng).then(function(r){ onResult(p,r); },function(){ onResult(p,null); })
        .then(function(){ setTimeout(function(){ if (queue.length) run(); else working = false; },1100); });
    }
    return function(p){
      if (queue.some(function(q){return q.id===p.id;})) return;
      queue.push(p); if (!working) run();
    };
  };

  // ---- Export ----
  function csvCell(v){ v = String(v==null?"":v); return /[",\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; }
  SP.photoName = function(p,i){ return "photos/"+String(i+1).padStart(3,"0")+"-"+p.type+".jpg"; };
  SP.photoSrc = function(p){ return p.photoPath ? SP.api.photoUrl(p.photoPath) : null; };
  SP.buildCsv = function(pins){
    var rows = [["Type","Address","Address quality","Latitude","Longitude","Accuracy (m)","Logged at","Map link","Photo file","Photo link","Tire count"]];
    pins.forEach(function(p,i){
      rows.push([SP.TYPES[p.type].label,p.address||"",p.addrKind||(p.address?"":"None"),p.lat.toFixed(6),p.lng.toFixed(6),p.acc,p.time,
        "https://www.google.com/maps?q="+p.lat.toFixed(6)+","+p.lng.toFixed(6),
        SP.hasPhoto(p)?SP.photoName(p,i):"", p.photoPath?SP.api.photoUrl(p.photoPath):"",
        p.type==="tires"&&p.count!==""&&p.count!=null?p.count:""]);
    });
    return "﻿"+rows.map(function(r){return r.map(csvCell).join(",");}).join("\r\n");
  };
  SP.download = function(blob,name){
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); },2000);
  };
  SP.today = function(){ return new Date().toISOString().slice(0,10); };
  SP.gpx = function(tracks){
    var x = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Site Pin Logger" xmlns="http://www.topografix.com/GPX/1/1">';
    tracks.forEach(function(t,i){
      x += "<trk><name>Drive "+(i+1)+(t.startedAt?" ("+new Date(t.startedAt).toISOString().slice(0,10)+")":"")+"</name>";
      t.segs.forEach(function(sg){
        x += "<trkseg>"+sg.map(function(q){ return '<trkpt lat="'+q[0]+'" lon="'+q[1]+'"><time>'+new Date(q[2]).toISOString()+'</time></trkpt>'; }).join("")+"</trkseg>";
      });
      x += "</trk>";
    });
    return x+"</gpx>";
  };

  // Minimal ZIP writer (stored, no compression; JPEGs are already compressed)
  var crcT = (function(){ var t=[],c,n,k; for(n=0;n<256;n++){ c=n; for(k=0;k<8;k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; t[n]=c>>>0; } return t; })();
  function crc32(u8){ var c=0xFFFFFFFF; for(var i=0;i<u8.length;i++) c = crcT[(c^u8[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
  SP.makeZip = function(files){ // [{name, data:Uint8Array}]
    var enc = new TextEncoder(), parts = [], central = [], off = 0, d = new Date();
    var dt = ((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate(), tm = (d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1);
    files.forEach(function(f){
      var nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,0,true);
      h.setUint16(10,tm,true); h.setUint16(12,dt,true); h.setUint32(14,crc,true); h.setUint32(18,sz,true); h.setUint32(22,sz,true);
      h.setUint16(26,nm.length,true); h.setUint16(28,0,true);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,0,true);
      c.setUint16(12,tm,true); c.setUint16(14,dt,true); c.setUint32(16,crc,true); c.setUint32(20,sz,true); c.setUint32(24,sz,true);
      c.setUint16(28,nm.length,true); c.setUint32(42,off,true);
      parts.push(h.buffer,nm,f.data); central.push(c.buffer,nm);
      off += 30+nm.length+sz;
    });
    var csz = central.reduce(function(a,b){ return a+(b.byteLength||b.length); },0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true);
    e.setUint32(12,csz,true); e.setUint32(16,off,true);
    return new Blob(parts.concat(central,[e.buffer]),{type:"application/zip"});
  };
  // pins: array of pins (server pins have photoPath, waiting-to-upload pins have localBlob); tracks: optional
  SP.exportZip = function(pins,tracks){
    var withPhoto = pins.map(function(p,i){ return {p:p,i:i}; }).filter(function(x){ return SP.hasPhoto(x.p); });
    return Promise.all(withPhoto.map(function(x){
      var get = x.p.localBlob ? Promise.resolve(x.p.localBlob)
        : fetch(SP.api.photoUrl(x.p.photoPath)).then(ok).then(function(r){return r.blob();});
      return get.then(function(b){ return b.arrayBuffer(); })
        .then(function(buf){ return {name:SP.photoName(x.p,x.i),data:new Uint8Array(buf)}; })
        .catch(function(){ return null; });
    })).then(function(list){
      var files = list.filter(Boolean), missed = list.length-files.length;
      files.unshift({name:"site-pins.csv",data:new TextEncoder().encode(SP.buildCsv(pins))});
      if (tracks && tracks.length) files.push({name:"routes.gpx",data:new TextEncoder().encode(SP.gpx(tracks))});
      return {blob:SP.makeZip(files),photos:files.filter(function(f){return /^photos\//.test(f.name);}).length,missed:missed};
    });
  };
})();
