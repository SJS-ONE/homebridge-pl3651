
const PL3651 = require("./pl3651")
var Accessory, Service, Characteristic, UUIDGen;


module.exports = function(homebridge) {
    console.log("homebridge API version: " + homebridge.version);
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
  
    homebridge.registerAccessory("homebridge-pl3651", "PL3651", PL3651Accessory, false);
};

function PL3651Accessory(log, config, api) {
	this.log = log;
	this.config = config;
	this.name = config.name || 'RGBW Controller';
    this.setup = config.setup || 'RGBW';
    this.channel = config.channel || 0
    this.ip = config.ip;
    this.color = {H: 255, S:100, L:50};
    this.purewhite = config.purewhite || false;
    this.pl = new PL3651(config.ip)
    this.pl.reset()
    this.power = false
}

PL3651Accessory.prototype.identify = function(callback) {
	this.log('Identify requested!');
    callback();
};

PL3651Accessory.prototype.getServices = function() {
	let informationService = new Service.AccessoryInformation();

    informationService
        .setCharacteristic(Characteristic.Manufacturer, 'SJS Ltd.')
        .setCharacteristic(Characteristic.Model, 'PL3651-RGBW-LED-Controller')
        .setCharacteristic(Characteristic.SerialNumber, '365103651');

    let lightbulbService = new Service.Lightbulb(this.name);

    lightbulbService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getPowerState.bind(this))
        .on('set', this.setPowerState.bind(this));

    lightbulbService
        .addCharacteristic(new Characteristic.Hue())
        .on('get', this.getHue.bind(this))
        .on('set', this.setHue.bind(this));

    lightbulbService
        .addCharacteristic(new Characteristic.Saturation())
        .on('get', this.getSaturation.bind(this))
        .on('set', this.setSaturation.bind(this));

	lightbulbService
        .addCharacteristic(new Characteristic.Brightness())
        .on('get', this.getBrightness.bind(this))
        .on('set', this.setBrightness.bind(this));

    lightbulbService
        .addCharacteristic(new Characteristic.ColorTemperature())
        .on('get', this.getColorTemperature.bind(this))
        .on('set', this.setColorTemperature.bind(this))

    return [informationService, lightbulbService];

};

PL3651Accessory.prototype.setToCurrentColor = function(cb, skipConversation) {
    skipConversation = skipConversation || false
    if(!skipConversation){
        let rgb = hslToRgb(this.color.H, this.color.S, this.color.L)
        // rgb.r += (255 - rgb.r )*this.brightness
        // rgb.g += (255 - rgb.g )*this.brightness
        // rgb.b += (255 - rgb.b )*this.brightness
        console.log(rgb)
        this.pl.channel(this.channel, rgb)
    }
    this.pl.update().then(()=>{
        this.pl.update().then(()=>{
            cb()
        })
    })
};

PL3651Accessory.prototype.getPowerState = function(callback) {
    this.pl.info((info)=>{
        let power = !!(info[this.channel].r ||  info[this.channel].g ||  info[this.channel].b || info[this.channel].w )
        console.log("GET POWER : " + power)

        callback(null, power);
    })
};

PL3651Accessory.prototype.setPowerState = function(value, callback) {    
    if(value && !this.power){
        this.pl.powerOn(true).then(()=>{
            this.power = true
        })
    }
    if(!value && this.power){
        this.pl.powerOff(true).then(()=>{
            this.power = false
        })
    }
    callback()
};

PL3651Accessory.prototype.getHue = function(callback) {
	var color = this.color;
	this.pl.info((info)=>{
        let hsl = rgbToHsl(info[this.channel].r, info[this.channel].g, info[this.channel].b)
        callback(null, hsl.H);
    })
};
PL3651Accessory.prototype.setHue = function(value, callback) {
    this.color.H = value;
    this.log("HUE: %s", value);
    this.pl.channel(this.channel, {w: 0})
	this.setToCurrentColor(callback);
};

PL3651Accessory.prototype.getBrightness = function(callback) {
	this.pl.info((info)=>{
        let hsl = rgbToHsl(info[this.channel].r, info[this.channel].g, info[this.channel].b)
        callback(null, hsl.L);
    })
};
PL3651Accessory.prototype.setBrightness = function(value, callback) {
    this.brightness = value;
    this.color.L = this.brightness
    this.log("BRIGHTNESS: %s", value);
    this.pl.channel(this.channel, {w: 0})
    this.setToCurrentColor(callback);
};


PL3651Accessory.prototype.getSaturation = function(callback) {
    this.pl.info((info)=>{
        let hsl = rgbToHsl(info[this.channel].r, info[this.channel].g, info[this.channel].b)
        callback(null, hsl.S);
    })
	
};

PL3651Accessory.prototype.setSaturation = function(value, callback) {
    this.color.S = value;
    this.log("SATURATION: %s", value);
    this.pl.channel(this.channel, {w: 0})
	this.setToCurrentColor(callback);
};

PL3651Accessory.prototype.getColorTemperature = function(callback) {
    /*
    let x = Math.floor( (r+g+b)/3 )
    let tmpRgb = 274.0083*Math.pow(((292.4919-x)/(x+45.36263)), (2258 / 6997))
    print(Math.floor(tmpRgb))
     */
    var color = this.color;
    this.pl.info((info)=>{
        let hsl = rgbToHsl(info[this.channel].r, info[this.channel].g, info[this.channel].b)
        callback(null, info[this.channel].w);
    })
}

PL3651Accessory.prototype.setColorTemperature = function(value, callback) {
    console.log("setColorTemperature")
    console.log(value)
    let ww = 275.5382 + (-1 * 280.5503)/(1 + (value/284.4435)**4.456433)
    let rgb = (-1 * 45.36263) + (292.4919 + 45.36263)/(1 + (value/274.0083) ** 3.09876)
    if(rgb < 20){
        rgb = 0
    }
    if(ww < 20){
        ww = 0
    }
    this.pl.channel(this.channel, {w: ww, r: rgb, g: rgb, b: rgb})
    this.setToCurrentColor(callback, true);
}

function map (val, in_min, in_max, out_min, out_max) {
    return (val - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
}

function hslToRgb(h, s, l){
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return {r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255)}
}
function rgbToHsl(r, g, b) {
	var
	min = Math.min(r, g, b),
	max = Math.max(r, g, b),
	diff = max - min,
	h = 0, s = 0, l = (min + max) / 2;

	if (diff != 0) {
		s = l < 0.5 ? diff / (max + min) : diff / (2 - max - min);

		h = (r == max ? (g - b) / diff : g == max ? 2 + (b - r) / diff : 4 + (r - g) / diff) * 60;
	}

	return {H: h, S: s, L: l};
}
