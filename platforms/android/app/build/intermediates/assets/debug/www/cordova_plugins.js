cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
  {
    "id": "cordova-plugin-bluetoothle.BluetoothLe",
    "file": "plugins/cordova-plugin-bluetoothle/www/bluetoothle.js",
    "pluginId": "cordova-plugin-bluetoothle",
    "clobbers": [
      "window.bluetoothle"
    ]
  }
];
module.exports.metadata = 
// TOP OF METADATA
{
  "cordova-plugin-whitelist": "1.3.3",
  "cordova-plugin-browsersync": "0.1.7",
  "cordova-plugin-bluetoothle": "4.5.3"
};
// BOTTOM OF METADATA
});