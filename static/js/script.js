var camera_port = 8081;
var actual_mode = 0;
var ping_block = false;
var key_lock = false;
var connect_status = false;

function change_mode_button(value) {
    actual_mode = value;
    if (value){
        $("#mode_button").html("Change mode to manual");
    }
    else {
        $("#mode_button").html("Change mode to automatic");
    }
}

$(document).ready(function () {
    namespace = '/web_communication';
    window.socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + namespace);

    window.socket.on('connect_ok', function (msg) {
        window.parsedJSON = eval('(' + msg + ')');
        $("#tcp_port_input").val(window.parsedJSON['tcp_port']);
        $("#camera_port_input").val(camera_port);
        $("#velocity_slider").val(window.parsedJSON['velocity']);
        $("#left_slider").val(window.parsedJSON['motor_left']);
        $("#right_slider").val(window.parsedJSON['motor_right']);
        change_mode_button(window.parsedJSON['auto_mode'])
        $("#camera_image").prop('src', ('http://' + "192.168.0.117" + ":" + $("#camera_port_input").val().toString()));
        $("#error_alert").alert('close')
        connect_status = true;
    });

    window.socket.on('error', function (msg) {
        var JSON = eval('(' + msg + ')');
        $("#error_alert").html(JSON['message'])
        $("#error_alert").show()
    });

    window.socket.on('ping', function (msg) {
        window.socket.emit('ping', { data: 0 });
    });

    window.socket.on('mode_update', function (msg) {
        var JSON = eval('(' + msg + ')');
        change_mode_button(JSON['status'])
    });

    window.socket.on('receieve_ping', function (msg) {
        var d = new Date();
        var actual_time = d.getTime();
        var ping = actual_time - window.ping_time;
        $("#ping_label").html('Ping: ' + ping.toString() + 'ms');
        window.ping_block = false;
    });

    $("#button_forward").mousedown(function () {
        if (connect_status)
        window.socket.emit('control', { command: 1, value: 0 });
    });

    $("#button_forward").mouseup(function () {
        if (connect_status)
        window.socket.emit('control', { command: 0, value: 0 });
    });

    $("#button_left").mousedown(function () {
        if (connect_status)
         window.socket.emit('control', { command: 3, value: 0 });
    });

    $("#button_left").mouseup(function () {
        if (connect_status)
        window.socket.emit('control', { command: 0, value: 0 });
    });

    $("#button_right").mousedown(function () {
        if (connect_status)
         window.socket.emit('control', { command: 4, value: 0 });
    });

    $("#button_right").mouseup(function () {
        if (connect_status)
        window.socket.emit('control', { command: 0, value: 0 });
    });

    $("#button_back").mousedown(function () {
        if (connect_status)
         window.socket.emit('control', { command: 2, value: 0 });
    });

    $("#button_back").mouseup(function () {
        if (connect_status)
        window.socket.emit('control', { command: 0, value: 0 });
    });

    $("#velocity_slider").on("change", function () {
        if (connect_status)
        window.socket.emit('control', { command: 5, value: this.value });
    });

    $("#left_slider").on("change", function () {
        if (connect_status)
        window.socket.emit('control', { command: 6, value: this.value });
    });

    $("#right_slider").on("change", function () {
        if (connect_status)
        window.socket.emit('control', { command: 7, value: this.value });
    });

    $("#reconnect_button").on("click", function () {
        var tcp_port = $("#tcp_port_input").val();
        var camera_port = $("#camera_port_input").val();
        window.socket.emit('port_change', { tcp: tcp_port, camera: camera_port });
        window.socket.emit('init_connect', { command: 0, value: 0 });
    });

    $("#mode_button").on("click", function () {
        if (connect_status) {
            if (actual_mode) {
                window.socket.emit('mode_change', { command: 9, value: 0 });
            }
            else {
                window.socket.emit('mode_change', { command: 8, value: 0 });
            }
        }
    });

    window.socket.emit('init_connect', { command: 0, value: 0 });

    window.setInterval(function () {
        if (ping_block == 0 && connect_status) {
            var d = new Date();
            window.ping_time = d.getTime();
            window.socket.emit('send_ping', {});
            ping_block = true;
        }
    }, 1000);
});

$(document).keydown(function (e) {
    var key = e.key;
    if (key_lock == false && connect_status) {
        if (key == 'w' || key == 'W' || key == 'ArrowUp') {
            window.socket.emit('control', { command: 1, value: 0 })
        }
        else if (key == 's' || key == 'S' ||  key == 'ArrowDown') {
            window.socket.emit('control', { command: 2, value: 0 });
        }
        else if (key == 'a' || key == 'A' || key == 'ArrowLeft') {
            window.socket.emit('control', { command: 3, value: 0 });
        }
        else if (key == 'd' || key == 'D' ||  key == 'ArrowRight') {
            window.socket.emit('control', { command: 4, value: 0 });
        }
        key_lock = true
    }
});

$(document).keyup(function (e) {
    var key = e.key;
    if (connect_status) {
        if (key == 'w' || key == 'W' || key == 'ArrowUp') {
            window.socket.emit('control', { command: 0, value: 0 });
            key_lock = false;
        }
        else if (key == 's' || key == 'S' || key == 'ArrowDown') {
            window.socket.emit('control', { command: 0, value: 0 });
            key_lock = false;
        }
        else if (key == 'a' || key == 'A' || key == 'ArrowLeft') {
            window.socket.emit('control', { command: 0, value: 0 });
            key_lock = false;
        }
        else if (key == 'd' || key == 'D' || key == 'ArrowRight') {
            window.socket.emit('control', { command: 0, value: 0 });
            key_lock = false;
        }
    }
});