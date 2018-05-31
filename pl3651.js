

/*
RW: "USAGE: rgb_i2c r0 g0 b0 w0 r1 g1 b1 w1 dim0 dim1"

http://10.0.1.17/SetDualLedColor.php

http://10.0.1.17/SetDualLedColor.php?r0=0&g0=0&b0=0&w0=0&r1=1&g1=1&b1=1&w1=1&d0=0&d1=1&netsync=0
http://10.0.1.17/SetDualLedColor.php?r0=0&g0=0&b0=0&w0=0&r1=0&g1=0&b1=6&w1=0&d0=0&d1=1&netsync=0

*/
const http = require("http")


function PL3651(ip){
    let data = {
        channel: [],
        netsync: 0,
        ip: ip
    }

    this.channel = (channel, values) =>{
        for(let part in values){
            data.channel[channel][part] = values[part]
        }
    }

    this.netsync = (value) => {
        data.netsync = value
    }

    this.reset = () => {
        data.channel[0] = {
            r: 0,
            g: 0,
            b: 0,
            w: 0,
            d: 0
        }
        data.channel[1] = {
            r: 0,
            g: 0,
            b: 0,
            w: 0,
            d: 0
        }
    }

    const httpGet = (url) => {
        return new Promise((res, rej)=>{
            http.get(url, function(response) {
                var body = '';
                response.on('data', function(chunk) {
                    body += chunk;
                });
                response.on('end', function() {
                    res(body)
                });
            }).on('error', function(e) {
                rej(e)
            }); 
        })
    }

    this.info = (cb) => {
        let url = "http://"+data.ip+"/control_rgb.php"
        httpGet(url).then((body)=>{
            let info = {}
            for(let channel of [0,1]){
                info[channel] = {}
                for(let part of ["r","g","b","w"]){
                    let regx = new RegExp('<input.*?name="config_'+part+channel+'".+?value="(.+?)">')
                    //console.log(body.match(regx)[1])
                    info[channel][part] = body.match(regx)[1]
                }
            }
            cb(info)
        })
    }

    this.update = () => {
        let parts = []
        for(let id in data.channel){
            let channel = data.channel[id]
            for(let part of ["r","g","b","w"]){
                let value = channel[part]
                parts.push(part+id+"="+value)
            }
        }
        for(let id in data.channel){
            let channel = data.channel[id]
            let value = channel["d"]
            parts.push("d"+id+"="+value)
        }
        parts.push("netsync="+data.netsync)
        let url = "http://"+data.ip+"/SetDualLedColor.php?"+parts.join("&")
        return httpGet(url)
        
    }

    this.powerOn = (save) => {
        let kommando = !!save ? "1" : "2"
        let url = "http://"+data.ip+"/control_rgb.php?kommando="+kommando
        return httpGet(url)
    }
    this.powerOff = (save) => {
        let kommando = !!save ? "0" : "-1"
        let url = "http://"+data.ip+"/control_rgb.php?kommando="+kommando
        return httpGet(url)
    }
}

module.exports = PL3651
