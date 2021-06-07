/*
jtl 10/23/2018
Leaflet experiment.
Goals:
- load a json array from VAL Data Portal Occurrence API and populate the map with point occurrence data

Convert kml to geoJson:
  https://github.com/mapbox/togeojson
  - togeojson file.kml > file.geojson
*/
import {getCanonicalName, getScientificName, getAllData} from "./gbifAutoComplete.js";
import {colorsList, speciesList} from "./mapTheseSpecies.js";

var vceCenter = [43.6962, -72.3197]; //VCE coordinates
var vtCenter = [43.916944, -72.668056]; //VT geo center, downtown Randolph
var vtAltCtr = [43.858297, -72.446594]; //VT border center for the speciespage view, where px bounds are small and map is zoomed to fit
var zoomLevel = 8;
var zoomCenter = vtCenter;
var cmGroup = {}; //object of layerGroups of different species' markers grouped into layers
var cmCount = {}; //a global counter for cmLayer array-objects across mutiple species
var cmTotal = {}; //a global total for cmLayer counts across species
var cgColor = {}; //object of colors for separate species layers
var cmColors = {0:"#800000",1:"green",2:"blue",3:"yellow",4:"orange",5:"purple",6:"cyan",7:"grey"};
var cmRadius = zoomLevel/2;
var valMap = {};
var basemapLayerControl = false;
var boundaryLayerControl = false;
var speciesLayerControl = false;
var sliderControl = false;
var myRenderer = L.canvas({ padding: 0.5 }); //make global so we can clear the canvas before updates...
var xhrRecsPerPage = 1000; //the number of records to load per ajax request.  more is faster.
var totalRecords = 0;
var vtWKT = "POLYGON((-73.3427 45.0104,-73.1827 45.0134,-72.7432 45.0153,-72.6100 45.0134,-72.5551 45.0075,-72.4562 45.0090,-72.3113 45.0037,-72.0964 45.0066,-71.9131 45.0070,-71.5636 45.0138,-71.5059 45.0138,-71.5294 44.9748,-71.4949 44.9123,-71.5567 44.8296,-71.6281 44.7506,-71.6061 44.7077,-71.5677 44.6481,-71.5388 44.5817,-71.6006 44.5533,-71.5746 44.5308,-71.5883 44.4955,-71.6556 44.4504,-71.7146 44.4093,-71.7957 44.3975,-71.8163 44.3563,-71.8698 44.3327,-71.9138 44.3484,-71.9865 44.3386,-72.0346 44.3052,-72.0428 44.2432,-72.0662 44.1930,-72.0360 44.1349,-72.0580 44.0698,-72.1101 44.0017,-72.0937 43.9671,-72.1252 43.9088,-72.1733 43.8682,-72.1994 43.7899,-72.1994 43.7899,-72.2392 43.7384,-72.3010 43.7056,-72.3271 43.6391,-72.3436 43.5893,-72.3793 43.5814,-72.3972 43.5027,-72.3807 43.4988,-72.3999 43.4150,-72.4123 43.3601,-72.3903 43.3591,-72.4081 43.3282,-72.3999 43.2762,-72.4370 43.2342,-72.4493 43.1852,-72.4480 43.1311,-72.4507 43.0679,-72.4438 43.0067,-72.4699 42.9846,-72.5276 42.9645,-72.5331 42.8951,-72.5633 42.8639,-72.5098 42.7863,-72.5166 42.7652,-72.4741 42.7541,-72.4590 42.7289,-73.2761 42.7465,-73.2912 42.8025,-73.2850 42.8357,-73.2678 43.0679,-73.2472 43.5022,-73.2561 43.5615,-73.2939 43.5774,-73.3049 43.6271,-73.3557 43.6271,-73.3976 43.5675,-73.4326 43.5883,-73.4285 43.6351,-73.4079 43.6684,-73.3907 43.7031,-73.3516 43.7701,-73.3928 43.8207,-73.3832 43.8533,-73.3969 43.9033,-73.4086 43.9365,-73.4134 43.9795,-73.4381 44.0427,-73.4141 44.1058,-73.3928 44.1921,-73.3427 44.2393,-73.3186 44.2467,-73.3406 44.3484,-73.3385 44.3690,-73.2946 44.4328,-73.3296 44.5367,-73.3832 44.5919,-73.3770 44.6569,-73.3681 44.7477,-73.3317 44.7857,-73.3324 44.8043,-73.3818 44.8398,-73.3564 44.9040,-73.3392 44.9181,-73.3372 44.9643,-73.3537 44.9799,-73.3447 45.0046,-73.3447 45.0109,-73.3426 45.0104,-73.3427 45.0104))";
var stateLayer = false;
var countyLayer = false;
var townLayer = false;
var bioPhysicalLayer = false;
//var kmlGroup = false; //this was global.  made it function scope so it's garbage collected.  global not necessary b/c it's used in one function.
var geoGroup = false; //geoJson boundary group for ZIndex management
var testHarness = false;
var testData = false //flag to enable test data for development and debugging
var surveyBlocksLady = false; //flag a lady beetle atlas survey block map
var surveyBlocksEAME = false; //flag an EAME survey block map
var taxaBreakout = 0; //flag to break sub-taxa into separate layers with counts.

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
/*
    var light = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 20,
        attribution: attribSmall,
        id: 'mapbox.light'
    });
*/
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

    valMap.addLayer(streets);

    if(basemapLayerControl === false) {
        basemapLayerControl = L.control.layers().addTo(valMap);
    }

    basemapLayerControl.addBaseLayer(streets, "Mapbox Streets");
    //basemapLayerControl.addBaseLayer(light, "Mapbox Grayscale");
    basemapLayerControl.addBaseLayer(satellite, "Mapbox Satellite");
    basemapLayerControl.addBaseLayer(esriWorld, "ESRI Imagery");
    basemapLayerControl.addBaseLayer(esriTopo, "ESRI Topo Map");
    basemapLayerControl.addBaseLayer(openTopo, "Open Topo Map");

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

  https://github.com/mapbox/leaflet-omnivore (no longer used)

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

/*
    console.log("addBoundaries (kml) ...");

    stateLayer = omnivore.kml('kml/LineString_VT_State_Boundary.kml');
    countyLayer = omnivore.kml('kml/LineString_VT_County_Boundaries.kml');
    townLayer = omnivore.kml('kml/LineString_VT_Town_Boundaries.kml');
    bioPhysicalLayer = omnivore.kml('kml/LineString_VT_Biophysical_Regions.kml');

    boundaryLayerControl.addOverlay(stateLayer, "State Boundary");
    boundaryLayerControl.addOverlay(countyLayer, "County Boundaries");
    boundaryLayerControl.addOverlay(townLayer, "Town Boundaries");
    boundaryLayerControl.addOverlay(bioPhysicalLayer, "Bio-physical Boundaries");

    kmlGroup = new L.FeatureGroup()
    kmlGroup.addLayer(stateLayer);
    kmlGroup.addLayer(countyLayer);
    kmlGroup.addLayer(townLayer);
    kmlGroup.addLayer(bioPhysicalLayer);

    //stateLayer.addTo(valMap);
    //countyLayer.addTo(valMap);
    //bioPhysicalLayer.addTo(valMap);
    //townLayer.addTo(valMap);
*/
/*
    //these will fail to work without warning. colors must be valid or the feature is blank.
    var stateGroup = L.geoJSON(null, {style: getStateStyle});
    function getStateStyle(feature) {return {color: 'purple', weight: 1};}
    var countyGroup = L.geoJSON(null, {style: getCountyStyle});
    function getCountyStyle(feature) {return {color: 'grey', weight: 1};}
    var townGroup = L.geoJSON(null, {style: getTownStyle});
    function getTownStyle(feature) {return {color: 'brown', weight: 1};}
    var bioPhysicalGroup = L.geoJSON(null, {style: getBioPhysicalStyle});
    function getBioPhysicalStyle(feature) {return {color: '#373737', weight: 1};}

    var prioritySurveyGroup = L.geoJSON(null, {style: getprioritySurveyStyle});
    function getprioritySurveyStyle(feature) {return {color: '#373737', weight: 1};}

    stateLayer = omnivore.kml('kml/LineString_VT_State_Boundary.kml', null, stateGroup);
    countyLayer = omnivore.kml('kml/LineString_VT_County_Boundaries.kml', null, countyGroup);
    townLayer = omnivore.kml('kml/LineString_VT_Town_Boundaries.kml', null, townGroup);
    bioPhysicalLayer = omnivore.kml('kml/LineString_VT_Biophysical_Regions.kml', null, bioPhysicalGroup);

    boundaryLayerControl.addOverlay(stateLayer, "State Boundary");
    boundaryLayerControl.addOverlay(countyLayer, "County Boundaries");
    boundaryLayerControl.addOverlay(townLayer, "Town Boundaries");
    boundaryLayerControl.addOverlay(bioPhysicalLayer, "Bio-physical Boundaries");

    countyLayer.addTo(valMap);
*/
    console.log("addBoundaries (geoJson) ...");
/*
    addGeoJsonLayer('geojson/LineString_VT_State_Boundary.geojson', "State Boundary", boundaryLayerControl);
    addGeoJsonLayer('geojson/LineString_VT_County_Boundaries.geojson', "County Boundaries", boundaryLayerControl);
    addGeoJsonLayer('geojson/LineString_VT_Town_Boundaries.geojson', "Town Boundaries", boundaryLayerControl);
    addGeoJsonLayer('geojson/LineString_VT_Biophysical_Regions.geojson', "Biophysical Regions", boundaryLayerControl);
*/
    geoGroup = new L.FeatureGroup();
    addGeoJsonLayer('geojson/Polygon_VT_State_Boundary.geojson', "State", 0, boundaryLayerControl, geoGroup);
    addGeoJsonLayer('geojson/Polygon_VT_County_Boundaries.geojson', "Counties", 1, boundaryLayerControl, geoGroup, !surveyBlocksLady && !surveyBlocksEAME);
    addGeoJsonLayer('geojson/Polygon_VT_Town_Boundaries.geojson', "Towns", 2, boundaryLayerControl, geoGroup);
    addGeoJsonLayer('geojson/Polygon_VT_Biophysical_Regions.geojson', "Biophysical Regions", 3, boundaryLayerControl, geoGroup);
    if (surveyBlocksLady) {
      addGeoJsonLayer('geojson/surveyblocksWGS84.geojson', "Survey Blocks - Lady Beetles", 4, boundaryLayerControl, geoGroup, surveyBlocksLady);
    } else if (surveyBlocksEAME) {
      addGeoJsonLayer('geojson/EAME_Priority_Blocks.geojson', "Survey Blocks - EAME", 5, boundaryLayerControl, geoGroup, surveyBlocksEAME);
      //addGeoJsonLayer('geojson/EAME_Hay_Over_10.geojson', "Hay Coverage - EAME", 6, boundaryLayerControl, geoGroup);
    }
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
    if (4 == layer.options.id) { //Lady Beetle Survey Blocks
      if (feature.properties) {
          var obj = feature.properties;
          var tips = '';
          var pops = '';
          for (var key in obj) {
            switch(key.substr(key.length - 4).toLowerCase()) { //last 4 characters of property
              case 'name':
                tips += `${obj[key]}<br>`;
                break;
              case 'type':
        	      if (obj[key] == 'PRIORITY1') {
        		      tips = '<b><u>LADY BEETLE SURVEY BLOCK - HIGH PRIORITY</u></b><br>' + tips;
        	      } else if (obj[key] == 'PRIORITY') {
                  tips = '<b><u>PRIORITY BLOCK</u></b><br>' + tips;
                } else if (obj[key] == 'NONPRIOR') {
                  tips = 'NON-PRIORITY BLOCK<br>' + tips;
        	      } else {
        	        tips = `${obj[key]}<br>` + tips;
        	      }
                break;
            }
            if (feature.properties.BLOCKNAME &&
              (feature.properties.BLOCK_TYPE=='PRIORITY' || feature.properties.BLOCK_TYPE=='PRIORITY1'))
            {
              var name = feature.properties.BLOCKNAME;
              var link = feature.properties.BLOCKNAME.replace(/( - )|\s+/g,'').toLowerCase();
              if (feature.properties.BLOCK_TYPE=='PRIORITY1') {
                pops = `<b><u>LADY BEETLE SURVEY BLOCK - HIGH PRIORITY</u></b></br>`;
              } else {
                pops = `<b><u>PRIORITY BLOCK</u></b></br>`;
              }
              pops += `<a target="_blank" href="https://s3.us-west-2.amazonaws.com/val.surveyblocks/${link}.pdf">Get ${name} block map</a></br>`;
              pops += `<a target="_blank" href="https://val.vtecostudies.org/projects/lady-beetle-atlas/signup?surveyblock=${link}">Signup for ${name}</a>`
            }
          }
          if (tips) {layer.bindTooltip(tips);}
          if (pops) {layer.bindPopup(pops);}
      }
    } //end Lady Beetle Survey Blocks code
    else if (5 == layer.options.id) { //EAME Survey Blocks
      if (feature.properties) {
          var obj = feature.properties;
          var tips = ''; //toolTip text
          var pops = ''; //popup text
          for (var key in obj) { //iterate over feature properties
            //switch(key.substr(key.length - 4).toLowerCase()) { //last 4 characters of property
            switch(key.toUpperCase()) {
              case 'BLOCKNAME':
                tips += `Block Name: ${obj[key]}<br>`;
                break;
              case 'BLOCK_TYPE':
        	      if (obj[key] == 'PRIORITY1') {
        		      tips = '<b><u>EAME SURVEY BLOCK - HIGH PRIORITY</u></b><br>' + tips;
        	      } else if (obj[key] == 'PRIORITY') {
                  tips = '<b><u>EAME SURVEY BLOCK - PRIORITY</u></b><br>' + tips;
                } else if (obj[key] == 'NONPRIOR') {
                  tips = 'EAME SURVEY BLOCK - NON-PRIORITY<br>' + tips;
        	      } else {
        	        tips = `${obj[key]}<br>` + tips;
        	      }
                break;
              case 'HAY_HECTARES':
                tips += `Hay Coverage in Hectares: ${obj[key]}<br>`;
                break;
              default:
                //tips += `${key}: ${obj[key]}<br>`;
                break;
            }
            if (feature.properties.BLOCKNAME &&
              (feature.properties.BLOCK_TYPE=='PRIORITY'
              || feature.properties.BLOCK_TYPE=='PRIORITY1')
              || feature.properties.BLOCK_TYPE=='NONPRIOR')
            {
              var name = feature.properties.BLOCKNAME;
              var link = feature.properties.BLOCKNAME.replace(/( - )|\s+/g,'').toLowerCase();
              if (feature.properties.BLOCK_TYPE=='PRIORITY1') {
                pops = `<b><u>EAME SURVEY BLOCK - HIGH PRIORITY</u></b></br>`;
              } else if (feature.properties.BLOCK_TYPE=='PRIORITY') {
                pops = `<b><u>EAME SURVEY BLOCK - PRIORITY</u></b></br>`;
              } else {
                pops = `<b><u>EAME SURVEY BLOCK - NON-PRIORITY</u></b></br>`;
              }
              pops += `<a target="_blank" href="https://val.vtecostudies.org/projects/eastern-meadowlark-blitz/adopt-a-survey-block?surveyblock=${link}">Signup for ${name}</a></br>`
              pops += `<a target="_blank" href="https://s3.us-west-2.amazonaws.com/eame.surveyblocks/${link}.pdf">Get ${name} block map</a></br>`;
              if (feature.properties.HAY_HECTARES) {pops += `</br>Hay Coverage in Hectares: ${feature.properties.HAY_HECTARES}`;}
            }
          }
          if (tips) {layer.bindTooltip(tips);}
          if (pops) {layer.bindPopup(pops);}
      } //end if (feature.properties)
    } //end EAME Beetle Survey Blocks code
    else { //handle all other layers' toolTips and popups
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
 * https://github.com/dwilhelm89/LeafletSlider
 */
function addTimeSlider(taxonName) {
    var taxonGroup = cmGroup[taxonName];

    console.log(`addTimeSlider(${taxonName}) - layer.options: ${Object.keys(taxonGroup)}`);

    sliderControl = L.control.sliderControl({position: "bottomleft", layer: taxonGroup, range: true});
    valMap.addControl(sliderControl);
    sliderControl.startSlider();
}

/*
 * Clear any markers from the map
 */
function initValOccCanvas() {
    //console.log(`initValOccCanvas()`);
    cmCount['all'] = 0;
    //remove all circleMarkers from each group by clearing the layer
    Object.keys(cmGroup).forEach(function(key) {
        console.log(`Clear layer '${key}'`);
        cmGroup[key].clearLayers();
        console.log(`Remove control layer for '${key}'`);
        if (speciesLayerControl) speciesLayerControl.removeLayer(cmGroup[key]);
        delete cmGroup[key];
        delete cmCount[key];
        delete cmTotal[key];
        delete cgColor[key];
    });
    console.log(`Remove species layer control from map`);
    if (speciesLayerControl) {valMap.removeControl(speciesLayerControl);}
    speciesLayerControl = false;
}

function getTestData(file, taxonName) {
  //load test data
  loadJSON(file, (data) => {
    updateMap(data.occurrences, taxonName);
  });
}

/*
* query VAL Occ API for json array of occurrence data
*
* add array of circleMarkers to canvas renderer...
*
* See these for ideas on how to get an exact match from biocache-ws
* https://biocache-ws.vtatlasoflife.org/oldapi
* https://biocache-ws.vtatlasoflife.org/index/fields
*
* None of it makes any sense, however.
*/
function addValOccByTaxon(taxonName=false) {

    console.log(`addValOccByTaxon(${taxonName})`);

    var baseUrl = 'https://biocache-ws.vtatlasoflife.org/occurrences/search';
    var pageSize = `&pageSize=${xhrRecsPerPage}`;
    if (!taxonName) {taxonName = getCanonicalName();}
    var toks = taxonName.split(" ");
    var q = `?q=${taxonName}`; //q=taxonName alone does not limit to exact match. need to use fq or logical AND, see below
    var fq = ``; //`&fq=year:2018&fq=basis_of_record:PreservedSpecimen`;
    /*
    This doesn't handle higher-order taxa than genus
    if (toks[0]) fq = `&fq=genus:${toks[0]}`;
    if (toks[1]) fq += `&fq=species:${taxonName}`;
    if (toks[2]) fq += `&fq=subspecies:${taxonName}`;
    */
    //var wkt = `&wkt=${vtWKT}`; var valUrl = baseUrl + q + fq + pageSize + wkt;
    var valUrl = baseUrl + q + fq + pageSize;
    if(document.getElementById("apiUrlLabel")) {document.getElementById("apiUrlLabel").innerHTML = (valUrl);}

    console.log(`addValOccByTaxon API query for taxonName ${taxonName}:`, baseUrl + q + fq);

    // start a new chain of fetch events
    initOccRequest(valUrl, taxonName);
}

/*
  GET VAL occurrences by LSID
*/
function addValOccByLsid(taxonName, lsid) {

    console.log(`addValOccByLsid(${taxonName}, ${lsid})`);

    var baseUrl = 'https://biocache-ws.vtatlasoflife.org/occurrences/search';
    var pageSize = `&pageSize=${xhrRecsPerPage}`;
    var q = `?q=lsid:${lsid}`;
    var valUrl = baseUrl + q + pageSize;
    if(document.getElementById("apiUrlLabel")) {document.getElementById("apiUrlLabel").innerHTML = (valUrl);}

    console.log(`addValOccByLsid API query for taxonName ${taxonName} ==> lsid:${lsid}`, valUrl);

    // start a new chain of fetch events
    initOccRequest(valUrl, taxonName);
}

/*
  initiate a chain of events to lookup taxonName for LSID and call biocache-ws with LSID...
*/
function getBieSpeciesCallBiocacheLsid(taxonName) {
    var baseUrl = 'https://bie-ws.vtatlasoflife.org/species/';
    if (!taxonName) {taxonName = getCanonicalName();}
    var url = baseUrl + taxonName;
    var bieXHR = new XMLHttpRequest();

    //handle request responses here in this callback
    bieXHR.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            bieResults(this, url, taxonName);
        } else if (200 != this.status) {
          console.log(`getBieRequest status: ${this.status}`);
        }
    };

    bieXHR.open("GET", url, true);
    bieXHR.setRequestHeader("Referrer", "http://localhost/");
    bieXHR.send();
}

/*
  It appears that bie-ws returns a single-object always, or an error.
*/
function bieResults(bieXHR, url, taxonName) { //static input args from initXHR
  var bieJson = JSON.parse(bieXHR.response);

  if (bieJson.classification.scientificName == taxonName ||
    bieJson.taxonConcept.nameString == taxonName) {
      addValOccByLsid(taxonName, bieJson.taxonConcept.guid);
    }
}

function initOccRequest(url, taxonName) {
    var occXHR = new XMLHttpRequest();

    //handle request responses here in this callback
    occXHR.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            occResults(this, url, taxonName);
        } else if (200 != this.status) {
          console.log(`initOccRequest status: ${this.status}`);
        }
    };

    //load the first N records of data, which initiates subsequent page loads
    loadPage(occXHR, url, taxonName, 0);
}

function loadPage(occXHR, url, taxonName, startIndex) {
    occXHR.open("GET", url+`&startIndex=${startIndex}`, true);
    /*
     * NOTE: the VAL ALA site does not respond with a "Content-type" header.  We only get an
     * "x-requested-with" pre-flight header response.  This means we can't send a *request* having this header.
     * The two lines beloew, taken from the iNat code, asked the server to send us JSON.
     * For VAL, we let the reponse return as text and then we JSON.parse(response).
     */
    //occXHR.responseType = 'json';  //looks like you need to add this after the open, and use 'reponse' above, not 'responseText'
    //occXHR.setRequestHeader("Content-type", "application/json");
    occXHR.send();
}

async function occResults(occXHR, url, taxonName) {
    var jsonRes = JSON.parse(occXHR.response);
    var totr = jsonRes.totalRecords; cmTotal[taxonName] = jsonRes.totalRecords;
    var perp = jsonRes.pageSize;
    var startIdx = jsonRes.startIndex;
    var netr = startIdx + perp;
    if (netr > totr) {netr = totr;}
    if (document.getElementById("apiUrlLabel")) {document.getElementById("apiUrlLabel").innerHTML = (url+`&startIndex=${startIdx}`);}
    if (document.getElementById("jsonResults")) {
        document.getElementById("jsonResults").innerHTML = `total ${taxonName}: ${totr}  | ${taxonName} loaded: ${netr}`;
        }
    //console.log(`occResults | requested taxon: ${taxonName} | result:`);
    //console.dir(jsonRes);
    await updateMap(jsonRes.occurrences, taxonName);
    if (totr > netr) {
        loadPage(occXHR, url, taxonName, netr+1);
    } else {
        occXHR.abort(); //does this clean up memory?
    }
}

/*
  2021-06-07 Updates to add an API call to bie-ws first to get the LSID for taxa first. This emulates the
  ALA species lookup behavior and appears to work.

  This now automatically breaks taxa into sub-taxa. To disable this feature, set the global flag

    taxaBreakout = 0;
*/
async function updateMap(occJsonArr, taxonName) {
    var idTaxonName = taxonName.split(' ').join('_'); //this is updated later if we got multiple scientificNames for one taxonName
    var sciName = taxonName; //this is updated later if we got multiple scientificNames for one taxonName
    var idSciName;

    for (var i = 0; i < occJsonArr.length; i++) {
        var occJson = occJsonArr[i];

        //filter out records witout lat/lon location
        if (!occJson.decimalLatitude || !occJson.decimalLongitude) {
            console.log(`WARNING: Occurrence Record without Lat/Lon values: ${occJson}`);
            return;
        }

        if (taxaBreakout) sciName = occJson.scientificName
        idSciName = sciName.split(' ').join('_');
        if (typeof cmCount[sciName] === 'undefined') {cmCount[sciName] = 0;}
        cmCount[sciName]++;
        cmCount['all']++;

        var llLoc = L.latLng(occJson.decimalLatitude, occJson.decimalLongitude);

        var popup = L.popup({
            maxHeight: 200,
            keepInView: true,
        }).setContent(occurrencePopupInfo(occJson, cmCount[sciName]));

        var marker = L.circleMarker(llLoc, {
            //renderer: myRenderer, //using this puts markers behind overlays. do we need it? We do not.
            fillColor: cgColor[taxonName], //interior color
            fillOpacity: 0.5, //values from 0 to 1
            color: "black", //border color
            weight: 1, //border thickness
            radius: cmRadius,
            index: cmCount[sciName],
            occurrence: occJson.scientificName, //occJson.species,
            time: getDateYYYYMMDD(occJson.eventDate)
        }).bindPopup(popup);

        marker.bringToFront(); //this is not necessary, currently. can't hurt though.

        if (typeof cmGroup[sciName] === 'undefined') {
          console.log(`cmGroup[${sciName}] is undefined...adding.`);
          cmGroup[sciName] = await L.layerGroup().addTo(valMap); //create a new, empty, single-species layerGroup to be populated from API
          await speciesLayerControl.addOverlay(cmGroup[sciName], `<span id=${idSciName}>${sciName}</span>`);
          cmGroup[sciName].addLayer(marker); //add this marker to the current layerGroup, which is an ojbect with possibly multiple layerGroups by taxonName
        } else {
          cmGroup[sciName].addLayer(marker); //add this marker to the current layerGroup, which is an ojbect with possibly multiple layerGroups by taxonName
        }

        if (testHarness) {
            marker.bindTooltip(`${cmCount[sciName]}`, {opacity: 0.9});
        } else {
            if (occJson.eventDate) {
                marker.bindTooltip(`${sciName}<br>${getDateYYYYMMDD(occJson.eventDate)}`);
            } else {
                marker.bindTooltip(`${sciName}<br>No date supplied.`);
            }
        }

        if (document.getElementById(idSciName)) {
            //console.log(idSciName, sciName, cmCount[sciName], cmTotal[taxonName]);
            document.getElementById(idSciName).innerHTML = `${sciName} (${cmCount[sciName]}/${cmTotal[taxonName]})`;
        }
        //console.log(sciName, cmCount[sciName], cgColor[taxonName], cmTotal[taxonName]);

    } //end for-loop

    if (document.getElementById("jsonResults")) {
        document.getElementById("jsonResults").innerHTML += ` | records mapped: ${cmCount['all']}`;
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

function occurrencePopupInfo(occRecord, index) {
    var info = '';

    if (testHarness) {info += `Map Index: ${index}<br/>`;}

    Object.keys(occRecord).forEach(function(key) {
        switch(key) {
            case 'raw_institutionCode':
                if ('iNaturalist' == occRecord[key]) {
                    info += `<a href="https://www.inaturalist.org/observations/${occRecord.occurrenceID}" target="_blank">iNaturalist Observation ${occRecord.occurrenceID} </a><br/>`;
/*                } else if ('BISON' == occRecord[key]) {
                    info += `<a href="https://bison.usgs.gov/api/search.jsonp?params=occurrenceID:${occRecord.occurrenceID}" target="_blank">BISON Observation ${occRecord.occurrenceID}</a><br/>`;
*/                } else {
                    info += `Institution: ${occRecord[key]}<br/>`;
                }
                break;
            case 'uuid':
                info += `<a href="https://biocache.vtatlasoflife.org/occurrences/${occRecord[key]}" target="_blank">VAL Data Explorer Occurrence Record </a><br/>`;
                break;
            case 'decimalLatitude':
                info += `Lat: ${occRecord[key]}`;
                break;
            case 'decimalLongitude':
                info += `, Lon: ${occRecord[key]}<br/>`;
                break;
            case 'scientificName':
                info += `Scientific Name: ${occRecord[key]}<br/>`;
                break;
            case 'collector':
                info += `Collector: ${occRecord[key]}<br/>`;
                break;
            case 'basisOfRecord':
                info += `Basis of Record: ${occRecord[key]}<br/>`;
                break;
            case 'eventDate':
                var msecs = occRecord[key]; //epoch date in milliseconds at time 00:00
                //var m = moment.utc(msecs); //convert to UTC. otherwise moment adjusts for locale and alters date to UTC-date-minus-locale-offset.
                //info += `Event Date: ${m.format('MMMM Do YYYY')}<br/>`;
                info += `Event Date: ${getDateMMMMDoYYYY(msecs)}<br/>`;
                break;
            case '':
                info += `: ${occRecord[key]}<br/>`;
                break;
            default: //un-comment this to list all properties
                //info += `${key}: ${occRecord[key]}<br/>`;
            }
        });

    return info;
}

//iterate through all plotted pools in each featureGroup and alter each radius
function SetEachPointRadius(radius = cmRadius) {
  cmRadius = Math.floor(zoomLevel/2);
  Object.keys(cmGroup).forEach((taxonName) => {
    cmGroup[taxonName].eachLayer((cmLayer) => {
      cmLayer.setRadius(radius);
      cmLayer.bringToFront(); //this works, but only when this function is called
    });
  });
}

function addMarker() {
    var marker = L.marker([43.6962, -72.3197]).addTo(valMap);
    marker.bindPopup("<b>Vermont Center for Ecostudies</b>");
}

//standalone module usage
function initValStandalone() {
    addMap();
    addMapCallbacks();
    if (!boundaryLayerControl) {addBoundaries();}
}

//integrated module usage
export function getValOccCanvas(map, taxonName) {
    valMap = map;

    if (taxonName) {
        addMapCallbacks();
        initValOccCanvas();
        cmGroup[taxonName] = L.layerGroup().addTo(valMap); //create a new, empty, single-species layerGroup to be populated from API
        cgColor[taxonName] = cmColors[0];
        cmCount[taxonName] = 0;
        cmTotal[taxonName] = 0;
        getBieSpeciesCallBiocacheLsid(taxonName);
        if (!boundaryLayerControl) {addBoundaries();}
        //if (!sliderControl) {addTimeSlider(taxonName);}
        if (!speciesLayerControl) {
            speciesLayerControl = L.control.layers().addTo(valMap);
            var idTaxonName = taxonName.split(' ').join('_');
            speciesLayerControl.addOverlay(cmGroup[taxonName], `<span id=${idTaxonName}>${taxonName}</span>`);
            speciesLayerControl.setPosition("bottomright");
        }
    } else {
        initValOccCanvas();
    }
}

/*
 * Standalone module setup
 *
 * Required html element where id="valStandalone"
 */
if (document.getElementById("valStandalone")) {
    window.addEventListener("load", function() {

        initValStandalone();

        // Add a listener to handle the 'Get Data' button click
        document.getElementById("getData").addEventListener("click", function() {
            initValOccCanvas();
            if (testData) {
              const taxonName = 'TestData';
              cmGroup[taxonName] = L.layerGroup().addTo(valMap); //create a new, empty, single-species layerGroup to be populated from API
              cgColor[taxonName] = cmColors[0];
              getTestData('../testData/testData.json', taxonName);
            } else {
              const taxonName = getCanonicalName();
              cmGroup[taxonName] = L.layerGroup().addTo(valMap); //create a new, empty, single-species layerGroup to be populated from API
              getBieSpeciesCallBiocacheLsid();
            }
        });

        // Add a listener to handle the 'Get Species Info' button click
        document.getElementById("getInfo").addEventListener("click", function() {
            var data = getAllData();
            var info = '';
            if (data) {
                Object.keys(data).forEach(function(key) {
                    info += `${key}: ${data[key]}` + String.fromCharCode(13);
                });
                alert(info);
            } else {
                alert('No Species Selected.');
            }
            //alert(getCanonicalName());
            //alert(getScientificName());
        });

    });
}

if (document.getElementById("valSurveyBlocksLady")) {
  surveyBlocksLady = true;
  initValStandalone();
}

if (document.getElementById("valSurveyBlocksEAME")) {
  surveyBlocksEAME = true;
  initValStandalone();
}

/*
 * Minimal (map-only) standalone use
 *
 * Requires html element where id="valLoadOnOpen"
 *
 */
if (document.getElementById("valLoadOnOpen")) {
    window.addEventListener("load", function() {

        var urlLoad = window.location.toString();
        urlLoad = decodeURI(urlLoad);
        var speciesStr = urlLoad.substring(urlLoad.lastIndexOf("=")+1);
        console.log(`url-parsed species string: ${speciesStr}`);
        var speciesObj = {};
        try {
          speciesObj = JSON.parse(speciesStr);
          console.log('species object:', speciesObj)
        } catch(error) {
          console.log('ERROR parsing http arugment', speciesStr, 'as JSON:', error);
          alert('Please pass species as object literal like [map-page-url]?species={"Turdus migratorius":"#800000"}');
        }

        initValStandalone();
        valMap.options.minZoom = 8;
        valMap.options.maxZoom = 17;
        //initValOccCanvas();
        //getBieSpeciesCallBiocacheLsid('Bombus borealis');
        if (!boundaryLayerControl) {addBoundaries();}
        if (typeof speciesObj != "object") {
            alert('Please pass an object literal like [map-page-url]?species={"Turdus migratorius":"#800000"}');
        } else {
            getSpeciesListData(speciesObj);
        }

        // Add a listener to handle the 'clear Data' button click
        if (document.getElementById("clearData")) {
            document.getElementById("clearData").addEventListener("click", function() {
                initValOccCanvas();
            });
        }

        // Add a listener to handle the 'Get Data' button click
        if (document.getElementById("getData")) {
            document.getElementById("getData").addEventListener("click", function() {
                getSpeciesListData();
            });
        }
    });
}

/*
 * Add multiple species to map, either passed as an argument or loaded from imported .js file (see top of this file)
 *
 * argSpecies or speciesList must be of the form {"species name": "color", "species name": "color", ...}, and the
 * JSON values must be in double quotes.
 */
function getSpeciesListData(argSpecies = false) {
    cmCount['all'] = 0;
    var i=0;

    if (!speciesLayerControl) {
        speciesLayerControl = L.control.layers().addTo(valMap);
        speciesLayerControl.setPosition("bottomright");
    }

    if (!argSpecies) {
        argSpecies = speciesList;
    }

    //allow an object-value of 'breakout' to set that behavior. use it and delete it.
    if (typeof argSpecies.taxaBreakout != 'undefined') {
      taxaBreakout = argSpecies.taxaBreakout;
      delete argSpecies.taxaBreakout;
    }

    Object.keys(argSpecies).forEach(async function(taxonName) {
        taxonName = taxonName.trim();
        cmGroup[taxonName] = L.layerGroup().addTo(valMap); //create a new, empty, single-species layerGroup to be populated from API
        cmCount[taxonName] = 0;
        cgColor[taxonName] = argSpecies[taxonName]; //define circleMarker color for each species mapped
        cmTotal[taxonName] = 0;
        console.log(`getSpeciesListData: Add species group ${taxonName} with color ${argSpecies[taxonName]}`);
        await getBieSpeciesCallBiocacheLsid(taxonName);
        var idTaxonName = taxonName.split(' ').join('_');
        speciesLayerControl.addOverlay(cmGroup[taxonName], `<span id=${idTaxonName}>${taxonName}</span>`);
        i++;
    });
}

function addMapCallbacks() {
    /*
     * This event is triggered for each 'layeradd', which in our case is for each circleMarker.
     * Doing anything here has major performance hit.
     */
/*
    valMap.on('layeradd', function (event) {
*/
    valMap.on('zoomend', function () {
        console.log(`Map Zoom: ${valMap.getZoom()}`);
    });
    valMap.on('moveend', function() {
        console.log(`Map Center: ${valMap.getCenter()}`);
    });

}

/*
 * Test the map by counting the markers for a taxonName.  This depends upon adding custom
 * options to each marker called 'index' and 'occurrence'.
 * - Count the markers
 * - Verify proper data
 * - Step through each datapoint and toggle its popup
 */
export function testMarkers(taxonName) {
    valMap.eachLayer(function(layer) {
        if ('occurrence' in layer.options) {
            console.log(layer.options.occurrence + ':' + layer.options.index);
            //layer.openTooltip();
            layer.openPopup();
            alert(layer.options.occurrence + ':' + layer.options.index);
            layer.closeTooltip();
        }
    });
}
