/*
occInatMap.js
2022-01-10

Display real time iNaturalist observations for VAL.

Notes:

Convert kml to geoJson:
  https://github.com/mapbox/togeojson
  - togeojson file.kml > file.geojson
*/
import {getCanonicalName, getScientificName, getAllData} from "./gbifAutoComplete.js";

var vceCenter = [43.6962, -72.3197]; //VCE coordinates
var vtCenter = [43.916944, -72.668056]; //VT geo center, downtown Randolph
var vtAltCtr = [43.858297, -72.446594]; //VT border center for the speciespage view, where px bounds are small and map is zoomed to fit
var zoomLevel = 8;
var zoomCenter = vtCenter;
var cmGroup = {}; //object of layerGroups of different species' markers grouped into layers
var cmCount = {}; //a global counter for cmLayer array-objects across mutiple species
var cmTotal = {}; //a global total for cmLayer counts across species
var cgColor = {}; //object of colors for separate species layers
var cmColor = {0:"green",1:"blue",2:"red",3:"yellow",4:"orange",5:"purple",6:"cyan",7:"grey"};
var cmRadius = 10;
var valMap = {};
var basemapLayerControl = false;
var boundaryLayerControl = false;
var speciesLayerControl = false;
var totalRecords = 0;
var vtWKT = "POLYGON((-73.3427 45.0104,-73.1827 45.0134,-72.7432 45.0153,-72.6100 45.0134,-72.5551 45.0075,-72.4562 45.0090,-72.3113 45.0037,-72.0964 45.0066,-71.9131 45.0070,-71.5636 45.0138,-71.5059 45.0138,-71.5294 44.9748,-71.4949 44.9123,-71.5567 44.8296,-71.6281 44.7506,-71.6061 44.7077,-71.5677 44.6481,-71.5388 44.5817,-71.6006 44.5533,-71.5746 44.5308,-71.5883 44.4955,-71.6556 44.4504,-71.7146 44.4093,-71.7957 44.3975,-71.8163 44.3563,-71.8698 44.3327,-71.9138 44.3484,-71.9865 44.3386,-72.0346 44.3052,-72.0428 44.2432,-72.0662 44.1930,-72.0360 44.1349,-72.0580 44.0698,-72.1101 44.0017,-72.0937 43.9671,-72.1252 43.9088,-72.1733 43.8682,-72.1994 43.7899,-72.1994 43.7899,-72.2392 43.7384,-72.3010 43.7056,-72.3271 43.6391,-72.3436 43.5893,-72.3793 43.5814,-72.3972 43.5027,-72.3807 43.4988,-72.3999 43.4150,-72.4123 43.3601,-72.3903 43.3591,-72.4081 43.3282,-72.3999 43.2762,-72.4370 43.2342,-72.4493 43.1852,-72.4480 43.1311,-72.4507 43.0679,-72.4438 43.0067,-72.4699 42.9846,-72.5276 42.9645,-72.5331 42.8951,-72.5633 42.8639,-72.5098 42.7863,-72.5166 42.7652,-72.4741 42.7541,-72.4590 42.7289,-73.2761 42.7465,-73.2912 42.8025,-73.2850 42.8357,-73.2678 43.0679,-73.2472 43.5022,-73.2561 43.5615,-73.2939 43.5774,-73.3049 43.6271,-73.3557 43.6271,-73.3976 43.5675,-73.4326 43.5883,-73.4285 43.6351,-73.4079 43.6684,-73.3907 43.7031,-73.3516 43.7701,-73.3928 43.8207,-73.3832 43.8533,-73.3969 43.9033,-73.4086 43.9365,-73.4134 43.9795,-73.4381 44.0427,-73.4141 44.1058,-73.3928 44.1921,-73.3427 44.2393,-73.3186 44.2467,-73.3406 44.3484,-73.3385 44.3690,-73.2946 44.4328,-73.3296 44.5367,-73.3832 44.5919,-73.3770 44.6569,-73.3681 44.7477,-73.3317 44.7857,-73.3324 44.8043,-73.3818 44.8398,-73.3564 44.9040,-73.3392 44.9181,-73.3372 44.9643,-73.3537 44.9799,-73.3447 45.0046,-73.3447 45.0109,-73.3426 45.0104,-73.3427 45.0104))";
var stateLayer = false;
var countyLayer = false;
var townLayer = false;
var bioPhysicalLayer = false;
var geoGroup = false; //geoJson boundary group for ZIndex management
var taxaBreakout = 0; //flag to break sub-taxa into separate layers with counts.
var baseMapDefault = null;

var inatYear = '2022';
var intervalFn = null;
var interval = 30000;
var page_size = 200; //max is 200. do not exceed.
var getDays = 0;
var vtOnly = 1;
var runTimer = 1;
var getObs = 1;
var getIDs = 0;

//for standalone use
function addMap() {
    valMap = L.map('mapid', {
            zoomControl: false, //start with zoom hidden.  this allows us to add it below, in the location where we want it.
            center: vtAltCtr,
            zoom: 8,
            crs: L.CRS.EPSG3857 //have to do this to conform to USGS maps
        });

    new L.Control.Zoom({ position: 'bottomright' }).addTo(valMap);

    var attribLarge =  'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';

    var attribSmall =  '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            '© <a href="https://www.mapbox.com/">Mapbox</a>';

    var mapBoxAccessToken = 'pk.eyJ1Ijoiamxvb21pc3ZjZSIsImEiOiJjanB0dzVoZ3YwNjlrNDNwYm9qN3NmNmFpIn0.tyJsp2P7yR2zZV4KIkC16Q';

    var streets = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${mapBoxAccessToken}`, {
        maxZoom: 20,
        attribution: attribSmall,
        id: 'mapbox.streets'
    });

    var dark = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/{z}/{x}/{y}?access_token=${mapBoxAccessToken}`, {
        maxZoom: 20,
        attribution: attribSmall,
        id: 'mapbox.dark-v10'
    });

    var satellite = L.tileLayer(`https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${mapBoxAccessToken}`, {
        maxZoom: 20,
        attribution: attribSmall,
        id: 'mapbox.satellite'
    });

    var esriWorld = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        id: 'esri.world ',
        maxZoom: 20,
        attribution: 'Tiles &copy; Esri' // &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
      });

    var esriTopo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        id: 'esri.topo',
        maxZoom: 20,
        attribution: 'Tiles &copy; Esri' // &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
      });

    var openTopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        id: 'open.topo',
        maxZoom: 17,
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
      });

    var inatGrid = L.tileLayer(`https://api.inaturalist.org/v1/grid/{z}/{x}/{y}.png?place_id=47&year=${inatYear}`, {
        id: 'inat.grid',
        maxZoom: 20,
        attribution: 'Map data: &copy; iNaturalist'
      });

    var inatPoints = L.tileLayer(`https://api.inaturalist.org/v1/points/{z}/{x}/{y}.png?place_id=47&year=${inatYear}`, {
        id: 'inat.points',
        maxZoom: 20,
        attribution: 'Map data: &copy; iNaturalist'
      });

    baseMapDefault = dark; //for use elsewhere, if necessary
    valMap.addLayer(baseMapDefault); //and start with that one

    if (basemapLayerControl === false) {
        basemapLayerControl = L.control.layers().addTo(valMap);
    }

    basemapLayerControl.addBaseLayer(streets, "Mapbox Streets");
    basemapLayerControl.addBaseLayer(dark, "Mapbox Dark");
    basemapLayerControl.addBaseLayer(satellite, "Mapbox Satellite");
    basemapLayerControl.addBaseLayer(esriWorld, "ESRI Imagery");
    basemapLayerControl.addBaseLayer(esriTopo, "ESRI Topo Map");
    basemapLayerControl.addBaseLayer(openTopo, "Open Topo Map");

    basemapLayerControl.addBaseLayer(inatGrid, "iNat Grid base");
    basemapLayerControl.addBaseLayer(inatPoints, "iNat Points base");

    basemapLayerControl.addOverlay(inatGrid, "iNat Grid");
    basemapLayerControl.addOverlay(inatPoints, "iNat Points");

    console.log('done adding basemaps');

    basemapLayerControl.setPosition("bottomright");

    valMap.on("zoomend", e => onZoomEnd(e));
    valMap.on("overlayadd", e => MapOverlayAdd(e));
}

/*
  Fired when an overlay is selected through a layer control. We send all overlays
  to the back so that point markers remain clickable, in the foreground.
*/
function MapOverlayAdd(e) {
  //console.log('MapOverlayAdd', e.layer.options.name);
  if (typeof e.layer.bringToBack === 'function') {e.layer.bringToBack();} //push the just-added layer to back
  geoGroup.eachLayer(layer => {
    //console.log('geoGroup', layer.options.name);
    if (layer.options.name != e.layer.options.name) {
      layer.bringToBack(); //push other overlays to back
    }
  })
}

function onZoomEnd(e) {
  zoomLevel = valMap.getZoom();
  zoomCenter = valMap.getCenter();
  SetEachPointRadius();
}

/*
  Add boundaries to map and control. Converted from KML to geoJSON

  https://github.com/mapbox/togeojson
  - togeojson file.kml > file.geojson
 */
async function addBoundaries() {

    if (boundaryLayerControl === false) {
        boundaryLayerControl = L.control.layers().addTo(valMap);
    } else {
        console.log('boundaryLayerControl already added.')
        return;
    }
    boundaryLayerControl.setPosition("bottomright");

    console.log("addBoundaries (geoJson) ...");

    geoGroup = new L.FeatureGroup();
    addGeoJsonLayer('geojson/Polygon_VT_State_Boundary.geojson', "State", 0, boundaryLayerControl, geoGroup).then((layer) => {stateLayer=layer;});
    addGeoJsonLayer('geojson/Polygon_VT_County_Boundaries.geojson', "Counties", 1, boundaryLayerControl, geoGroup);
    addGeoJsonLayer('geojson/Polygon_VT_Town_Boundaries.geojson', "Towns", 2, boundaryLayerControl, geoGroup);
    addGeoJsonLayer('geojson/Polygon_VT_Biophysical_Regions.geojson', "Biophysical Regions", 3, boundaryLayerControl, geoGroup);
}

function addGeoJsonLayer(file="test.geojson", layerName="Test", layerId = 0, layerControl=null, layerGroup=null, addToMap=false) {
  var layer = null;
  return new Promise(async (resolve, reject) => {
    loadJSON(file, (data) => {
      layer = L.geoJSON(data, {
          onEachFeature: onEachFeature,
          style: onStyle,
          name: layerName, //IMPORTANT: this used to compare layers at ZIndex time
          id: layerId
      });
      if (addToMap) {layer.addTo(valMap); layer.bringToBack();}
      if (layerControl) {layerControl.addOverlay(layer, layerName);}
      if (layerGroup) {layerGroup.addLayer(layer);}
      resolve(layer);
    });
  });
}

function loadJSON(file, callback) {
  loadFile(file, "application/json", (res) => {
    callback(JSON.parse(res));
  })
}

/*
  Common MIME Types:
    application/json
    application/xml
    text/plain
    text/javascript
    text/csv
*/
function loadFile(file, mime="text/plain", callback) {
    var xobj = new XMLHttpRequest();
        xobj.overrideMimeType(mime);
    xobj.open('GET', file, true);
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
          } else {
            //console.log(`loadFile | status: ${xobj.status} | readyState: ${xobj.readyState}`);
          }
    };
    xobj.send(null);
}

/*
  An abortive attempt to handle clicks on stacked map objects.
*/
function getIntersectingFeatures(e) {
  var clickBounds = L.latLngBounds(e.latlng, e.latlng);
  var lcnt = 0;
  var fcnt = 0;
  var feat = {};

  var intersectingFeatures = [];
  for (var l in valMap._layers) {
    lcnt++;
    var overlay = valMap._layers[l];
    if (overlay._layers) {
      for (var f in overlay._layers) {
        fcnt++;
        var feature = overlay._layers[f];
        var bounds;
        if (feature.getBounds) {
          bounds = feature.getBounds();
        } else if (feature._latlng) {
          bounds = L.latLngBounds(feature._latlng, feature._latlng);
        } else {;}
        if (bounds && clickBounds.intersects(bounds)) {
          var id = `${feature._leaflet_id}`;
          //console.log(`feature._leaflet_id:`,feature._leaflet_id, feat, feat[id]);
          if (feat[id]) {
              //console.log('skipping', feat);
            } else {
              //console.log(`adding`, feat);
              intersectingFeatures.push(feature);
              feat[id] = true;
            }
        }
      }
    }
  }
  console.log(`getIntersectingFeatures | layers: ${lcnt} | features: ${fcnt} | _leaflet_ids:`, feat);
  console.log('intersectingFeatures:', intersectingFeatures);
  var html = null;
  if (intersectingFeatures.length) {
    // if at least one feature found, show it
    html = `<u>Found ${intersectingFeatures.length} features</u><br/>`;
    intersectingFeatures.forEach((ele,idx,arr) => {
      if (ele.defaultOptions && ele.defaultOptions.name) {
        html += ele.defaultOptions.name + ': ';
      }
      if (ele.feature && ele.feature.properties && ele.feature.properties.BLOCKNAME) {html += ele.feature.properties.BLOCKNAME}
      if (ele.feature && ele.feature.properties && ele.feature.properties.TOWNNAME) {html += ele.feature.properties.TOWNNAME}
      if (ele.feature && ele.feature.properties && ele.feature.properties.CNTYNAME) {html += ele.feature.properties.CNTYNAME}
      if (ele.feature && ele.feature.properties && ele.feature.properties.name) {html += ele.feature.properties.name}
      html += '<br/>';
    })
  }
  return html;
}

/*
  Callback function for addGeoJsonLayer to define feature behavior of added
  geoJson overlays on the Boundary Layer Control
*/
function onEachFeature(feature, layer) {
    layer.on('mousemove', function (event) {
      //console.log('mousemove', event);
    });
    layer.on('click', function (event) {
        //console.log('click | event', event, '| layer', layer);
        event.target._map.fitBounds(layer.getBounds());
        console.log(feature.properties);
        //clickHandler(event, layer);
    });
    layer.on('contextmenu', function (event) {
        //console.log('CONTEXT-MENU | event', event, '| layer', layer);
        //event.target._map.fitBounds(layer.getBounds());
        //var html = getIntersectingFeatures(event);
        /*
        valMap.openPopup(html, event.latlng, {
          offset: L.point(0, -24)
        });
        */
    });
    if (feature.properties) {
        var obj = feature.properties;
        var tips = '';
        var pops = '';
        for (var key in obj) { //iterate over feature properties
          switch(key.substr(key.length - 4).toLowerCase()) { //last 4 characters of property
            case 'name':
              tips = `${obj[key]}<br>` + tips;
              break;
          }
        }
      if (tips) {layer.bindTooltip(tips);}
      if (pops) {layer.bindPopup(pops);}
    }
}

/*
  Callback function to set style of added geoJson overlays on the Boundary Layer Control
*/
function onStyle(feature) {
    if (feature.properties.BLOCK_TYPE) {
      switch(feature.properties.BLOCK_TYPE) {
        case 'PRIORITY1':
          return {color:"black", weight:1, fillOpacity:0.2, fillColor:"red"};
          break;
        case 'PRIORITY':
          return {color:"black", weight:1, fillOpacity:0.2, fillColor:"yellow"};
          break;
        case 'NONPRIOR':
          return {color:"black", weight:1, fillOpacity:0.0, fillColor:"blue"};
          break;
      }
    } else {
      if (feature.properties.BIOPHYSRG1) { //biophysical regions
        return {color:"red", weight:1, fillOpacity:0.1, fillColor:"red"};
      } else if (feature.properties.CNTYNAME) { //counties
        return {color:"yellow", weight:1, fillOpacity:0.1, fillColor:"yellow"};
      } else if (feature.properties.TOWNNAME) { //towns
        return {color:"blue", weight:1, fillOpacity:0.1, fillColor:"blue"};
      } else {
        return {color:"black", weight:1, fillOpacity:0.1, fillColor:"black"};
      }
    }
}

/*
 * iNat uses lat/lng bbox.  just get those from leaflet map and return as object.
 */
function getMapLlExtents() {
    var llne = valMap.getBounds().getNorthEast();
    var llsw = valMap.getBounds().getSouthWest();
    return {
        nelat: llne.lat,
        nelng: llne.lng,
        swlat: llsw.lat,
        swlng: llsw.lng
    };
}

/*
 * Clear any markers from the map
 */
function initMap() {
    console.log(`initMap()`);
    cmCount['all'] = 0;
    //remove all circleMarkers from each group by clearing the layer
    Object.keys(cmGroup).forEach(function(key) {
        console.log(`Clear layer '${key}'`);
        cmGroup[key].clearLayers();
        console.log(`Remove control layer for '${key}'`);
        //if (speciesLayerControl) speciesLayerControl.removeLayer(cmGroup[key]);
        delete cmGroup[key];
        delete cmCount[key];
        delete cmTotal[key];
        delete cgColor[key];
    });
    console.log(`Remove species layer control from map`);
    if (speciesLayerControl) {valMap.removeControl(speciesLayerControl);}
    speciesLayerControl = false;
}

function getStamp(offsetSecs=30) {
  const loc = moment(moment().valueOf() -  offsetSecs * 1000).format('YYYY-MM-DDTHH:mm:ss');
  const utc = moment.utc(moment().valueOf() - offsetSecs * 1000).format('YYYY-MM-DDTHH:mm:ss');
  //console.log(`getStamp | local: ${loc} | utc: ${utc}`);
  return utc;
}

function getDate(offsetDays=1) {
  const date = moment(moment().valueOf() -  offsetDays*1000*3600*24).format('YYYY-MM-DD');
  console.log(`getDate | ${date}`);
  return date;
}

/*
  GET iNat Observations
  https://api.inaturalist.org/v1/observations/?project_id=vermont-atlas-of-life&quality_grade=research
  https://api.inaturalist.org/v1/observations/?project_id=vermont-atlas-of-life&quality_grade=needs_id
*/
function getInatObs(init=0) {
  //var mapExt = getMapLlExtents();
  var baseUrl = 'https://api.inaturalist.org/v1/observations';
  var begDate = `?d1=${getStamp(30)}`; if (init & vtOnly) {begDate = `?d1=${getDate(getDays)}`;}
  var endDate = `&d2=${getStamp(0)}`;
  var project = '&project_id=vermont-atlas-of-life';
  var identified = '&current=true';
  //var bbox = `&nelat=${mapExt.nelat}&nelng=${mapExt.nelng}&swlat=${mapExt.swlat}&swlng=${mapExt.swlng}`;
  var order = '&order=desc&order_by=updated_at';
  var iNatUrl = baseUrl + begDate + order;
  if (vtOnly) {iNatUrl = baseUrl + begDate + project + order;}

  //console.log('getInatObs', iNatUrl);
  // start a new chain of fetch events
  initOccRequest(iNatUrl, 0);
}

function getInatIDs(init=0) {
  //var mapExt = getMapLlExtents();
  var baseUrl = 'https://api.inaturalist.org/v1/identifications';
  var begDate = `?observation_created_d1=${getStamp(30)}`; if (init & vtOnly & getDays) {begDate = `?d1=${getDate(getDays)}`;}
  var endDate = `&observation_created_d2=${getStamp(0)}`;
  var place = '&place_id=47';
  //var bbox = `&nelat=${mapExt.nelat}&nelng=${mapExt.nelng}&swlat=${mapExt.swlat}&swlng=${mapExt.swlng}`;
  var order = '&order=desc&order_by=updated_at';
  var iNatUrl = baseUrl + begDate + order;
  if (vtOnly) {iNatUrl = baseUrl + begDate + place + order;}

  //console.log('getInatIDs', iNatUrl);
  // start a new chain of fetch events
  initOccRequest(iNatUrl, 1);
}

function initOccRequest(url, type=0) {
    var occXHR = new XMLHttpRequest();

    //handle request responses here in this callback
    occXHR.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            occResults(this, url, type);
        } else if (this.status > 299) {
          console.log(`initOccRequest(${url} |  readyState: ${this.readyState} | status: ${this.status}`);
        }
    };

    //load the first page of data, which initiates subsequent page loads
    loadPage(occXHR, url, 1);
}

/*
  loadPage - called initally by init, then recursively by results to load a series
  of pages of data until done or the user hits the 'Stop' button/
*/
function loadPage(occXHR, url, page) {
    const uri = `${url}&per_page=${page_size}&page=${page}`;
    console.log(`loadpage`, uri);
    occXHR.open("GET", uri, true);
    occXHR.responseType = 'json'; //looks like you need to add this after the open, and use 'reponse' above, not 'responseText'
    occXHR.setRequestHeader("Content-type", "application/json");
    occXHR.send();
}

async function occResults(occXHR, url, type=0) {
    var jsonRes = occXHR.response; //JSON.parse(occXHR.response);
    var totr = jsonRes.total_results;
    var perp = jsonRes.per_page;
    var page = jsonRes.page;
    var pages = Math.floor(totr / perp) + ((totr % perp)>0?1:0);
    await updateInatMap(jsonRes.results, type);
    if (page < pages && runTimer) {
      console.log(`occValMap::occResults calling loadPage for page ${page} of ${pages}`);
      loadPage(occXHR, url, ++page);
    } else {
      occXHR.abort(); //does this clean up memory?
    }
}

//update the map with a page of data. type is 0:observations, 1:identifications
function updateInatMap(iNatJsonData, type=0) {

  for (var i = 0; i < iNatJsonData.length; i++) {
    var obsJson = {};
    var idJson = {};
    var llLoc = null;

    if (0==type) { //obs
      obsJson = iNatJsonData[i];
    } else if (1==type) { //id
      idJson = iNatJsonData[i];
      obsJson = idJson.observation;
    }

    if (obsJson.geojson && obsJson.geojson.coordinates) {
      llLoc = L.latLng(obsJson.geojson.coordinates[1], obsJson.geojson.coordinates[0]);
    } else if (obsJson.location) {
      console.log(`updateInatMap | NO geojson coordinates for URI:`, obsJson.uri);
      llArr = `${occJason.location}`.split(',');
      llLoc = L.latLng(llArr[0], llArr[1]);
    } else {
      console.log(`updateInatMap | NO coordinates for URI:`, obsJson.uri);
      continue;
    }

    cmCount['iNat']++;
    cmCount['all']++;

    var popup = L.popup({
        maxHeight: 200,
        keepInView: true,
    }).setContent(`
        Taxon Name: ${obsJson.taxon?obsJson.taxon.name:''}<br>
        Taxon Rank: ${obsJson.taxon?obsJson.taxon.rank:''}<br>
        Description: ${obsJson.description||''}<br>
        <a href="${obsJson.uri||''}">${obsJson.uri||''}</a><br>
        Observed on: ${moment(obsJson.time_observed_at).format('YYYY-MM-DD HH:mm:ss')||''}<br>
        Created on: ${moment(obsJson.created_at).format('YYYY-MM-DD HH:mm:ss')||''}<br>
        Updated at: ${moment(obsJson.updated_at).format('YYYY-MM-DD HH:mm:ss')||''}<br>
        Place guess: ${obsJson.place_guess||''}<br>
        Quality/Grade: ${obsJson.quality_grade||''}<br>`);

    var marker = L.circleMarker(llLoc, {
        //renderer: myRenderer, //using this puts markers behind overlays. do we need it? We do not.
        fillColor: "white", //cgColor, //interior color
        fillOpacity: 0.5, //values from 0 to 1
        color: cmColor[type], //border color
        weight: 1, //border thickness
        radius: cmRadius,
        index: cmCount['iNat'],
        occurrence: (obsJson.species||obsJson.species_guess)||'none',
        time: getDateYYYYMMDD(obsJson.eventDate)
    }).bindPopup(popup);

    if (typeof cmGroup['iNat'] === 'undefined') {
      console.log(`cmGroup[iNat] is undefined...adding.`);
      cmGroup['iNat'] = L.layerGroup().addTo(valMap); //create a new, empty, single-species layerGroup to be populated from API
      //speciesLayerControl.addOverlay(cmGroup['iNat'], `<label id="iNat_Obs">iNat Obs</label>`);
      cmGroup['iNat'].addLayer(marker); //add this marker to the current layerGroup, which is an ojbect with possibly multiple layerGroups by taxonName
    } else {
      cmGroup['iNat'].addLayer(marker); //add this marker to the current layerGroup, which is an ojbect with possibly multiple layerGroups by taxonName
    }

    marker.bringToFront(); //this is not necessary, currently. can't hurt though.
  }
}

/*
 * use moment to convert eventDate (which comes to us from VAL API as UTC epoch milliseconds with time *removed*, so
 * it's always time 00:00, and we cannot report time, only date) to a standard date format.
 *
 * return date in the format YYYY-MM-DD
 */
function getDateYYYYMMDD(msecs) {
    var m = moment.utc(msecs);
    return m.format('YYYY-MM-DD');
}

function getDateMMMMDoYYYY(msecs) {
    var m = moment.utc(msecs);
    return m.format('MMMM Do YYYY');
}

//iterate through all plotted pools in each featureGroup and alter each radius
function SetEachPointRadius(radius = cmRadius) {
  cmRadius = Math.floor(zoomLevel);
  Object.keys(cmGroup).forEach((taxonName) => {
    cmGroup[taxonName].eachLayer((cmLayer) => {
      cmLayer.setRadius(radius);
      cmLayer.bringToFront(); //this works, but only when this function is called
    });
  });
}

function setZoom(to=0) {
  if (to) valMap.setView(vtCenter, 8);
  else valMap.setView([47.040182, -23.554687], 2);
}

function addMapCallbacks() {
    valMap.on('zoomend', function () {
        console.log(`Map Zoom: ${valMap.getZoom()}`);
    });
    valMap.on('moveend', function() {
        console.log(`Map Center: ${valMap.getCenter()}`);
    });
}

//standalone module usage
function initValStandalone() {
    addMap();
    addMapCallbacks();
    if (!boundaryLayerControl) {addBoundaries();}
}

if (document.getElementById("inatTimer")) {
  window.addEventListener("load", function() {
    initValStandalone(); //show the map, add controls
    document.getElementById("runTimer").addEventListener("click", function() {
      runTimer = !runTimer;
      if (runTimer) {startData();}
      else {stopsData();}
    });
    document.getElementById("vtOnly").addEventListener("click", function() {
      vtOnly = !vtOnly;
      console.log('vtOnly click', vtOnly);
      setZoom(vtOnly);
      initMap();
      getData(1);
      var slider = document.getElementById("getDays");
      var output = document.getElementById("dayValue");
      if (vtOnly) {
        stateLayer.addTo(valMap); stateLayer.bringToBack();
        slider.style.display = "block";
        output.style.display = "block";
      } else {
        slider.style.display = "none";
        output.style.display = "none";
      }
    });
    document.getElementById("getObs").addEventListener("click", function() {
      console.log(`getObs click`);
      getObs = 1; getIDs = 0;
      initMap();
      getData(1);
    });
    document.getElementById("getIDs").addEventListener("click", function() {
      console.log(`getIDs click`);
      getIDs = 1; getObs = 0;
      initMap();
      getData(1);
    });
    document.getElementById("getDays").addEventListener("change", function() {
      var slider = document.getElementById("getDays");
      var output = document.getElementById("dayValue");
      output.innerHTML = slider.value + ' Days';; // Display the default slider value
      getDays = slider.value;

      // Update the current slider value (each time you drag the slider handle)
      slider.oninput = function() {
          output.innerHTML = this.value + ' Days';
          getDays = this.value
          initMap();
          getData(1);
        }
      });

  });
  startData();
}

function getData(init=0) {
  console.log(`getData | getObs:${getObs} | getIDs:${getIDs} | getDays:${getDays}`);
  if (getObs) getInatObs(init);
  if (getIDs) getInatIDs(init);
}

function startData() {
  getData(1);
  intervalFn = window.setInterval(getData, interval);
}

function stopsData() {
  clearInterval(intervalFn);
  intervalFn = null;
}
