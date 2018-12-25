var bin = '5bf6dd0e8ae0925944e03a3d';
var secret_key = '$2a$10$mNtLmo.yrgNyKJL19TxJ/.HDWbJjJ0b1ue8IrV9SxXW6hchvL48Iy'; // not so secret yet
var data = [];
var margin = {
    top: 20,
    right: 20,
    bottom: 30,
    left: 40
},
width = 600 - margin.left - margin.right,
height = 400 - margin.top - margin.bottom;

function get_bin() {
    $.ajax({
      url: 'https://api.jsonbin.io/b/' + bin + '/latest',
      type: 'GET',
      headers: {
        'secret-key': secret_key 
      },
      success: (response) => {
        this.data = response;
        if (this.data == undefined || this.data == "") {
            this.data = [];
        }
        update()
      },
      error: (err) => { console.log('error', err.responseJSON); }
    });
}

function update_bin(binData) {
    $.ajax({
        url: 'https://api.jsonbin.io/b/' + bin,
        type: 'PUT',
        headers: { 
            'secret-key': secret_key 
        },
        contentType: 'application/json',
        data: JSON.stringify(binData),
        success: (data) => { console.log(data); },
        error: (err) => { console.log('error', err.responseJSON); }
    });
}

function add_point(event) {
    var temp = parseInt(document.getElementById('temperature').value);
    [hour, minute] = document.getElementById('time').value.split(':');
    var time = parseInt(hour)*60 + parseInt(minute)
    this.data.push({time: time , temp: temp});
    update_bin(data);
    update();
}

function clear(event) {
    var data = {};
    data.initial = "false";
    data.data = []
    update_bin(data)
}

function min_temp(data) {
   var min = data[0].temp;
   for (var i = 1; i < data.length; i++) {
      if (data[i].temp < min) { min = data[i].temp; }
   }
   return min;
}

function max_temp(data) {
    return 165;
}

function min_time(data) {
    var min = data[0].time;
    for (var i = 1; i < data.length; i++) {
       if (data[i].time < min) { min = data[i].time; }
    }
    return min;
}

function max_time(data) {
    var max = data[0].time;
    for (var i = 1; i < data.length; i++) {
       if (data[i].time > max) { max = data[i].time; }
    }
    return max;
}

function temp_scale(data, width) {
    var max = max_temp(data);
    var min = min_temp(data);
    var temp_scale = width / (max - min);
    return temp_scale;
}

function time_scale(data, width) {
    var max = max_time(data);
    var min = min_time(data);
    var time_scale = width / (max - min);
    return time_scale;
}

function update() {
    if (this.data.length == 0) {
        return;
    }

    var x = d3.scale.linear()
    .range([0, width]);

    var y = d3.scale.linear()
    .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var data = format_data(this.data);

    data.forEach(function(d) {
        d.x = +d.x;
        d.y = +d.y;
        d.yhat = +d.yhat;
    });

    var line = d3.svg.line()
        .x(function(d) {
            return x(d.x);
        })
        .y(function(d) {
            return y(d.yhat);
        });

    x.domain(d3.extent(data, function(d) {
        return d.x;
    }));

    y.domain(d3.extent(data, function(d) {
        return d.y;
    }));

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Time (hour*60 + minutes)");

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Temperature (F)")

    svg.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 3.5)
        .attr("cx", function(d) {
            return x(d.x);
        })
        .attr("cy", function(d) {
            return y(d.y);
        });

    svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);
}
this.update = update.bind(this);

$(function(){
  $('input[type="time"][value="now"]').each(function(){    
    var d = new Date(),        
        h = d.getHours(),
        m = d.getMinutes();
    if(h < 10) h = '0' + h; 
    if(m < 10) m = '0' + m; 
    $(this).attr({
      'value': h + ':' + m
    });
  });
});

get_bin();

function format_data(binData) {
    var x = [];
    var y = [];
    var x_mean = 0;
    var y_mean = 0;
    n = binData.length;
    var term1 = 0;
    var term2 = 0;

    for (var i = 0; i < n; i++) {
        point = binData[i]
        y.push(point.temp)
        x.push(point.time)
        x_mean += x[i]
        y_mean += y[i]
    }
    // calculate mean x and y
    x_mean /= n;
    y_mean /= n;

    // calculate coefficients
    var xr = 0;
    var yr = 0;
    for (i = 0; i < x.length; i++) {
        xr = x[i] - x_mean;
        yr = y[i] - y_mean;
        term1 += xr * yr;
        term2 += xr * xr;

    }
    var b1 = term1 / term2;
    var b0 = y_mean - (b1 * x_mean);

    yhat = [];
    // fit line using coeffs
    for (i = 0; i < x.length; i++) {
        yhat.push(b0 + (x[i] * b1));
    }

    var data = [];
    for (i = 0; i < y.length; i++) {
        data.push({
            "yhat": yhat[i],
            "y": y[i],
            "x": x[i]
        })
    }

    // Guess when the turkey will be done
    // y = mx + b, x = (y-b)/m
    time_done =  Math.floor((165 - b0) / b1);
    console.log(time_done);
    var result = "The turkey will be done at: " + Math.floor(time_done/60) + ":" + time_done%60;
    $( "#result" ).html(result);
    return (data);
}

document.getElementById("add-point").addEventListener("click", add_point.bind(this));
document.getElementById("clear-data").addEventListener("click", clear.bind(this));

// much lifted from https://bl.ocks.org/ctufts/298bfe4b11989960eeeecc9394e9f118
// which was licensed under GNU General Public License, version 3.