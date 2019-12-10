process.on('uncaughtException', function (err) {
    console.log(err);
})

const http = require('http')
    WebSocket = require('ws'),
    io = require('socket.io')(9090),
    socks = require('socks'),
    fs = require('fs'),
    Writer = require('./core/writer');

require('colors');
let bots = [];
let connectedUsers = 0;
let userID = 0;
let config = require('./config.json');
const sockx = fs.readFileSync('./proxies.txt', 'utf8').trim().split('\n'); //Proxy .txt file
const data = {
    origin: '',
    serverIP: '',
    mouseX: 0,
    mouseY: 0
};

http.get({'host': 'api.ipify.org', 'port': 80, 'path': '/'}, function(resp) {
    resp.on('data', function(ip) {
      console.log(("[System] Your server is running on: " + ip).green); //Server IP
    });
  });

io.on('connection', socket => { //Conection to script
    connectedUsers++;
    userID++;
    console.log((`[SERVER] Connected!`).green);
    socket.on('start', (origin, ip) => {
        data.origin = origin;
        data.serverIP = ip;
        if(data.origin === 'http://agar.pro'){
            let id = 0;
            setInterval(() => {
                if(id < sockx.length){
                    bots.push(new Bot(id));
                    id++;
                }
            }, 300);
        }
        else for(const id in sockx) bots.push(new Bot(id));
        console.log((`[SERVER] Bots started! Origin: ${data.origin}`).green);
    });
    socket.on('stop', () => {
        for(const i in bots) bots[i].ws.close();
        bots = [];
        console.log((`[SERVER] Bots stopped! Origin: ${data.origin}`).yellow);
    });
    socket.on('mouse', (x, y) => {
        data.mouseX = x;
        data.mouseY = y;
    });
    socket.on('split', () => {
        for(const i in bots) bots[i].send(new Buffer([17]));
    });
    socket.on('eject', () => {
        for(const i in bots) bots[i].send(new Buffer([21]));
    });
    socket.on('disconnect', () => {
        connectedUsers--;
        userID--;
        console.log((`[SERVER] Disconnected!`).red);
    });
}); //End

class Bot extends Writer { //The important parts
    constructor(id){
        super();
        this.id = id;
        this.name = config.botName[Math.floor(Math.random() * config.botName.length)]; //Bot name, add (+ this.id) if u want its ID
        this.ws = null;
        this.headers = {
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'ca-ES,ca;q=0.9,en;q=0.8,es;q=0.7,ig;q=0.6',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'
        };
        this.sock = sockx[this.id].split(':');
        this.agent = new socks.Agent({ //Proxy Handler
            proxy: {
                ipaddress: this.sock[0], //Don't mess with it if u dont know anything about it
                port: Number(this.sock[1]),
                type: 5
            }
        }); //end 
        this.minX = 0;
        this.minY = 0;
        this.maxX = 0;
        this.maxY = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.connectionAttempts = 0;
        this.connect();
    }
    connect(){
        this.ws = new WebSocket(data.serverIP, {
            origin: data.origin,
            headers: this.headers,
            agent: this.agent
        });
        this.ws.binaryType = 'nodebuffer';
        this.ws.onopen = this.onopen.bind(this);
        this.ws.onmessage = this.onmessage.bind(this);
        this.ws.onerror = this.onerror.bind(this);
        this.ws.onclose = this.onclose.bind(this);
    }
    send(buffer){
        if(this.ws.readyState === WebSocket.OPEN) this.ws.send(buffer);
    }
    onopen(){
        this.send(this[data.origin]().handshakeProtocol);
        this.send(this[data.origin]().handshakeKey);
        if(this[data.origin]().ping && this[data.origin]().pingTime){
            setInterval(function(){
                this.send(this[data.origin]().ping);
            }.bind(this), this[data.origin]().pingTime);
        }
        setInterval(function(){
            this.send(this[data.origin]().spawn(this.name));
        }.bind(this), 1000);
        setInterval(function(){
            this.send(this[data.origin]().move(data.mouseX + this.offsetX, data.mouseY + this.offsetY));
        }.bind(this), 100);
        //console.log(`[Bot#${this.id}] Connection opened`);
    }
    onmessage(message){
        const msg = new Buffer(message.data);
        if(data.origin === 'http://agar.pro'){ //Very Important dont touch
            if(msg.readUInt8(0) === 64 && msg.byteLength === 33){
                this.minX = msg.readDoubleLE(1);
                this.minY = msg.readDoubleLE(9);
                this.maxX = msg.readDoubleLE(17);
                this.maxY = msg.readDoubleLE(25);
                this.offsetX = (this.minX + this.maxX) / 2;
                this.offsetY = (this.minY + this.maxY) / 2;
            }
        } //end
    }
    onerror(err){
        this.connectionAttempts++;
        if(this.connectionAttempts === 3) this.ws.close();
        else this.connect();
        //console.log(`[Bot#${this.id}] Connection error: ${err}`);
        //console.log(err);
    }
    onclose(e){
        //console.log(`[Bot#${this.id}] Connection closed: ${e.reason ? e.reason : e.code ? e.code : e}`);
    }
} //end