var bin = '5bf6dd0e8ae0925944e03a3d';
var secret_key = '$2a$10$mNtLmo.yrgNyKJL19TxJ/.HDWbJjJ0b1ue8IrV9SxXW6hchvL48Iy'; // not so secret yet

function get_bin() {
    $.ajax({
      url: 'https://api.jsonbin.io/b/' + bin + '/latest',
      type: 'GET',
      headers: {
        'secret-key': secret_key 
      },
      success: (data) => {
        this.data = data;
        if (this.data == "") {
            this.data = [];
        }
        update()
      },
      error: (err) => { console.log(err.responseJSON); }
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
      error: (err) => { console.log(err.responseJSON); }
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
    var c = document.getElementById("myCanvas");
    var ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);

    var margin = 50;
    var width = c.width - (margin * 2)
    var height = c.height - (margin * 2);

    // Draw axis lines 
    ctx.beginPath();
    ctx.moveTo(margin-10, margin+10)
    ctx.lineTo(margin, margin);
    ctx.moveTo(margin+10, margin+10)
    ctx.lineTo(margin, margin);
    ctx.lineTo(margin, height+margin);
    ctx.lineTo(width+margin, height+margin);
    ctx.lineTo(width+margin-10, height+margin-10)
    ctx.moveTo(width+margin-10, height+margin+10)
    ctx.lineTo(width+margin, height+margin);
    ctx.stroke();

    // TODO draw vertical tick marks
    // TODO draw horizontal tick marks

    // Calculate time scale
    var timescale = time_scale(data, width);
    var tempscale = temp_scale(data, height);
    var mintime = min_time(data);
    var mintemp = min_temp(data);

    for (var i = 0; i < data.length; i++) {
        var x = margin + Math.floor((data[i].time-mintime) * timescale);
        var y = margin + height - (Math.floor((data[i].temp-mintemp) * tempscale));
        ctx.fillRect(x-5, y-5, 10, 10);
    }

    [a, b] = calculate_regression();

    // draw the regression line
    // y = a + bx
    // x = (y - a)/b
    ctx.beginPath();
    ctx.moveTo(margin, margin + height - (Math.floor(a - mintemp)*tempscale));

    // The turkey is 165 in breast
    var x = Math.floor((165 - a) / b);
    ctx.lineTo(margin + Math.floor((x - mintime) * timescale), margin + height - Math.floor((165 - mintemp) * tempscale));
    ctx.stroke();
    // guess when the turkey will be done...

    var result = "The turkey will be done at: " + Math.floor(x/60) + ":" + x%60;
    $( "#result" ).html(result);
}

function calculate_regression() {
    var sigmaX = 0;
    var sigmaY = 0;
    var sigmaXY = 0;
    var sigmaY2 = 0;
    var sigmaX2 = 0;
    for (var i = 0; i < data.length; i++) {
        var x = data[i].time;
        var y = data[i].temp;

        sigmaY += y;
        sigmaX += x;
        sigmaXY += x * y;
        sigmaX2 += x * x;
        sigmaY2 += y * y;
    }
    var n = data.length;
    var a = ((sigmaY * sigmaX2) - (sigmaX * sigmaXY)) / ((n * sigmaX2) - (sigmaX * sigmaX));
    var b = ((n * sigmaXY) - (sigmaX * sigmaY)) / ((n * sigmaX2) - (sigmaX * sigmaX));
    return [a, b];
}

var data = [];

document.getElementById("add-point").addEventListener("click", add_point.bind(this));
document.getElementById("clear-data").addEventListener("click", add_point.bind(this));

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
