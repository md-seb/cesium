const toolbar = document.getElementById("toolbar");
const hud = document.getElementById("hud");

Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1OTJiNzMyYS1kMGYxLTQ3NTktODNlYy0zOWE0NDNlNWQxNzAiLCJpZCI6Mjk2MDcsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1OTI0MjQ2NzZ9.cnBEhU94t46InbAuZUG6hLmdREVHgM43LXX3CEj9BNU";

const viewer = new Cesium.Viewer("cesiumContainer", {
  // clock,
  mapProjection: new Cesium.WebMercatorProjection(),

  // massive perf win and battery save
  // https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/
  requestRenderMode: true,
  maximumRenderTimeChange: 300,

  // good looks
  terrainProvider: Cesium.createWorldTerrain({
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
    requestVertexNormals: true,
    requestWaterMask: true,
  }),
  terrainExaggeration: 1.5,
  // good perf
  // terrainProvider: new Cesium.EllipsoidTerrainProvider({
  //   tilingScheme: new Cesium.WebMercatorTilingScheme()
  // })
});

//Add Cesium Inspector
// viewer.extend(Cesium.viewerCesiumInspectorMixin);

// Start off looking at UK.
viewer.camera.setView({
  destination: Cesium.Rectangle.fromDegrees(-5, 60, 5, 50),
});

var scene = viewer.scene;
scene.debugShowFramesPerSecond = true;
// scene.globe.enableLighting = true;
// scene.globe.dynamicAtmosphereLighting = true;

function dataCallback(interval, index) {
  var time;
  if (index === 0) {
    time = Cesium.JulianDate.toIso8601(interval.stop);
  } else {
    time = Cesium.JulianDate.toIso8601(interval.start);
  }

  return {
    TIME: time,
  };
}

const twoDaysObs = moment().startOf("date").subtract(2, "days").toISOString();
const twoDaysFcast = moment().startOf("date").add(2, "days").toISOString();
const iso8601 = [twoDaysObs, twoDaysFcast, "PT5M"].join("/");
const providerInterval = new Cesium.TimeIntervalCollection.fromIso8601({
  iso8601,
  dataCallback,
});
console.log("providerInterval", iso8601);

const MdWmsLayer = (layerId = "Radar", alpha = 1.0, title) => {
  const layer = layerId;

  // MetDesk WMS integration
  const mdUrl = `/proxy/http://lb-wms.metdesk.com:8008/metdesk?SERVICE=WMS&VERSION=1.3.0&`;
  const mdParams = new URLSearchParams({
    CRS: "EPSG:900913",
    TRANSPARENT: "TRUE",
    TIME: "{TIME}",

    // JPG
    REQUEST: "GetGTile",
    LAYER: layer,
    TILEZOOM: "{TileMatrix}",
    TILEROW: "{TileRow}",
    TILECOL: "{TileCol}",

    // SVG
    // REQUEST: 'GetMap',
    // LAYERS: '{TileMatrixSet}',
    // FORMAT: 'image/png',
    // WIDTH: 320,
    // HEIGHT: 320,
    // BBOX: [-180, 180, -90, 90],
  }).toString();

  const mdWms = new Cesium.WebMapTileServiceImageryProvider({
    url: mdUrl + mdParams,
    layer,
    style: "default",
    clock: viewer.clock,
    times: providerInterval,
    tileMatrixSetID: "dontKnow",
  });
  let wmsLayer;
  // viewer.imageryLayers.addImageryProvider(mdWms);

  const toggler = document.createElement("button");
  toggler.id = layerId;
  toggler.setAttribute("type", "button");
  toggler.classList.add("cesium-button");
  toggler.classList.add("inactive");
  toggler.innerHTML = title || layerId;
  toggler.addEventListener(
    "click",
    function () {
      if (wmsLayer) {
        viewer.imageryLayers.remove(wmsLayer);
        toggler.classList.add("inactive");
        wmsLayer = undefined;
      } else {
        wmsLayer = viewer.imageryLayers.addImageryProvider(mdWms);
        wmsLayer.alpha = alpha;
        toggler.classList.remove("inactive");
      }
    },
    false
  );
  toolbar.appendChild(toggler);

  return wmsLayer;
};

const nrLayers = [
  "nrwms-Pressure",
  "nrwms-precip_type",
  "nrwms-jet_stream",
  "nrwms-infrared",
  "nrwms-EffectiveCloud",
  "nrwms-24hrPrecipTotal",
  "nrwms-Pressure-precip",
];

// LAYERS

const obsLayers = ["Radar", "watervapour", "enhanced_IR"];

const ecmwfLayers = [
  "ECMWF-Pressure_global",
  "ECMWF-3hrPrecipTotal_global",
  "ECMWF-2mAirTemp_global",
  "ECMWF-EffectiveCloud_global",
  "ECMWF-2mDewTemp_global",
  "ECMWF-precip_type",
  "ECMWF-850-wetbulb_pottemp",
  "ECMWF-700mbRH_global",
];

[
  //...obsLayers,
  ...ecmwfLayers,
  //...nrLayers
].map((i) => MdWmsLayer(i, 0.7));

console.log(viewer.imageryLayers);

// 3D Lightning Strikes from CZML
// const strikesSource = new Cesium.CzmlDataSource('Strikes');
// viewer.dataSources.add(strikesSource);
// strikesSource.load("strikes.czml").then((x) => {
//    console.log('zoom', x);
//    // viewer.zoomTo(viewer.entities);
//  })

//  viewer.dataSources.add(
//    Cesium.CzmlDataSource.load("strikes.czml")
//  );

var start = Cesium.JulianDate.clone(providerInterval.start);
var stop = Cesium.JulianDate.clone(providerInterval.stop);

viewer.timeline.zoomTo(start, stop);
console.log(providerInterval.start.toString());
console.log(providerInterval.stop.toString());
var clock = viewer.clock;
clock.startTime = start;
clock.stopTime = stop;
clock.currentTime = start;
clock.clockRange = Cesium.ClockRange.LOOP_STOP;
clock.multiplier = 200;

console.log(viewer);
