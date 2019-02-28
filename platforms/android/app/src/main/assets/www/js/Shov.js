"use strict";
function Shov() {
    this.beacons = {};
    this.bkeys = [];

    this.onBeaconInit = function() {};
    this.onInit = function() {};

    this.addBeacon = function (doc) {
        var beacon = new Beacon(doc);
        this.beacons[doc._id] = beacon;
        this.bkeys.push(doc._id);
        this.onBeaconInit.bind(beacon)()
    }
    this.populateBeacons = function(shov) {
        $.getJSON("http://omaraa.ddns.net:62027/db/all/beacons", function(r){
            for(var b in r){
               $.get("http://omaraa.ddns.net:62027/db/beacons/" + r[b] , function(doc) {
                   shov.addBeacon(doc)
               });
            }
        });
    }

    this.init = function() {
        this.populateBeacons(this);
        this.onInit.bind(this)();
    }
}

function Beacon(doc) {
    this.doc = doc; 
    this.kf = new KalmanFilter({R: 0.008, Q: 10})

    this.update = function(rssi) {
        var offset = this.doc.offset
        var a = 0.1
        
        if(this.p != null) {
          var max = Math.max(rssi, this.p)
          var min = Math.min(rssi, this.p)
          this.p = min*a+max*(1-a)
          
        } else {
          this.p = rssi;
        }
        this.rssik = this.kf.filter(rssi);
      
        if(this.doc._id == "905bfc88fdb5f32d") {
         // Plotly.plot(plot, {y: this.rssik}, {margin: {t:0}});
        }
        this.distance = Math.pow(10, (offset-this.p)/20);
        this.txt.text(this.doc._id+"\ndis: " + this.distance + "\nrssi: " + this.p);
      }
}


  
  