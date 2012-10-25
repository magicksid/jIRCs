/*
Copyright (c) 2012, Christopher Gamble
All rights reserved.
 
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
   * Redistributions of source code must retain the above copyright
     notice, this list of conditions and the following disclaimer.
   * Redistributions in binary form must reproduce the above copyright
     notice, this list of conditions and the following disclaimer in the
     documentation and/or other materials provided with the distribution.
   * Neither the name of the Christopher Gamble nor the names of its 
     contributors may be used to endorse or promote products derived 
     from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED 
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
OF THE POSSIBILITY OF SUCH DAMAGE.
*/


/* Public interface */
function jIRCs(conn) {
    this.buf = '';
    this.queue = [];
    this.displays = [];
    this.channels = {};
    this.chantypes = [];
    this.statuses = {};
    this.statusOrder = [];
    this.statusSymbols = {};
    this.chanModes = {};
    this.userModes = [];
    this.scrollbackSize = 500;
    this.nickname = '';
    this.registered = false;
    this.conn = conn;
    this.conn.parent = this;
    this.conn.onopen = function(e) { this.parent.onconnect(e); };
    this.conn.onmessage = function(e) { this.parent.onmessage(e); };
    this.conn.onclose = function(e) { this.parent.ondisconnect(e); };
};

jIRCs.prototype.version = 'jIRCs 0.1';

jIRCs.prototype.nick = function(nick,pass) {
    nick = nick.replace(/[^\w-]/,"");
    this.nickname = nick;
    this.send('CAP',['LS']);
    if(pass) {
        this.send('PASS',[pass]);
    }
    this.send('USER',[nick,nick,nick,':'+nick]);
    this.send('NICK',[nick]);
};

/* Shims */
if(!String.prototype.trim) {  
    String.prototype.trim = function() { return this.replace(/^\s+|\s+$/g,''); };  
}

if(!Function.prototype.bind) {
  Function.prototype.bind = function(oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }
 
    var aArgs = Array.prototype.slice.call(arguments, 1), 
        fToBind = this, 
        fNOP = function () {},
        fBound = function () { return fToBind.apply(this instanceof fNOP && oThis ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments))); };
 
    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();
 
    return fBound;
  };
}

/* Private interface */
jIRCs.prototype.onconnect = function(evt) {
    console.log("Connected");
    this.renderStatus('Connected to server.');
    this.forEach(this.queue, this.send, this);
    this.queue = [];
};

jIRCs.prototype.ondisconnect = function(evt) {
    // Remove channel windows
    this.forEach(this.channels, function(c, channel) {
        if(channel != 'Status') {
            this.destroyChan(channel);
        }
    }, this);
    console.log("Disconnected");
    this.renderStatus('Disconnected from server.');
};

jIRCs.prototype.onmessage = function(evt) {
    this.buf += evt.data;
    var lines = this.buf.split("\n");
    this.buf = lines.pop();
    this.forEach(lines, this.parseMessage, this);
};

jIRCs.prototype.send = function(command, args) {
    var msg = command;
    if(typeof args == 'object') {
        msg += ' ' + args.join(' ');
    }
    if(this.conn.readyState == 1) { //OPEN
        console.log('>>> ' + msg);
        this.conn.send(msg + '\r\n');
    } else {
        console.log('||| ' + msg);
        this.queue.push(msg);
    }
};

jIRCs.prototype.say = function(message, location) {
    if(!location) {
        location = this.nickname;
    }
    this.send('PRIVMSG', [location, ':' + message]);
    this.irc_PRIVMSG(this.nickname, [location, message]);
};
