var stage;
var bglayer;
var fglayer;
var layer;
var gridlayer;
var msgtext;
var addedBeacons = [];
var group;
var beacons = {};
var rssimap;
var grid;
var origin = {};
origin.x = 307;
origin.y = 554;
var scale = {};
scale.y = -11.2;
scale.x = 10.9;
var plot = document.getElementById('plot');


function asHexString(i) {
  var hex;

  hex = i.toString(16);

  // zero padding
  if (hex.length === 1) {
      hex = "0" + hex;
  }

  return hex;
}
function parseAdvertisingData(buffer) {
  var length, type, data, i = 0, advertisementData = {};
  var bytes = new Uint8Array(buffer);

  while (length !== 0) {

      length = bytes[i] & 0xFF;
      i++;

      // decode type constants from https://www.bluetooth.org/en-us/specification/assigned-numbers/generic-access-profile
      type = bytes[i] & 0xFF;
      i++;

      data = bytes.slice(i, i + length - 1).buffer; // length includes type byte, but not length byte
      i += length - 2;  // move to end of data
      i++;

      advertisementData[asHexString(type)] = data;
  }

  return advertisementData;
}

var app = {
  initialize: function() {
      this.bindEvents();
  },
  bindEvents: function() {
      document.addEventListener('deviceready', this.onDeviceReady, false);
  },
  onDeviceReady: function() {
    bluetoothle.initialize(app.startScan);
      
  },
  startScan: function(status) {
      // scan for all devices
      bluetoothle.startScan(app.onDiscoverDevice, app.onError, {
        "scanMode": bluetoothle.SCAN_MODE_LOW_LATENCY,
        //"matchMode": bluetoothle.MATCH_MODE_AGGRESSIVE,
      });
  },
  onDiscoverDevice: function(device) {
    //console.log(device)
    var rssi = device.rssi;
    var data = parseAdvertisingData(bluetoothle.encodedStringToBytes(device.advertisement));  
    var str = ""

    new Uint8Array(data["16"]).slice(3, 11).forEach(e=>str+=asHexString(e))
    
  //console.log('RSSI: ' + rssi +"\ndata: " + str);
  if(str in beacons)
    beacons[str].update(rssi);
    
  },
  onError: function(reason) {
      console.log(reason)
  }
};

function probabilityFunc(upos, bpos, mean, std) {
  var dist = Math.sqrt((upos.x-bpos.x) ** 2 + (upos.y - bpos.y)**2);
  var A = Math.exp(-((dist-mean)**2)/(2*(std)**2));
  var B = 1/(std*Math.sqrt(2*Math.PI));
  return A*B;
}

function heatMapColorforValue(value){
  var h = (1.0 - value) * 240
  return "hsl(" + h + ", 100%, 50%)";
}

function updateState() {
  var max = 0;
  var mxx = 0;
  var myy = 0;
  for(var x = 0; x < 30; x++) {
    for(var y = 0; y < 30; y++) {
      var upos = {x:x, y:y};
      var value = 0;

      for(var bid  in beacons) {
        var b = beacons[bid]
        var x2 = b.lbl.x();
        var y2 = b.lbl.y();
        var d = b.distance;
        if(typeof(d) != 'number' || isNaN(d)) {
          continue;
        }
        var bpos = {x: (x2-origin.x)/scale.x, y: (y2-origin.y)/scale.y};
        value += probabilityFunc(upos, bpos, d, d);
        
      }
      if(value > max) {
       mxx = x;
       myy = y;
       max = value; 
      }
      //console.log(value)
      grid[x][y].fill(heatMapColorforValue(value));

    }
  }
  grid[mxx][myy].fill("red");
  gridlayer.batchDraw()
  layer.batchDraw();
}

function writeMessage(message) {
  msgtext.setText(message);
  fglayer.draw();
}

$(function($) {
    setupKonva();
    populateBeacons();
    setInterval(updateState, 1000);
    app.initialize();
});
  

function AddSelectedBeacon() {
    var selectedBeacon = $("#beaconlist").children('option').filter(":selected");
    var bid = selectedBeacon.val();
    var transform = stage.getAbsoluteTransform().copy();

            // to detect relative position we need to invert transform
            transform.invert();

            // now we find relative point
            var pos = stage.getPointerPosition();

            var mousepos = transform.point(pos);
    if(addBeacon(bid, mousepos.x, mousepos.y)) {
      selectedBeacon.attr('disabled', 'disabled')
      $("#beaconlist").val("")
    }
}

var k = 10
function updateBeacon(rssi) {


  var offset = this.doc.offset

  //this.rssis.push(rssi);
  
  //++this.rssii 

  //var n = this.rssii-1;
  var a = 0.1
  
  if(this.p != null) {
    var max = Math.max(rssi, this.p)
    var min = Math.min(rssi, this.p)
    this.p = min*a+max*(1-a)
    
  } else {
    this.p = rssi;
  }
  this.rssik = this.kf.filter(rssi)

  if(this.doc._id == "905bfc88fdb5f32d") {
   // Plotly.plot(plot, {y: this.rssik}, {margin: {t:0}});
  }
  this.distance = Math.pow(10, (offset-this.rssik)/20);
  this.txt.text(this.doc._id+"\ndis: " + this.distance + "\nrssi: " + this.rssik);
}

function addBeacon(doc) {
    var bid = doc._id;
    var x = doc.xpos*scale.x + origin.x;
    var y = doc.ypos*scale.y + origin.y;
    if(bid=="") return false;

    var beacon = {};
    beacon.doc = doc; 
    
    var label = new Konva.Label({
      x: x,
      y: y,
      draggable: true
    });

    label.add(new Konva.Tag({
            fill: 'black',
            pointerDirection: 'down',
            pointerWidth: 10,
            pointerHeight: 10,
            lineJoin: 'round',
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOffset: 10,
            shadowOpacity: 0.5
        }));
        beacon.txt = new Konva.Text({
          text: bid,
          fontFamily: 'Calibri',
          fontSize: 18,
          padding: 5,
          fill: 'white'
      });
    label.add(beacon.txt);

    label.on('dragmove', function () {
      var pos = this;
      var x = pos.x();
      var y = pos.y();
      writeMessage('x: ' + (x-origin.x)/scale.x + ', y: ' + (y-origin.y)/scale.y);
    });

    beacon.lbl = label;
    
    layer.add(label);
    layer.draw();
    beacon.update = updateBeacon.bind(beacon);
    beacon.rssis = []
    beacon.rssit = []
    beacon.predict = []
    beacon.rssii = 0;
    beacon.kf = new KalmanFilter({R: 0.008, Q: 10})
    addedBeacons.push(beacon);
    beacons[bid] = beacon;
    return true;
};

function populateBeacons() {
  $.getJSON("http://omaraa.ddns.net:62027/db/all/beacons", function(r){
      var beaconsr = r
      console.log(r)
      var select = $("#beaconlist")

      for(var b in beaconsr){
        var newoption = $("<option></option>")
        newoption.text(beaconsr[b])
        newoption.val(beaconsr[b])
        newoption.appendTo(select)
      }

      for(var b in beaconsr){
         $.get("http://omaraa.ddns.net:62027/db/beacons/" + beaconsr[b] , function(r){
          console.log(r);
            addBeacon(r);
            var selectedBeacon = $("#beaconlist option[value="+r._id+"]");
            selectedBeacon.attr('disabled', 'disabled')
         });
      }
  });
}

function setupKonva() {

  var width = window.innerWidth;
  var height = window.innerHeight;
    // first we need to create a stage
  stage = new Konva.Stage({
    container: 'kc',   // id of container <div>
    width: width,
    height: height,
    draggable: true
  });
  bglayer = new Konva.Layer();
  fglayer = new Konva.Layer();
  // then create layer
  layer = new Konva.Layer();
  gridlayer  = new Konva.Layer();

  // create our shape
  var circle = new Konva.Circle({
    x: stage.getWidth() / 2,
    y: stage.getHeight() / 2,
    radius: 70,
    fill: 'red',
    stroke: 'black',
    strokeWidth: 4,
    draggable: true
  });

  msgtext = new Konva.Text({
      x: 10,
      y: 10,
      fontFamily: 'Calibri',
      fontSize: 24,
      text: '',
      fill: 'black'
    });
  
  setGrid();
  setFloorplan()

  stage.on('dblclick touchstart', AddSelectedBeacon);

  // add the shape to the layer
  layer.add(circle);
  //layer.draggable = true

  fglayer.add(msgtext)

  // add the layer to the stage
  stage.add(bglayer);
  stage.add(gridlayer);
  stage.add(layer);
  
  stage.add(fglayer);

  // draw the image
  stage.draw();

  var scrollContainer = document.getElementById('scroll-container');
        scrollContainer.addEventListener('scroll', function () {
            var dx = scrollContainer.scrollLeft;
            var dy = scrollContainer.scrollTop;
            stage.container().style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
            stage.x(-dx);
            stage.y(-dy);
            stage.batchDraw();
  })
}

function setFloorplan() {

  var imageObj = new Image()
  imageObj.onload = function() {
      var floorplan = new Konva.Image({
        x: 0,
        y: 0,
        image: this,
        width: this.width,
        height: this.height,
        //draggable: true
      });
      console.log(floorplan)
      bglayer.add(floorplan);
      bglayer.draw();
  };
  imageObj.src = "http://omaraa.ddns.net:62027/db/buildings/eb2/floor1.png"
}


/*$("#floorplan").change(function(event) {
  var file = this.files[0]

  var imageObj = new Image()
  imageObj.onload = function() {
      var floorplan = new Konva.Image({
        x: 0,
        y: 0,
        image: this,
        width: this.width,
        height: this.height
      });
      console.log(floorplan)
      bglayer.add(floorplan);
      bglayer.draw();
  };
  imageObj.src = e.target.result

  var reader = new FileReader();
    reader.onload = function (e) {
      
    };
  reader.readAsDataURL(file);
});*/

$("#save").click(function() {
  for(var i = 0; i < addedBeacons.length; i++) {
    var beacon = addedBeacons[i];
    var x = beacon.lbl.x()
    var y = beacon.lbl.y()
    console.log({"xpos": (x-origin.x)/scale.x, "ypos": (y-origin.y)/scale.y});
      $.ajax({
        url: 'http://omaraa.ddns.net:62027/db/beacons/' + beacon.bid, 
        type: 'PUT',
        data: JSON.stringify({"xpos": (x-origin.x)/scale.x, "ypos": (y-origin.y)/scale.y})
      });
  }
});

function scaleX(x) {
  return x*scale.x + origin.x;
}

function scaleY(y) {
  return y*scale.y + origin.y;
}

function setGrid() {
  grid = new Array(30);
  for(var i = 0; i < 30; i++) {
    grid[i] = new Array(30);
  }

  for(var x = 0; x < 30; x++) {
    for(var y = 0; y < 30; y++) {
      var upos = {x:x, y:y};
      var value = 0;

      grid[x][y] = new Konva.Rect(
        {
          x:scaleX(x),
          y:scaleY(y)-10,
          width:10,
          height:10,
          fill: 'black'
        }
      );

        gridlayer.add(grid[x][y]);
    }
  }
  gridlayer.batchDraw();
}