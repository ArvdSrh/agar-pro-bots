class Packets { //Don't change anything
    'http://agar.pro'(){
        return {
            handshakeProtocol: new Buffer([254, 5, 0, 0, 0]),
            handshakeKey: new Buffer([255, 0, 0, 0, 0]),
            ping: new Buffer([31]),
            pingTime: 1500,
            spawn(name){
                const buf = new Buffer(1 + 2 * name.length);
                buf.writeUInt8(0, 0);
                for(let i = 0; i < name.length; i++) buf.writeUInt16LE(name.charCodeAt(i), 1 + 2 * i);
                return buf;
            },
            move(x, y){
                const buf = new Buffer(21);
                buf.writeUInt8(16, 0);
                buf.writeDoubleLE(x, 1);
                buf.writeDoubleLE(y, 9);
                buf.writeUInt32LE(0, 17);
                return buf;
            }
        };
    }
}

module.exports = Packets;