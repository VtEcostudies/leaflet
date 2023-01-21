/*
- Show VT priority blocks on a map of VT
- Load a json array from GBIF Occurrence API and populate the map with point occurrence data
*/
import { occData, getOccsByFilters, getOccsFromFile } from './fetchGbifOccs.js';

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
var groupLayerControl = false;
var sliderControl = false;
var xhrRecsPerPage = 1000; //the number of records to load per ajax request.  more is faster.
var totalRecords = 0;
var vtWKT = "POLYGON((-73.3427 45.0104,-73.1827 45.0134,-72.7432 45.0153,-72.6100 45.0134,-72.5551 45.0075,-72.4562 45.0090,-72.3113 45.0037,-72.0964 45.0066,-71.9131 45.0070,-71.5636 45.0138,-71.5059 45.0138,-71.5294 44.9748,-71.4949 44.9123,-71.5567 44.8296,-71.6281 44.7506,-71.6061 44.7077,-71.5677 44.6481,-71.5388 44.5817,-71.6006 44.5533,-71.5746 44.5308,-71.5883 44.4955,-71.6556 44.4504,-71.7146 44.4093,-71.7957 44.3975,-71.8163 44.3563,-71.8698 44.3327,-71.9138 44.3484,-71.9865 44.3386,-72.0346 44.3052,-72.0428 44.2432,-72.0662 44.1930,-72.0360 44.1349,-72.0580 44.0698,-72.1101 44.0017,-72.0937 43.9671,-72.1252 43.9088,-72.1733 43.8682,-72.1994 43.7899,-72.1994 43.7899,-72.2392 43.7384,-72.3010 43.7056,-72.3271 43.6391,-72.3436 43.5893,-72.3793 43.5814,-72.3972 43.5027,-72.3807 43.4988,-72.3999 43.4150,-72.4123 43.3601,-72.3903 43.3591,-72.4081 43.3282,-72.3999 43.2762,-72.4370 43.2342,-72.4493 43.1852,-72.4480 43.1311,-72.4507 43.0679,-72.4438 43.0067,-72.4699 42.9846,-72.5276 42.9645,-72.5331 42.8951,-72.5633 42.8639,-72.5098 42.7863,-72.5166 42.7652,-72.4741 42.7541,-72.4590 42.7289,-73.2761 42.7465,-73.2912 42.8025,-73.2850 42.8357,-73.2678 43.0679,-73.2472 43.5022,-73.2561 43.5615,-73.2939 43.5774,-73.3049 43.6271,-73.3557 43.6271,-73.3976 43.5675,-73.4326 43.5883,-73.4285 43.6351,-73.4079 43.6684,-73.3907 43.7031,-73.3516 43.7701,-73.3928 43.8207,-73.3832 43.8533,-73.3969 43.9033,-73.4086 43.9365,-73.4134 43.9795,-73.4381 44.0427,-73.4141 44.1058,-73.3928 44.1921,-73.3427 44.2393,-73.3186 44.2467,-73.3406 44.3484,-73.3385 44.3690,-73.2946 44.4328,-73.3296 44.5367,-73.3832 44.5919,-73.3770 44.6569,-73.3681 44.7477,-73.3317 44.7857,-73.3324 44.8043,-73.3818 44.8398,-73.3564 44.9040,-73.3392 44.9181,-73.3372 44.9643,-73.3537 44.9799,-73.3447 45.0046,-73.3447 45.0109,-73.3426 45.0104,-73.3427 45.0104))";
var stateLayer = false;
var countyLayer = false;
var townLayer = false;
var bioPhysicalLayer = false;
var geoGroup = false; //geoJson boundary group for ZIndex management
var testHarness = false;
var taxaBreakout = 0; //flag to break sub-taxa into separate layers with counts.
var showAccepted = 0; //flag to show taxa by acceptedScientificName instead of scientificName
var baseMapDefault = null;
var abortData = false;

var nameType = 0; //0=scientificName, 1=commonName (not implemented yet)

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

    baseMapDefault = esriTopo; //for use elsewhere, if necessary
    valMap.addLayer(baseMapDefault); //and start with that one

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
async function addBoundaries(layerPath=false, layerName='New', layerId=9) {

    if (boundaryLayerControl === false) {
        boundaryLayerControl = L.control.layers().addTo(valMap);
    } else {
        console.log('boundaryLayerControl already added.')
        return;
    }
    boundaryLayerControl.setPosition("bottomright");

    geoGroup = new L.FeatureGroup();
    addGeoJsonLayer('geojson/Polygon_VT_State_Boundary.geojson', "State", 0, boundaryLayerControl, geoGroup);
    addGeoJsonLayer('geojson/Polygon_VT_County_Boundaries.geojson', "Counties", 1, boundaryLayerControl, geoGroup, !layerPath);
    addGeoJsonLayer('geojson/Polygon_VT_Town_Boundaries.geojson', "Towns", 2, boundaryLayerControl, geoGroup);
    addGeoJsonLayer('geojson/Polygon_VT_Biophysical_Regions.geojson', "Biophysical Regions", 3, boundaryLayerControl, geoGroup);

    if (layerPath) {
      addGeoJsonLayer(layerPath, layerName, layerId, boundaryLayerControl, geoGroup, true);
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
        valMap.fitBounds(layer.getBounds()); // event.target._map.fitBounds(layer.getBounds());
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
    if (9 == layer.options.id)  { //Butterfly Atlas Survey Blocks
      //https://docs.google.com/forms/d/e/1FAIpQLSegdid40-VdB_xtGvHt-WIEWR_TapHnbaxj-LJWObcWrS5ovg/viewform?usp=pp_url&entry.1143709545=SURVEYBLOCK
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
              if (obj[key] == 'PRIORITY') {
                tips = '<b><u>Butterfly Atlas Priority Block</u></b><br>' + tips;
              } else if (obj[key] == 'NONPRIOR') {
                tips = 'Non-priority Block<br>' + tips;
              } else {
                tips = `${obj[key]}<br>` + tips;
              }
              break;
          }
          if (feature.properties.BLOCKNAME)
            //&& (feature.properties.BLOCK_TYPE=='PRIORITY' || feature.properties.BLOCK_TYPE=='PRIORITY1'))
          {
            var name = feature.properties.BLOCKNAME;
            var link = feature.properties.BLOCKNAME.replace(/( - )|\s+/g,'').toLowerCase();
            if (feature.properties.BLOCK_TYPE=='PRIORITY') {
              pops = `<b><u>BUTTERFLY ATLAS PRIORITY BLOCK</u></b></br>`;
            } else {
              pops = `<b><u>BUTTERFLY ATLAS SURVEY BLOCK</u></b></br>`;
            }
            pops += `<a target="_blank" href="https://s3.us-west-2.amazonaws.com/val.surveyblocks/${link}.pdf">Get ${name} block map</a></br>`;
            pops += `<a target="_blank" href="https://docs.google.com/forms/d/e/1FAIpQLSegdid40-VdB_xtGvHt-WIEWR_TapHnbaxj-LJWObcWrS5ovg/viewform?usp=pp_url&entry.1143709545=${link}">Signup for ${name}</a>`;
            //pops += `<a target="_blank" href="https://val.vtecostudies.org/projects/butterfly-atlas-2/signup?surveyblock=${link}">Signup for ${name}</a>`
          }
        }
        if (tips) {layer.bindTooltip(tips);}
        if (pops) {layer.bindPopup(pops);}
    }
  } //end Butterfly Atlas Survey Blocks code
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
 * Clear any markers from the map
 */
function initGbifOccCanvas() {
    //console.log(`initGbifOccCanvas()`);
    cmCount['all'] = 0;
    //remove all circleMarkers from each group by clearing the layer
    Object.keys(cmGroup).forEach(function(key) {
        console.log(`Clear layer '${key}'`);
        cmGroup[key].clearLayers();
        console.log(`Remove control layer for '${key}'`);
        if (groupLayerControl) groupLayerControl.removeLayer(cmGroup[key]);
        delete cmGroup[key];
        delete cmCount[key];
        delete cmTotal[key];
        delete cgColor[key];
    });
    console.log(`Remove species layer control from map`);
    if (groupLayerControl) {valMap.removeControl(groupLayerControl);}
    groupLayerControl = false;
}

function abortDataLoad() {
  console.log('abortDataLoad request received.');
  abortData = true;
}

/*
  This now automatically breaks taxa into sub-taxa. To disable this feature, set the global flag

    taxaBreakout = 0;
*/
async function addToMap(occJsonArr, groupField='datasetKey', groupColor='Red') {
  let sciName;
  let canName;
  cmTotal[groupField] = 0;
  for (var i = 0; i < occJsonArr.length; i++) {
      var occJson = occJsonArr[i];

      let grpName = groupField; //begin by assigning all occs to same group
      if (occJson[groupField]) {grpName = occJson[groupField];} //if the dataset has groupField, get the value of the json element for this record...
      let idGrpName = grpName.split(' ').join('_');
      if (typeof cmCount[grpName] === 'undefined') {cmCount[grpName] = 0;}
      cmTotal[grpName]++;

      sciName = occJson.scientificName;
      canName = parseCanonicalFromScientific(occJson);
      if (canName) {sciName = canName;}

      //filter out records without lat/lon location
      //ToDo: Add these to a common, random lat/lon in VT so they show up on the map?
      if (!occJson.decimalLatitude || !occJson.decimalLongitude) {
        if (typeof cmCount['missing'] === 'undefined') {cmCount['missing'] = 0;}
        cmCount['missing']++;
        console.log('WARNING: Occurrence Record without Lat/Lon values:', occJson.key, 'missing:', cmCount['missing'], 'count:', cmCount['all']);
        continue;
      }

      var llLoc = L.latLng(occJson.decimalLatitude, occJson.decimalLongitude);
      cmCount[grpName]++; //count occs having location data

      var popup = L.popup({
          maxHeight: 200,
          keepInView: true,
      }).setContent(occurrencePopupInfo(occJson, cmCount[grpName]));

      var marker = L.circleMarker(llLoc, {
          fillColor: cgColor[sciName] ? cgColor[grpName] : groupColor, //interior color
          fillOpacity: 0.5, //values from 0 to 1
          color: "black", //border color
          weight: 1, //border thickness
          radius: cmRadius,
          index: cmCount[grpName],
          occurrence: occJson.scientificName, //occJson.species,
          time: getDateYYYYMMDD(occJson.eventDate)
      }).bindPopup(popup);

      marker.bringToFront(); //this is not necessary, currently. can't hurt though.
      marker.addTo(valMap);

      if (typeof cmGroup[grpName] === 'undefined') {
        console.log(`cmGroup[${grpName}] is undefined...adding.`);
        cmGroup[grpName] = L.layerGroup().addTo(valMap); //create a new, empty, single-species layerGroup to be populated from API
        if (groupLayerControl) {groupLayerControl.addOverlay(cmGroup[grpName], `<label id="${idGrpName}">${grpName}</label>`);}
        cmGroup[grpName].addLayer(marker); //add this marker to the current layerGroup, which is an object with possibly multiple layerGroups by sciName
      } else {
        cmGroup[grpName].addLayer(marker); //add this marker to the current layerGroup, which is an object with possibly multiple layerGroups by sciName
      }

      if (occJson.eventDate) {
          marker.bindTooltip(`${sciName}<br>${getDateYYYYMMDD(occJson.eventDate)}`);
      } else {
          marker.bindTooltip(`${sciName}<br>No date supplied.`);
      }
  } //end for-loop

  if (document.getElementById("jsonResults")) {
      document.getElementById("jsonResults").innerHTML += ` | records mapped: ${cmCount['all']}`;
  }

  //cmGroup's keys are sciNames, not elementIds...
  var id = null;
  Object.keys(cmGroup).forEach((grpName) => {
    id = grpName.split(' ').join('_');
    if (document.getElementById(id)) {
        console.log(`-----match----->> ${id} | ${grpName}`, cmCount[grpName], cmTotal[grpName]);
        document.getElementById(id).innerHTML = `${grpName} (${cmCount[grpName]}/${cmTotal[grpName]})`;
    }
  });
}


function parseCanonicalFromScientific(occJson) {
  var toks = occJson.scientificName.split(' ');
  var name = null;
  switch(occJson.taxonRank.toUpperCase()) {
    case 'SUBSPECIES':
    case 'VARIETY':
    case 'FORM':
      name = `${toks[0]} ${toks[1]} ${toks[2]}`;
      break;
    case 'SPECIES':
      name = `${toks[0]} ${toks[1]}`;
      name = occJson.species;
      break;
    case 'GENUS':
    default:
      name = `${toks[0]}`;
      break;
  }
  return name;
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
                } else {
                    info += `Institution: ${occRecord[key]}<br/>`;
                }
                break;
            case 'gbifID':
            case 'key':
                info += `<a href="https://www.gbif.org/occurrence/${occRecord[key]}" target="_blank">GBIF Occurrence Record </a><br/>`;
                break;
            case 'decimalLatitude':
                info += `Lat: ${occRecord[key]}<br/>`;
                break;
            case 'decimalLongitude':
                info += `Lon: ${occRecord[key]}<br/>`;
                break;
            case 'scientificName':
                info += `Scientific Name: ${occRecord[key]}<br/>`;
                break;
            case 'collector':
                info += `Collector: ${occRecord[key]}<br/>`;
                break;
            case 'recordedBy':
                info += `Recorded By: ${occRecord[key]}<br/>`;
                break;
            case 'basisOfRecord':
                info += `Basis of Record: ${occRecord[key]}<br/>`;
                break;
            case 'eventDate':
                var msecs = occRecord[key]; //epoch date in milliseconds at time 00:00
                info += `Event Date: ${getDateMMMMDoYYYY(msecs)}<br/>`;
                break;
            case 'datasetName':
                info += `Dataset Name: ${occRecord[key]}<br/>`;
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
  Object.keys(cmGroup).forEach((name) => {
    cmGroup[name].eachLayer((cmLayer) => {
      cmLayer.setRadius(radius);
      cmLayer.bringToFront(); //this works, but only when this function is called
    });
  });
}

//standalone module usage
function initGbifStandalone(layerPath=false, layerName) {
    addMap();
    addMapCallbacks();
    if (!boundaryLayerControl) {addBoundaries(layerPath, layerName);}
}

if (document.getElementById("valSurveyBlocksLady")) {
  let layerPath = 'geojson/lady_beetle_priority_blocks.geojson';
  let layerName = 'Survey Blocks - Lady Beetles';
  initGbifStandalone(layerPath, layerName);
}

if (document.getElementById("valSurveyBlocksEAME")) {
  let layerPath = 'geojson/EAME_Priority_Blocks.geojson';
  let layerName = 'Survey Blocks - EAME';
  initGbifStandalone(layerPath, layerName);
}

if (document.getElementById("valSurveyBlocksVBA")) {
  let layerPath = 'geojson/surveyblocksWGS84_orig.geojson';
  let layerName = 'Survey Blocks - VBA2';
  initGbifStandalone(layerPath, layerName);
  if (!groupLayerControl) {
    groupLayerControl = L.control.layers().addTo(valMap);
    groupLayerControl.setPosition("bottomright");
  }
  //getFileData('vtb1');
}

async function getLiveData(dataset='vba2') {
  let page = {};
  let lim = 300;
  let off = 0;
  let max = 1000;
  do {
    page = await getOccsByFilters(off, lim);
    addToMap(page.results);
    off += lim;
  } while (!page.endOfRecords && !abortData && off<max);
}

async function getFileData(dataset='vba1') {
  let occF = await getOccsFromFile(dataset);
  addToMap(occF.rows, occData[dataset].description, occData[dataset].color);
}

/*
 * Clear any markers from the map
 */
function clearData() {
  cmCount['all'] = 0;
  //remove all circleMarkers from each group by clearing the layer
  Object.keys(cmGroup).forEach((key) => {
      console.log(`Clear layer '${key}'`);
      cmGroup[key].clearLayers();
      console.log(`Remove control layer for '${key}'`);
      if (groupLayerControl) groupLayerControl.removeLayer(cmGroup[key]);
      delete cmGroup[key];
      delete cmCount[key];
      delete cmTotal[key];
      delete cgColor[key];
  });
  /*
  console.log(`Remove group layer control from map`);
  if (groupLayerControl) {valMap.removeControl(groupLayerControl);}
  groupLayerControl = false;
  */
}

function addMapCallbacks() {
    valMap.on('zoomend', function () {
        console.log(`Map Zoom: ${valMap.getZoom()}`);
    });
    valMap.on('moveend', function() {
        console.log(`Map Center: ${valMap.getCenter()}`);
    });
}

// Add a listener to handle the 'Get Data' button clicks
if (document.getElementById("getVtb1")) {
  document.getElementById("getVtb1").addEventListener("click", async () => {
    abortData = false;
    getFileData('vtb1');
  });
}
if (document.getElementById("getVtb2")) {
  document.getElementById("getVtb2").addEventListener("click", async () => {
    abortData = false;
    getFileData('vtb2');
  });
}
if (document.getElementById("getVba1")) {
  document.getElementById("getVba1").addEventListener("click", async () => {
    abortData = false;
    getFileData('vba1');
  });
}
// Add a listener to handle the 'Clear Data' button click
if (document.getElementById("clearData")) {
  document.getElementById("clearData").addEventListener("click", async () => {
    abortData = false;
    clearData();
  });
}
// Add a listener to handle the 'Get Data' button click
if (document.getElementById("abortData")) {
  document.getElementById("abortData").addEventListener("click", async () => {
      abortData = true;
  });
}
