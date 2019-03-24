var express = require('express')
var app = express()
var fs = require('fs')

// Connect to mysql
var mysql = require('mysql')
var connection = mysql.createConnection({
        host : 'localhost',
        user : 'me',
        password : 'password',
        database : 'mydb'
});

connection.connect();


var dateTime = require('node-datetime');


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

                var dt = dateTime.create();
                var formatted = dt.format('Y-m-d H:M:S');
                res.send(formatted+' Temp:'+req.query.temp);
                console.log(formatted+' Temp:'+req.query.temp);

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

                var dt = dateTime.create();
                var formatted = dt.format('Y-m-d H:M:S');
                res.write('<p>Dump '+rows.length+' data at '+formatted+'</p>');

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
app.get('/graph',function(req,res){
        console.log('Got app.get(graph)');
        var html = fs.readFile('./graph.html',function(err,html){
                html=" "+html

                console.log('read file');

                var qstr = 'SELECT * from sensors WHERE time >= DATE_SUB(NOW(), INTERVAL 1 DAY) ORDER BY time';
                connection.query(qstr, function(err, rows, cols){
                        if(err) throw err;

                        var data="";
                        var comma = "";
                        for (var i=0; i<rows.length;i++){
                                        r = rows[i];
                                        var date=new Date(r.time).toLocaleString().split(' ');
                                        var ymd=date[0].split('/');
                                        var hms=date[1].split(':');
                                        if(date[2]=='PM'){
                                                hms[0]=Number(hms[0])+12;
                                        }

                                        data+=comma+"[new Date("+ymd[2]+ymd[0]+","+ymd[1]+","+String(hms[0])+","+hms[1]+","+hms[2]+"),"+r.value + "]";
                                        comma=",";
                        }
                        var header = "data.addColumn('date','Date/Time');"
                        header+="data.addColumn('number','Temperature');";
                        html=html.replace("<%COLUMN%>",header);
                        html=html.replace("<%DATA%>",data);

                        res.writeHeader(200,{"Content-Type": "text/html"});
                        res.write(html);
                        res.end();
                });
        });
        })
        app.listen(3000, function(){
        console.log('Temperature Measuring Program listening on port 3000!')
})


               
