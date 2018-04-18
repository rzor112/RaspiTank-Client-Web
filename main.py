from flask import Flask, render_template, request, redirect, Response, session
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room, rooms, disconnect
import json, threading, time, socket

async_mode = None
app = Flask(__name__)
socketio = SocketIO(app, async_mode=async_mode)
run_event = None
t1 = None
ping = 0

class TCP_Client():
    TCP_IP = '192.168.0.117'
    TCP_PORT = 5005
    BUFFER_SIZE = 1024
    connected = False

    def connect(self):
        self.s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.s.settimeout(1)
        self.s.connect((self.TCP_IP, self.TCP_PORT))
        self.send(0xff, 0x00)
        self.connected = True
        print 'CONNECT'

    def disconnect(self):
        try:
            self.s.close()
            self.connected = False
        except Exception as e:
            self.connected = False
            print e

    def send(self, command, value):
        msg = {'command': int(command), 'value': int(value)}
        self.s.send(json.dumps(msg))
        data = self.s.recv(self.BUFFER_SIZE)
        data = json.loads(data)
        if data['ResponseStatus'] and data['data']['command'] == command:
            return data['data']
        else:
            return None

def send_ping():
    while run_event.is_set():
        global ping, t1
        socketio.emit('ping', str({'ping': 1}), namespace='/web_communication')
        ping += 1
        if ping > 3:
            print '[!] Closing TCP/IP connection!'
            tcp_client.disconnect()
            run_event.clear()
        time.sleep(1)

@app.route("/")
def index():
	return render_template('index.html')

@socketio.on('init_connect', namespace='/web_communication')
def on_connect(message):
    global t1, run_event, ping
    try:
        tcp_client.connect()
        socketio.sendBuffer = [];
        ping = 0
        if t1:
            t1.join()
            t1 = None
            run_event = None 
        run_event = threading.Event()
        run_event.set()
        t1 = threading.Thread(target = send_ping)
        t1.start()
        socketio.emit('connect_ok', str({'tcp_port': tcp_client.TCP_PORT,
                                        'auto_mode': int(tcp_client.send(0xa3, 0x00)['value']),
                                        'velocity': tcp_client.send(0xa0, 0x00)['value'],
                                        'motor_left': tcp_client.send(0xa1, 0x00)['value'],
                                        'motor_right': tcp_client.send(0xa2, 0x00)['value']}),
                      namespace='/web_communication')
    except Exception as e:
        print e
        socketio.emit('error', str({'message': "Can't connect to TCP/IP server! Server is offline or connection refused!"}), namespace='/web_communication')
    
@socketio.on('control', namespace='/web_communication')
def on_control(message):
    try:
        tcp_client.send(int(message['command']), int(message['value']))
    except Exception as e:
        print e

@socketio.on('ping', namespace='/web_communication')
def on_ping(message):
    global ping
    ping = 0

@socketio.on('port_change', namespace='/web_communication')
def on_port_change (message):
    global t1, run_event
    try: 
        if t1:
            t1.join()
            t1 = None
            run_event = None 
        if tcp_client.connected:
            tcp_client.disconnect()
            
        tcp_client.TCP_PORT = int(message['tcp'])
        tcp_client.connect()

        run_event = threading.Event()
        run_event.set()
        t1 = threading.Thread(target = send_ping)
        t1.start()
        socketio.emit('connect_ok', str({'tcp_port': tcp_client.TCP_PORT,
                                        'auto_mode': int(tcp_client.send(0xa3, 0x00)['value']),
                                        'velocity': tcp_client.send(0xa0, 0x00)['value'],
                                        'motor_left': tcp_client.send(0xa1, 0x00)['value'],
                                        'motor_right': tcp_client.send(0xa2, 0x00)['value']}),
                      namespace='/web_communication')        
    except Exception as e:
        print e
        socketio.emit('error', str({'message': "Can't connect to TCP/IP server! Server is offline or connection refused!"}), namespace='/web_communication')

@socketio.on('mode_change', namespace='/web_communication')
def on_mode_change (message):
    tcp_client.send(message['command'],message['value'])
    socketio.emit('mode_update', str({'status': int(tcp_client.send(0xa3, 0x00)['value'])}), namespace='/web_communication')

@socketio.on('send_ping', namespace='/web_communication')
def on_send_ping (message):
    if tcp_client.connected:
        data = tcp_client.send(0xff, 0x00)
        if data:
            socketio.emit('receieve_ping', str({}), namespace='/web_communication')

tcp_client = TCP_Client()

if __name__ == "__main__":
    socketio.run(app, host='127.0.0.1', port=80)
