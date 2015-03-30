
////////////////////////////////////////////////////////////////////////////

var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , ioc = require('socket.io-client');

// io.set('log', 1);


// app.configure(function(){
	app.set('port', 8888);
  app.set('views', __dirname + '/arkview');
  app.engine('html', require('ejs').renderFile);
	//app.set('view engine', 'jade');
	app.locals.pretty = false;
	// app.use(express.bodyParser());
	// app.use(express.cookieParser());
	// app.use(express.methodOverride());
	app.use(require('stylus').middleware({ src: __dirname + '/public'}));
	app.use(express.static(__dirname +'/public'));
// });

// app.configure('development', function(){
	// app.use(express.errorHandler());
// });

require('./router')(app);

server.listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});



var controllerStateObject = { "relay1": false, "relay2" : false, "relay3" : false, "relay4" : false };
var stateStr =JSON.stringify(controllerStateObject);
// fs.writeFileSync("./controllerState.txt",stateStr);

console.log(stateStr);

// relays.initialize();


//Variable not defined locally; global scope
var g_cronClient = null;

var connections = [];


io.sockets.on('connection', function (socket) {
  connections.push(socket);

  console.log("CONNECTED");


  socket.on('disconnect', function(socket){
    var i = connections.indexOf(socket);
	   console.log("DISCONNECT: " + i);
    delete connections[i];
  });


  var sensors_map = { "liquidTemp" : "none", "humidityi2c" : "none", "ph" : "none" };

  socket.on('command', function (data) {
  	console.log(data);

    if(data.module === "lights" && data.values) {
      console.log("light command receive: "+data.values.red+" "+data.values.green+" "+data.values.blue+"\n");
      if (data.relayID === 'Mosfet1') {
        blastCommand(data);
      	// arduino.analogWrite(10, data.values.red);
      	// arduino.analogWrite(9, data.values.green);
		    // arduino.analogWrite(11, data.values.blue);
	  }
      	        //serialPort.write("L"+data.values.red+" "+data.values.green+" "+data.values.blue+"\n");
      //if (data.relayID=== 'Mosfet2') arduino.analogWrite(9, data.values.green);
      //if (data.relayID === 'Mosfet3') arduino.analogWrite(11, data.values.blue);

    } else if ( data.module === "doseCycle" ) {
        if (data.state == true) {
          blastCommand(data);
          // arduino.digitalWrite(3, true); // pump on
          // arduino.digitalWrite(4, false);
        }
        else {
          blastCommand(data);
          // arduino.digitalWrite(3, false); // pump off
          // arduino.digitalWrite(4, false);
        }

    } else if (data.module == "doseDirection") {
      if (data.state == true) {
        blastCommand(data);
        // arduino.digitalWrite(4, false); //forward
      }
      else {
        blastCommand(data);
        // arduino.digitalWrite(4, true); //backward
      }

    } else if ( data.module === "thermocycle-off" ) {
        //serialPort.write("t\n");
        thermocycleState = false;
        //resetThermocycle();

    } else if ( data.module === "thermocycle" ) {
        //serialPort.write("T"+data.values.lower_bound_temp+" "+data.values.upper_bound_temp+"\n");
        thermocycleState = true;
        gTemp.min = data.values.lower_bound_temp;
        gTemp.max = data.values.upper_bound_temp;
        //resetThermocycle();

    } else if ( data.module === "readStateControl" ) {

      var currentStateStr = fs.readFileSync("./controllerState.txt");
      controllerStateObject = JSON.parse(currentStateStr);


    } else if ( data.module === "toggleControl" ) {
      var relayID = data.relayID;

      controllerStateObject[relayID] = data.state;
      //relays.write_value(relayID,data.state);


    } else if ( data.module === "arkSchedule" ) {

      var interval = data.interval;

      try {
              //Taking data from arkSchedule and writing to cron.js
              g_cronClient = net.connect({port: 1337},
                    function() { //'connect' listener
                       console.log('client connected');
                      try {
                          var panelObjMessage = JSON.stringify(data);
                          console.log('PanelObj:' + panelObjMessage);
                          g_cronClient.write(panelObjMessage + '\r\n');
                      } catch ( e ) {
                        console.log(e.message);
                      }
                    });

              //Acknowledge completion and closing connection
              g_cronClient.on('data', function(data) {
                 console.log(data.toString());
                  g_cronClient.end();
              });

              g_cronClient.on('end', function() {
                  console.log('client disconnected');
              });

      } catch ( e ) {
        console.log(e.message);
      }

  } else if ( data.module === "stopSchedule" ){
    relays.initialize();

  }


});

});

function blastCommand(data){
  if (connections.length) connections.forEach(function(element){
    element.emit('command', data);
  });
}

function blastSensa(data){
  if (connections.length) connections.forEach(function(element){
    element.emit('command', data);
  });
}
