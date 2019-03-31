var express = require('express')
var app = express()
var fs = require('fs')

// Connect to mysqli
var user =require('./user');

var mysql = require('mysql')
var connection =mysql.createConnection({
        host : user.host,
        user : user.user,
        password : user.password,
        database:user.database

})
connection.connect();
var os = require('os');
var interfaces = os.networkInterfaces();
var addresses = [];
for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
        }
    }
}
count=0;
app.get('/', function(req,res){

        //Send the current time and temperature to Client.
        if(req.query.temp && typeof req.query.temp!='undefined'){
                var moment = require('moment');
                require('moment-timezone');
                moment.tz.setDefault("Asia/Seoul");
                var date= moment().format('YYYY,MM,DD,HH,mm,ss');
                console.log(date);
                res.send(date+' Temp:'+req.query.temp);
                console.log(date+' Temp:'+req.query.temp);
                //Write to local TXT file.
                fs.appendFile('LOG.txt',req.query.temp+'\n', function(err){
                        if(err) throw err;
                });

                data={};
                data.seq=count++;
                data.type='T';          //Means 'Temperature'
                data.device='102';
                data.unit='0';
                data.ip=addresses;
                data.value=req.query.temp;
                data.time=date;
                //Insert data to DB by query
                connection.query('INSERT INTO sensors SET ?',data,function(err,rows,cols){
                        if(err) throw err;

                        console.log('Done Insert');
                });
        }
        else{
                res.send('Unauthorized Access');
        }
})
app.get('/dump',function(req,res){
        //Get Recent data from DB by query
        connection.query('SELECT * from sensors ORDER BY id DESC LIMIT 1440',function(err,rows,cols){
                if(err) throw err;
                var moment = require('moment');
                require('moment-timezone');
                moment.tz.setDefault("Asia/Seoul");
                var date= moment().format('YYYY-MM-DD HH:mm:ss');
                res.write('<p>Dump '+rows.length+' data at '+date+'</p>');
                //Send HTML table
                res.write('<table border="4">');
                res.write('<tr><th>Sequence.</th><th>Time</th><th>Temperature</th></tr>');
                for(var i=0;i<rows.length;i++){
                        var row=rows[i];
                        res.write('<tr>');
                        res.write('<td>'+i+'</td><td>'+row.time+'</td><td>'+row.value+'</td>');
                        res.write('</tr>');
                }
                res.end('</table></body></html>');
                console.log('Dump Complete');
        });
})
       app.listen(3000, function(){
        console.log('Temperature Measuring Program listening on port 3000!')
})
app.get('/graph', function (req, res) {
    console.log('got app.get(graph)');
    var html = fs.readFile('./graph.html', function (err, html) {
    html = " "+ html
    console.log('read file');

        var header="";

   //var qstr = 'SELECT * from sensors';
    var qstr = 'SELECT * from sensors ORDER BY time';
    connection.query(qstr, function(err, rows, cols) {
      if (err) throw err;

      var data = "";
      var comma = ""
      for (var i=0; i< rows.length; i++) {
        r = rows[i];
        if(i==0)
                html = html.replace("<%START%>", String(r.time));

        if(i==(rows.length-1))
                html = html.replace("<%END%>", String(r.time));

        var date=new String(r.time).split(',');
        date[1]=Number(date[1])-1;
        date[1]=String(date[1]);

        data+=comma+"[new Date("+String(date[0])+","+String(date[1])+","+String(date[2])+","+String(date[3])+","+String(date[4])+","+String(date[5])+"),"+r.value + "]";
              comma = ",";
      }
      header = "data.addColumn('date', 'Date/Time');"
      header += "data.addColumn('number', 'Temperature');"
      html = html.replace("<%COLUMN%>", header);
      html = html.replace("<%DATA%>", data);
     // html = html.replace("<%START%>", start);
      //html = html.replace("<%END%>", end);

      res.writeHeader(200, {"Content-Type": "text/html"});
      res.write(html);
      res.end();
    });
  });
})

